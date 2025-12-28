import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { db } from './db/database.js';
import { kickApi } from './api/kick.js';
import { getAuthorizationUrl, exchangeCodeForTokens } from './auth/oauth.js';
import { processCommand } from './game/engine.js';
import { processCustomCommand, processSuggestion } from './commands/customCommands.js';
import { getAllMonsters } from './data/monsters.js';
import { getAllItems, rarityColors } from './data/items.js';
import { getAllQuests } from './data/quests.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Super Admin username (only this user can manage all channels)
const SUPER_ADMIN = (process.env.SUPER_ADMIN || 'doxish').toLowerCase();

// Simple in-memory session store (for production, use Redis or DB)
const sessions = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use((req, res, next) => {
    const sessionId = req.headers['x-session-id'] || req.query.session;
    if (sessionId && sessions.has(sessionId)) {
        req.session = sessions.get(sessionId);
    } else {
        req.session = null;
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy for Railway
app.set('trust proxy', 1);

// ========== NEW AUTH ROUTES ==========

// Serve login page
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Kullanıcı adı ve şifre gerekli!' });
        }

        const channel = await db.getChannelByUsername(username.toLowerCase());
        if (!channel) {
            return res.status(401).json({ success: false, error: 'Kanal bulunamadı!' });
        }

        // Check password
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

        // If no password set, super admin can set it
        if (!channel.password_hash) {
            // First login - set password for this channel
            await db.setChannelPassword(channel.channel_id, passwordHash);
            console.log(`[Auth] Password set for channel: ${username}`);
        } else if (channel.password_hash !== passwordHash) {
            return res.status(401).json({ success: false, error: 'Yanlış şifre!' });
        }

        // Create session
        const sessionId = crypto.randomBytes(32).toString('hex');
        sessions.set(sessionId, {
            username: channel.owner_username.toLowerCase(),
            channelId: String(channel.channel_id),
            isSuperAdmin: channel.owner_username.toLowerCase() === SUPER_ADMIN
        });

        console.log(`[Auth] Login successful: ${username}, session: ${sessionId.substring(0, 8)}...`);
        res.json({ success: true, sessionId, username: channel.owner_username.toLowerCase() });
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ success: false, error: 'Giriş hatası!' });
    }
});

// Logout API
app.post('/api/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) sessions.delete(sessionId);
    res.json({ success: true });
});

// Session check API
app.get('/api/session', (req, res) => {
    if (req.session) {
        res.json({
            loggedIn: true,
            username: req.session.username,
            channelId: req.session.channelId,
            isSuperAdmin: req.session.isSuperAdmin
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Super admin view route (must be before catch-all)
app.get('/adminview/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Root redirects to login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// ========== KICK OAUTH ROUTES ==========
app.get('/kick-login', (req, res) => res.redirect(getAuthorizationUrl()));

app.get('/auth/kick/callback', async (req, res) => {
    try {
        const { code, error, state } = req.query;
        if (error) return res.send(`<html><body><h1>Hata</h1><p>${error}</p><a href="/">Geri</a></body></html>`);
        if (!code) return res.send('<html><body><h1>Hata</h1><p>Kod yok</p><a href="/">Geri</a></body></html>');
        if (!state) return res.send('<html><body><h1>Hata</h1><p>State yok - tekrar deneyin</p><a href="/">Geri</a></body></html>');

        const tokens = await exchangeCodeForTokens(code, state);
        console.log('Tokens received:', { access_token: tokens.access_token?.substring(0, 20) + '...', expires_in: tokens.expires_in });

        let userInfo = null;
        try {
            userInfo = await kickApi.getCurrentUserWithToken(tokens.access_token);
            console.log('User info response:', JSON.stringify(userInfo, null, 2));
        } catch (e) {
            console.error('User info error:', e.message);
            return res.send(`<html><body><h1>Hata</h1><p>Kullanıcı bilgisi alınamadı: ${e.message}</p><a href="/">Geri</a></body></html>`);
        }

        // Handle different API response formats
        let user = null;
        if (userInfo?.data?.[0]) {
            user = userInfo.data[0];
        } else if (userInfo?.data) {
            user = userInfo.data;
        } else if (userInfo?.user) {
            user = userInfo.user;
        } else if (userInfo?.id || userInfo?.user_id) {
            user = userInfo;
        }

        // Extract user ID and username
        const userId = user?.user_id || user?.id || user?.channel_id;
        const username = user?.username || user?.name || user?.slug || 'Unknown';

        if (!userId) {
            console.error('No user ID found in response:', userInfo);
            return res.send(`<html><body><h1>Hata</h1><p>Kullanıcı ID bulunamadı</p><pre>${JSON.stringify(userInfo, null, 2)}</pre><a href="/">Geri</a></body></html>`);
        }

        console.log(`Creating channel: userId=${userId}, username=${username}`);
        await db.createChannel(userId, username, tokens.access_token, tokens.refresh_token, tokens.expires_in || 3600);

        // Subscribe to webhook events
        try {
            await kickApi.subscribeToEvents(userId, tokens.access_token);
            console.log('[OAuth] Event subscription completed');
        } catch (e) { console.log('Event subscription error:', e.message); }

        try {
            await kickApi.sendMessageToChannel(userId, tokens.access_token, '🎮 DoxiRPG Bot aktif! !yardim yazarak komutları öğren.');
        } catch (e) { console.log('Welcome message error:', e.message); }

        res.redirect(`/?success=1&channel=${userId}&username=${username}`);
    } catch (error) {
        console.error('OAuth error:', error);
        res.send(`<html><body><h1>Hata</h1><p>${error.message}</p><a href="/">Geri</a></body></html>`);
    }
});

// ========== WEBHOOK ==========
app.post('/webhook', async (req, res) => {
    try {
        const eventType = req.headers['kick-event-type'];
        console.log(`[Webhook] Event: ${eventType}`);
        console.log(`[Webhook] Headers:`, JSON.stringify(req.headers, null, 2));
        console.log(`[Webhook] Body:`, JSON.stringify(req.body, null, 2));

        if (eventType === 'chat.message.sent') {
            const channelId = req.body.broadcaster?.user_id;
            console.log(`[Chat] Channel ID: ${channelId}`);

            if (!channelId) {
                console.log('[Chat] No channel ID found');
                return res.status(200).json({ received: true });
            }

            const channel = await db.getChannel(channelId);
            console.log(`[Chat] Channel found: ${channel ? 'yes' : 'no'}, enabled: ${channel?.bot_enabled}`);

            if (!channel || !channel.bot_enabled) {
                console.log('[Chat] Channel not found or bot disabled');
                return res.status(200).json({ received: true });
            }

            const message = {
                message_id: req.body.message_id,
                content: req.body.content,
                sender: req.body.sender,
                broadcaster: req.body.broadcaster,
                created_at: req.body.created_at
            };

            console.log(`[Chat] ${channel.owner_username} | ${message.sender?.username}: ${message.content}`);

            // Check if message is a command (!xxx)
            if (message.content?.startsWith('!')) {
                const cmdParts = message.content.slice(1).split(' ');
                const cmdName = cmdParts[0].toLowerCase();

                // 0. Check !öneri command first (always available)
                if (cmdName === 'öneri' || cmdName === 'oneri') {
                    const suggestionResult = await processSuggestion(channelId, message);
                    if (suggestionResult) {
                        console.log(`[Bot] Suggestion response: ${suggestionResult.response}`);
                        const replyTo = suggestionResult.reply_to_user ? message.message_id : null;
                        await kickApi.sendMessageToChannel(channelId, channel.access_token, suggestionResult.response, replyTo);
                        return res.status(200).json({ received: true });
                    }
                }

                // 1. Check custom commands first
                const customResult = await processCustomCommand(channelId, cmdName, message);
                if (customResult) {
                    console.log(`[Bot] Custom command response: ${customResult.response.substring(0, 50)}...`);
                    const replyTo = customResult.reply_to_user ? message.message_id : null;
                    await kickApi.sendMessageToChannel(channelId, channel.access_token, customResult.response, replyTo);
                    console.log('[Bot] Custom command sent');
                    return res.status(200).json({ received: true });
                }

                // 2. Check if game is enabled for game commands
                const gameEnabled = await db.getGameEnabled(channelId);
                console.log(`[Bot] Game check for channel ${channelId}. Status: ${gameEnabled ? 'ENABLED' : 'DISABLED'}`);

                if (gameEnabled) {
                    const response = await processCommand(channelId, message);
                    if (response) {
                        console.log(`[Bot] Game response: ${response.substring(0, 50)}...`);
                        try {
                            // Pass db and refresh_token for auto-refresh on 401
                            await kickApi.sendMessageToChannel(channelId, channel.access_token, response, message.message_id, db, channel.refresh_token);
                            console.log('[Bot] Game response sent successfully');
                        } catch (sendError) {
                            console.error('[Bot] FAILED to send game response:', sendError.message);
                            // Try without reply if failed
                            try {
                                await kickApi.sendMessageToChannel(channelId, channel.access_token, response, null, db, channel.refresh_token);
                                console.log('[Bot] Game response sent (without reply)');
                            } catch (e2) {
                                console.error('[Bot] FAILED to send even without reply:', e2.message);
                            }
                        }
                    }
                } else {
                    console.log('[Bot] Game is disabled for this channel');
                }
            }
        }
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Webhook Error]', error);
        res.status(200).json({ received: true, error: error.message });
    }
});

// Webhook test endpoint
app.get('/webhook', (req, res) => {
    res.json({ status: 'Webhook endpoint active', timestamp: Date.now() });
});

// ========== API ROUTES ==========
app.get('/api/status', async (req, res) => {
    try {
        const globalStats = await db.getGlobalStats();
        const channels = await db.getAllChannels();
        res.json({
            totalChannels: globalStats.totalChannels,
            totalPlayers: globalStats.totalPlayers,
            channels: channels.map(c => ({ id: c.channel_id, username: c.owner_username, enabled: c.bot_enabled }))
        });
    } catch (e) { res.json({ totalChannels: 0, totalPlayers: 0, channels: [] }); }
});

app.get('/api/channel/:id/status', async (req, res) => {
    try {
        const channelId = req.params.id;
        const channel = await db.getChannel(channelId);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        const stats = await db.getStats(channelId);
        res.json({ channel, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/channel/:id/leaderboard', async (req, res) => {
    try {
        res.json(await db.getLeaderboard(req.params.id, 10));
    } catch (e) { res.json([]); }
});

app.get('/api/channel/:id/chat-log', async (req, res) => {
    try {
        res.json(await db.getRecentChats(req.params.id, 50));
    } catch (e) { res.json([]); }
});

// ========== ADMIN API ==========
app.get('/api/admin/channels', async (req, res) => {
    try { res.json(await db.getAllChannels()); }
    catch (e) { res.json([]); }
});

app.delete('/api/admin/channel/:id', async (req, res) => {
    try {
        await db.deleteChannel(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:id/toggle', async (req, res) => {
    try {
        await db.toggleChannel(req.params.id, req.body.enabled);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/channel/:id/commands', async (req, res) => {
    try { res.json(await db.getChannelCommands(req.params.id)); }
    catch (e) { res.json([]); }
});

app.put('/api/admin/channel/:id/command/:cmd', async (req, res) => {
    try {
        const channelId = req.params.id;
        const { enabled, response, description } = req.body;
        const existing = await db.getChannelCommand(channelId, req.params.cmd);

        await db.setChannelCommand(
            channelId,
            req.params.cmd,
            enabled !== undefined ? enabled : (existing?.enabled ?? 1),
            response !== undefined ? response : (existing?.response ?? ''),
            description !== undefined ? description : (existing?.description ?? '')
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:id/command/:cmd/toggle', async (req, res) => {
    try {
        await db.toggleChannelCommand(parseInt(req.params.id), req.params.cmd, req.body.enabled);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/channel/:id/players', async (req, res) => {
    try { res.json(await db.getAllCharacters(parseInt(req.params.id), 100)); }
    catch (e) { res.json([]); }
});

app.put('/api/admin/channel/:id/player/:userId', async (req, res) => {
    try {
        await db.updateCharacter(parseInt(req.params.id), parseInt(req.params.userId), req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/channel/:id/player/:userId', async (req, res) => {
    try {
        await db.deleteCharacter(parseInt(req.params.id), parseInt(req.params.userId));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:id/player/:userId/give-item', async (req, res) => {
    try {
        await db.addItem(parseInt(req.params.id), parseInt(req.params.userId), req.body.itemId, req.body.quantity || 1);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:id/player/:userId/give-gems', async (req, res) => {
    try {
        const channelId = parseInt(req.params.id);
        const userId = parseInt(req.params.userId);
        const char = await db.getCharacter(channelId, userId);
        if (!char) return res.status(404).json({ error: 'Not found' });
        await db.updateCharacter(channelId, userId, { doxigem: (char.doxigem || 0) + (req.body.amount || 0) });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/monsters', (req, res) => {
    res.json({ builtIn: getAllMonsters(), rarityColors });
});

app.get('/api/admin/items', (req, res) => {
    res.json({ builtIn: getAllItems(), rarityColors });
});

app.get('/api/admin/quests', (req, res) => {
    res.json({ builtIn: getAllQuests() });
});

app.post('/api/admin/channel/:id/monster/:monsterId/drops', async (req, res) => {
    try {
        await db.saveMonsterDropOverride(req.params.id, req.params.monsterId, req.body.drops);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:id/send-message', async (req, res) => {
    try {
        const channelId = req.params.id;
        const channel = await db.getChannel(channelId);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        await kickApi.sendMessageToChannel(channelId, channel.access_token, req.body.message);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/test-command', async (req, res) => {
    try {
        const { channelId, content, username, userId } = req.body;
        const message = { content, sender: { user_id: userId || 12345, username: username || 'TestUser' } };
        const response = await processCommand(channelId || 0, message);
        res.json({ response });
    } catch (e) { res.json({ response: `❌ Hata: ${e.message}` }); }
});

// ========== CUSTOM COMMANDS API ==========
app.get('/api/admin/channel/:id/custom-commands', async (req, res) => {
    try { res.json(await db.getCustomCommands(req.params.id)); }
    catch (e) { res.json([]); }
});

app.post('/api/admin/channel/:id/custom-command', async (req, res) => {
    try {
        const channelId = req.params.id;
        const { command, response, sub_response, user_responses, reply_to_user, enabled } = req.body;
        if (!command || !response) return res.status(400).json({ error: 'Komut ve cevap gerekli' });

        await db.upsertCustomCommand(channelId, command, {
            response,
            sub_response: sub_response || null,
            user_responses: user_responses || null,
            reply_to_user: reply_to_user !== false,
            enabled: enabled !== false
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/channel/:id/custom-command/:cmd', async (req, res) => {
    try {
        await db.deleteCustomCommand(req.params.id, req.params.cmd);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== POOLS API ==========
app.get('/api/admin/channel/:id/pools', async (req, res) => {
    try { res.json(await db.getPools(req.params.id)); }
    catch (e) { res.json([]); }
});

app.post('/api/admin/channel/:id/pool', async (req, res) => {
    try {
        const channelId = req.params.id;
        const { pool_name, values } = req.body;
        if (!pool_name || !values) return res.status(400).json({ error: 'Havuz adı ve değerler gerekli' });

        await db.upsertPool(channelId, pool_name, values);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/channel/:id/pool/:name', async (req, res) => {
    try {
        await db.deletePool(req.params.id, req.params.name);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== GAME TOGGLE ==========
app.get('/api/admin/channel/:id/game-status', async (req, res) => {
    const channelId = req.params.id;
    console.log(`[API] GET game-status for channel: ${channelId}`);
    try {
        const enabled = await db.getGameEnabled(channelId);
        console.log(`[API] game-status result: channel=${channelId}, enabled=${enabled}`);
        res.json({ game_enabled: enabled, channel_id: channelId });
    } catch (e) {
        console.error(`[API] game-status error:`, e);
        res.json({ game_enabled: true, error: e.message });
    }
});

app.post('/api/admin/channel/:id/game-toggle', async (req, res) => {
    const channelId = req.params.id;
    const enabled = req.body.enabled;
    console.log(`[API] POST game-toggle: channel=${channelId}, enabled=${enabled}`);
    try {
        const success = await db.setGameEnabled(channelId, enabled);
        console.log(`[API] game-toggle result: channel=${channelId}, success=${success}`);
        res.json({ success, channel_id: channelId, game_enabled: enabled });
    } catch (e) {
        console.error(`[API] game-toggle error:`, e);
        res.status(500).json({ error: e.message });
    }
});

// ========== GAME DATA API ==========
app.get('/api/admin/game/items', async (req, res) => {
    try {
        const items = await db.getAllGameItems();
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/game/item/:id', async (req, res) => {
    try {
        console.log('[API] PUT game/item:', req.params.id, JSON.stringify(req.body));
        await db.saveGameItem({ ...req.body, id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        console.error('[API] saveGameItem error:', e.message, e.stack);
        res.status(500).json({ error: e.message, stack: e.stack, detail: 'saveGameItem failed' });
    }
});

app.post('/api/admin/game/item', async (req, res) => {
    try {
        await db.saveGameItem(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/game/item/:id', async (req, res) => {
    try {
        await db.deleteGameItem(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/game/monsters', async (req, res) => {
    try {
        const monsters = await db.getAllGameMonsters();
        res.json(monsters);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/game/monster/:id', async (req, res) => {
    try {
        await db.saveGameMonster({ ...req.body, id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/game/monster', async (req, res) => {
    try {
        await db.saveGameMonster(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/game/monster/:id', async (req, res) => {
    try {
        await db.deleteGameMonster(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/game/quests', async (req, res) => {
    try {
        const quests = await db.getAllGameQuests();
        res.json(quests);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/game/quest/:id', async (req, res) => {
    try {
        await db.saveGameQuest({ ...req.body, id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/game/quest', async (req, res) => {
    try {
        await db.saveGameQuest(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/game/quest/:id', async (req, res) => {
    try {
        await db.deleteGameQuest(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== SUGGESTIONS API ==========
app.get('/api/admin/channel/:id/suggestions', async (req, res) => {
    try {
        const channelId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const suggestions = await db.getSuggestions(channelId, page, limit);
        const total = await db.getSuggestionCount(channelId);
        const totalPages = Math.ceil(total / limit);

        res.json({ suggestions, total, page, totalPages });
    } catch (e) { res.json({ suggestions: [], total: 0, page: 1, totalPages: 0 }); }
});

app.put('/api/admin/channel/:id/suggestion/:suggestionId', async (req, res) => {
    try {
        await db.updateSuggestionStatus(parseInt(req.params.suggestionId), req.body.status);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/channel/:id/suggestion/:suggestionId', async (req, res) => {
    try {
        await db.deleteSuggestion(parseInt(req.params.suggestionId));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Health check for Railway (must be before catch-all)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// Channel dashboard with optional page route (e.g., /doxish/items)
app.get('/:slug/:page?', (req, res) => {
    // Don't catch known paths
    const slug = req.params.slug.toLowerCase();
    if (['login', 'health', 'webhook', 'kick-login', 'api', 'auth', 'adminview'].includes(slug)) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Adminview with optional page route (e.g., /adminview/zaontez/items)
app.get('/adminview/:slug/:page?', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export { app };
