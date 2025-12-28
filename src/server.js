import express from 'express';
import path from 'path';
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy for Railway
app.set('trust proxy', 1);

// ========== AUTH ROUTES ==========
app.get('/login', (req, res) => res.redirect(getAuthorizationUrl()));

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
                        await kickApi.sendMessageToChannel(channelId, channel.access_token, response, message.message_id);
                        console.log('[Bot] Game response sent');
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
        const channelId = parseInt(req.params.id);
        const channel = await db.getChannel(channelId);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        const stats = await db.getStats(channelId);
        res.json({ channel, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/channel/:id/leaderboard', async (req, res) => {
    try {
        res.json(await db.getLeaderboard(parseInt(req.params.id), 10));
    } catch (e) { res.json([]); }
});

app.get('/api/channel/:id/chat-log', async (req, res) => {
    try {
        res.json(await db.getRecentChats(parseInt(req.params.id), 50));
    } catch (e) { res.json([]); }
});

// ========== ADMIN API ==========
app.get('/api/admin/channels', async (req, res) => {
    try { res.json(await db.getAllChannels()); }
    catch (e) { res.json([]); }
});

app.delete('/api/admin/channel/:id', async (req, res) => {
    try {
        await db.deleteChannel(parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:id/toggle', async (req, res) => {
    try {
        await db.toggleChannel(parseInt(req.params.id), req.body.enabled);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/channel/:id/commands', async (req, res) => {
    try { res.json(await db.getChannelCommands(parseInt(req.params.id))); }
    catch (e) { res.json([]); }
});

app.put('/api/admin/channel/:id/command/:cmd', async (req, res) => {
    try {
        const channelId = parseInt(req.params.id);
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
        await db.saveMonsterDropOverride(parseInt(req.params.id), req.params.monsterId, req.body.drops);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:id/send-message', async (req, res) => {
    try {
        const channelId = parseInt(req.params.id);
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
    try { res.json(await db.getCustomCommands(parseInt(req.params.id))); }
    catch (e) { res.json([]); }
});

app.post('/api/admin/channel/:id/custom-command', async (req, res) => {
    try {
        const channelId = parseInt(req.params.id);
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
        await db.deleteCustomCommand(parseInt(req.params.id), req.params.cmd);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== POOLS API ==========
app.get('/api/admin/channel/:id/pools', async (req, res) => {
    try { res.json(await db.getPools(parseInt(req.params.id))); }
    catch (e) { res.json([]); }
});

app.post('/api/admin/channel/:id/pool', async (req, res) => {
    try {
        const channelId = parseInt(req.params.id);
        const { pool_name, values } = req.body;
        if (!pool_name || !values) return res.status(400).json({ error: 'Havuz adı ve değerler gerekli' });

        await db.upsertPool(channelId, pool_name, values);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/channel/:id/pool/:name', async (req, res) => {
    try {
        await db.deletePool(parseInt(req.params.id), req.params.name);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== GAME TOGGLE ==========
app.get('/api/admin/channel/:id/game-status', async (req, res) => {
    try {
        const enabled = await db.getGameEnabled(parseInt(req.params.id));
        res.json({ game_enabled: enabled });
    } catch (e) { res.json({ game_enabled: true }); }
});

app.post('/api/admin/channel/:id/game-toggle', async (req, res) => {
    try {
        await db.setGameEnabled(parseInt(req.params.id), req.body.enabled);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== SUGGESTIONS API ==========
app.get('/api/admin/channel/:id/suggestions', async (req, res) => {
    try {
        const channelId = parseInt(req.params.id);
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

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Health check for Railway
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

export { app };
