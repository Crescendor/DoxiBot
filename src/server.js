import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { db } from './db/database.js';
import { kickApi } from './api/kick.js';
import { getAuthorizationUrl, exchangeCodeForTokens } from './auth/oauth.js';
import { processCommand } from './game/engine.js';
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
        const { code, error } = req.query;
        if (error) return res.send(`<html><body><h1>Hata</h1><p>${error}</p><a href="/">Geri</a></body></html>`);
        if (!code) return res.send('<html><body><h1>Hata</h1><p>Kod yok</p><a href="/">Geri</a></body></html>');

        const tokens = await exchangeCodeForTokens(code);
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

        try {
            await kickApi.sendMessageToChannel(userId, tokens.access_token, '🎮 DoxiRPG Bot aktif! !yardim ile komutları öğren.');
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
        console.log(`[Webhook] ${eventType}`);

        if (eventType === 'chat.message.sent') {
            const channelId = req.body.broadcaster?.user_id;
            if (!channelId) return res.status(200).json({ received: true });

            const channel = await db.getChannel(channelId);
            if (!channel || !channel.bot_enabled) return res.status(200).json({ received: true });

            const message = {
                message_id: req.body.message_id,
                content: req.body.content,
                sender: req.body.sender,
                broadcaster: req.body.broadcaster,
                created_at: req.body.created_at
            };

            console.log(`[${channel.owner_username}] ${message.sender.username}: ${message.content}`);
            const response = await processCommand(channelId, message);

            if (response) {
                await kickApi.sendMessageToChannel(channelId, channel.access_token, response, message.message_id);
                console.log('[Bot] Response sent');
            }
        }
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Webhook Error]', error);
        res.status(200).json({ received: true, error: error.message });
    }
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

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Health check for Railway
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

export { app };
