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

// 20 Payline definitions for 5x4 grid (5 columns, 4 rows)
// Grid layout: row0=[0,1,2,3,4], row1=[5,6,7,8,9], row2=[10,11,12,13,14], row3=[15,16,17,18,19]
const PAYLINES = [
    [0, 1, 2, 3, 4],       // Line 1: Top row
    [5, 6, 7, 8, 9],       // Line 2: Second row
    [10, 11, 12, 13, 14],  // Line 3: Third row
    [15, 16, 17, 18, 19],  // Line 4: Bottom row
    [0, 6, 12, 18, 14],    // Line 5: V shape down
    [15, 11, 7, 3, 9],     // Line 6: V shape up
    [0, 6, 7, 8, 4],       // Line 7: Slight dip top
    [15, 11, 12, 13, 19],  // Line 8: Slight rise bottom
    [5, 1, 2, 3, 9],       // Line 9: Upper zigzag
    [10, 16, 17, 18, 14],  // Line 10: Lower zigzag
    [5, 6, 2, 8, 9],       // Line 11: Peak up
    [10, 11, 7, 13, 14],   // Line 12: Dip down
    [0, 1, 7, 13, 19],     // Line 13: Diagonal down-right
    [15, 16, 12, 8, 4],    // Line 14: Diagonal up-right
    [5, 1, 7, 3, 9],       // Line 15: W shape top
    [10, 16, 12, 18, 14],  // Line 16: W shape bottom
    [0, 6, 2, 8, 4],       // Line 17: M shape top
    [15, 11, 17, 13, 19],  // Line 18: M shape bottom
    [5, 11, 7, 13, 9],     // Line 19: Diamond middle
    [0, 11, 12, 13, 4],    // Line 20: Wide V
];

// Line colors for visual display
const LINE_COLORS = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
    '#00FFFF', '#FF8000', '#8000FF', '#00FF80', '#FF0080',
    '#80FF00', '#0080FF', '#FF4040', '#40FF40', '#4040FF',
    '#FFFF80', '#FF80FF', '#80FFFF', '#FFA500', '#A500FF'
];

// Default icon payouts: icon -> { match3: payout, match4: payout, match5: payout }
const DEFAULT_ICON_PAYOUTS = {
    '🍒': { match3: 2, match4: 5, match5: 10 },
    '🍋': { match3: 3, match4: 8, match5: 15 },
    '🔔': { match3: 5, match4: 12, match5: 25 },
    '⭐': { match3: 8, match4: 20, match5: 50 },
    '💎': { match3: 15, match4: 40, match5: 100 },
    '7️⃣': { match3: 25, match4: 75, match5: 250 }
};

// Calculate winning lines from a grid
function calculateWinningLines(grid, icons, iconPayouts, betAmount) {
    const winningLines = [];

    for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
        const line = PAYLINES[lineIndex];
        const symbols = line.map(pos => grid[pos]);

        // Check for matches starting from left
        const firstSymbol = symbols[0];
        let matchCount = 1;

        for (let i = 1; i < symbols.length; i++) {
            if (symbols[i] === firstSymbol) {
                matchCount++;
            } else {
                break;
            }
        }

        // Need at least 3 matches to win
        if (matchCount >= 3) {
            const payout = iconPayouts[firstSymbol];
            if (payout) {
                let multiplier = 0;
                if (matchCount === 3) multiplier = payout.match3 || 0;
                else if (matchCount === 4) multiplier = payout.match4 || 0;
                else if (matchCount >= 5) multiplier = payout.match5 || 0;

                if (multiplier > 0) {
                    const lineWin = Math.floor(betAmount * multiplier);
                    winningLines.push({
                        line_index: lineIndex,
                        line_positions: line.slice(0, matchCount),
                        symbol: firstSymbol,
                        match_count: matchCount,
                        multiplier: multiplier,
                        win: lineWin,
                        color: LINE_COLORS[lineIndex]
                    });
                }
            }
        }
    }

    return winningLines;
}

// Slot game processor - Classic 20-Line system
async function processSlotCommand(channelId, message, betAmount, settings, db) {
    const userId = message.sender.user_id || message.sender.id;
    const username = message.sender.username;

    // Validate bet amount
    if (betAmount < settings.min_bet) {
        return `⚠️ @${username} Minimum bahis: ${settings.min_bet} puan`;
    }
    if (betAmount > settings.max_bet) {
        return `⚠️ @${username} Maximum bahis: ${settings.max_bet} puan`;
    }

    // Check if another game is active
    const activeGame = await db.getActiveSlotGame(channelId);
    if (activeGame && activeGame.user_id !== userId) {
        return `⏳ @${username} Şu an @${activeGame.username} oynuyor, lütfen bekle!`;
    }

    // Get or create player
    const player = await db.createOrGetSlotPlayer(channelId, userId, username, settings.start_balance);

    // Single bet deduction (not multiplied by spin count)
    if (player.balance < betAmount) {
        return `💸 @${username} Yetersiz bakiye! Bakiyen: ${player.balance.toLocaleString()} puan`;
    }

    // Parse icons
    const icons = typeof settings.icons === 'string'
        ? JSON.parse(settings.icons)
        : (settings.icons || ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣']);

    // Parse icon payouts (or use defaults)
    let iconPayouts = typeof settings.icon_payouts === 'string'
        ? JSON.parse(settings.icon_payouts)
        : (settings.icon_payouts || {});

    // Merge with defaults for any missing icons
    for (const icon of icons) {
        if (!iconPayouts[icon]) {
            iconPayouts[icon] = DEFAULT_ICON_PAYOUTS[icon] || { match3: 2, match4: 5, match5: 10 };
        }
    }

    // Generate grid (5x4 = 20 cells)
    const grid = [];
    for (let i = 0; i < 20; i++) {
        grid.push(icons[Math.floor(Math.random() * icons.length)]);
    }

    // Calculate all winning lines
    const winningLines = calculateWinningLines(grid, icons, iconPayouts, betAmount);
    const totalWin = winningLines.reduce((sum, line) => sum + line.win, 0);

    // Deduct bet
    const newBalance = player.balance - betAmount;
    await db.updateSlotPlayer(channelId, userId, newBalance, 0, betAmount, 0);

    // Start game with result data
    await db.startSlotGameWithLines(channelId, userId, username, betAmount, grid, winningLines, totalWin);

    // Update player stats with total win
    const finalBalance = newBalance + totalWin;
    await db.updateSlotPlayer(channelId, userId, finalBalance, totalWin, 0, totalWin > (player.biggest_win || 0) ? totalWin : 0);

    // End game after animation time
    const animationTime = Math.max(3000, winningLines.length * 1500) + 2000;
    setTimeout(async () => {
        await db.endSlotGame(channelId);
    }, animationTime);

    // Return win message
    const coinName = settings.coin_name || 'Coin';
    if (totalWin > 0) {
        const lineCount = winningLines.length;
        return `🎰 @${username} ${lineCount} line'da ${totalWin.toLocaleString()} ${coinName} kazandı! 💰`;
    } else {
        return `🎰 @${username} kazanamadı. Tekrar dene!`;
    }
}



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

                // 1.5 Check slot commands (dynamic names from settings)
                const slotSettings = await db.getSlotSettings(channelId);
                console.log(`[Slot] Settings for ${channelId}:`, slotSettings ? { enabled: slotSettings.enabled, cmd_slot: slotSettings.cmd_slot } : 'null');

                if (slotSettings && (slotSettings.enabled === 1 || slotSettings.enabled === true)) {
                    // Strip ! prefix if present from saved commands
                    const slotCmd = (slotSettings.cmd_slot || 'slot').toLowerCase().replace(/^!/, '');
                    const balanceCmd = (slotSettings.cmd_balance || 'bakiye').toLowerCase().replace(/^!/, '');
                    const leaderboardCmd = (slotSettings.cmd_leaderboard || 'slotsiralama').toLowerCase().replace(/^!/, '');
                    const coinName = slotSettings.coin_name || 'Coin';

                    console.log(`[Slot] Checking cmd: ${cmdName} vs slotCmd: ${slotCmd}, balanceCmd: ${balanceCmd}`);

                    if (cmdName === slotCmd) {
                        const betAmount = parseInt(cmdParts[1]) || 0;
                        console.log(`[Slot] Processing slot command with bet: ${betAmount}`);
                        const slotResponse = await processSlotCommand(channelId, message, betAmount, slotSettings, db);
                        if (slotResponse) {
                            console.log(`[Slot] Response: ${slotResponse}`);
                            await kickApi.sendMessageToChannel(channelId, channel.access_token, slotResponse, message.message_id, db, channel.refresh_token);
                            return res.status(200).json({ received: true });
                        }
                    }
                    if (cmdName === balanceCmd) {
                        const userId = message.sender.user_id || message.sender.id;
                        const player = await db.getSlotPlayer(channelId, userId);
                        const balance = player ? player.balance : slotSettings.start_balance;
                        const response = `💰 @${message.sender.username} bakiyesi: ${balance.toLocaleString()} ${coinName}`;
                        await kickApi.sendMessageToChannel(channelId, channel.access_token, response, message.message_id, db, channel.refresh_token);
                        return res.status(200).json({ received: true });
                    }
                    if (cmdName === leaderboardCmd || cmdName === 'slotsıralama') {
                        const leaders = await db.getSlotLeaderboard(channelId, 5);
                        const response = leaders.length === 0
                            ? '🏆 Henüz slot oynayan yok!'
                            : '🏆 Slot Sıralaması: ' + leaders.map((p, i) => `${i + 1}. ${p.username} (${p.total_won.toLocaleString()} ${coinName})`).join(' | ');
                        await kickApi.sendMessageToChannel(channelId, channel.access_token, response, null, db, channel.refresh_token);
                        return res.status(200).json({ received: true });
                    }
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

// ========== COMMANDS API ==========
app.get('/api/admin/channel/:id/commands', async (req, res) => {
    try {
        const channelId = req.params.id;
        const commands = await db.getChannelCommands(channelId);
        res.json(commands);
    } catch (e) {
        console.error('[API] getCommands error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/channel/:id/command/:cmd/toggle', async (req, res) => {
    try {
        const { id: channelId, cmd: command } = req.params;
        const { enabled } = req.body;
        await db.toggleCommand(channelId, command, enabled);
        res.json({ success: true });
    } catch (e) {
        console.error('[API] toggleCommand error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/channel/:id/command/:cmd', async (req, res) => {
    try {
        const { id: channelId, cmd: originalCommand } = req.params;
        const { response, command: newCommand, description } = req.body;
        console.log('[API] PUT command:', { channelId, originalCommand, newCommand, responseLen: response?.length, description: description?.substring(0, 20) });
        await db.updateCommandResponse(channelId, originalCommand, response, newCommand, description);
        res.json({ success: true });
    } catch (e) {
        console.error('[API] updateCommand error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ========== GAME DATA API (Per-Channel) ==========
// Items
app.get('/api/admin/channel/:channelId/game/items', async (req, res) => {
    try {
        const items = await db.getAllGameItems(req.params.channelId);
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/channel/:channelId/game/item/:id', async (req, res) => {
    try {
        console.log('[API] PUT game/item:', req.params.channelId, req.params.id);
        await db.saveGameItem({ ...req.body, id: req.params.id }, req.params.channelId);
        res.json({ success: true });
    } catch (e) {
        console.error('[API] saveGameItem error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/channel/:channelId/game/item', async (req, res) => {
    try {
        await db.saveGameItem(req.body, req.params.channelId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/channel/:channelId/game/item/:id', async (req, res) => {
    try {
        await db.deleteGameItem(req.params.id, req.params.channelId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Monsters
app.get('/api/admin/channel/:channelId/game/monsters', async (req, res) => {
    try {
        const monsters = await db.getAllGameMonsters(req.params.channelId);
        res.json(monsters);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/channel/:channelId/game/monster/:id', async (req, res) => {
    try {
        await db.saveGameMonster({ ...req.body, id: req.params.id }, req.params.channelId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:channelId/game/monster', async (req, res) => {
    try {
        await db.saveGameMonster(req.body, req.params.channelId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/channel/:channelId/game/monster/:id', async (req, res) => {
    try {
        await db.deleteGameMonster(req.params.id, req.params.channelId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Quests
app.get('/api/admin/channel/:channelId/game/quests', async (req, res) => {
    try {
        const quests = await db.getAllGameQuests(req.params.channelId);
        res.json(quests);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/channel/:channelId/game/quest/:id', async (req, res) => {
    try {
        await db.saveGameQuest({ ...req.body, id: req.params.id }, req.params.channelId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/channel/:channelId/game/quest', async (req, res) => {
    try {
        await db.saveGameQuest(req.body, req.params.channelId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/channel/:channelId/game/quest/:id', async (req, res) => {
    try {
        await db.deleteGameQuest(req.params.id, req.params.channelId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== SLOT GAME API ==========
app.get('/api/admin/channel/:id/slot/settings', async (req, res) => {
    try {
        const settings = await db.getSlotSettings(req.params.id);
        res.json(settings);
    } catch (e) {
        console.error('[API] getSlotSettings error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/channel/:id/slot/settings', async (req, res) => {
    try {
        await db.saveSlotSettings(req.params.id, req.body);
        res.json({ success: true });
    } catch (e) {
        console.error('[API] saveSlotSettings error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/channel/:id/slot/toggle', async (req, res) => {
    try {
        await db.toggleSlot(req.params.id, req.body.enabled);
        res.json({ success: true });
    } catch (e) {
        console.error('[API] toggleSlot error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/channel/:id/slot/leaderboard', async (req, res) => {
    try {
        const leaderboard = await db.getSlotLeaderboard(req.params.id);
        res.json(leaderboard);
    } catch (e) {
        console.error('[API] getSlotLeaderboard error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Public slot game state for OBS overlay
app.get('/api/channel/:slug/slot/state', async (req, res) => {
    try {
        // Find channel by slug (username)
        const channels = await db.getAllChannels();
        const channel = channels.find(c => c.owner_username.toLowerCase() === req.params.slug.toLowerCase());
        if (!channel) {
            return res.json({ active: false });
        }

        const activeGame = await db.getActiveSlotGame(channel.channel_id);
        const settings = await db.getSlotSettings(channel.channel_id);

        res.json({
            active: !!activeGame,
            game: activeGame,
            settings: {
                game_name: settings?.game_name || 'Slot Makinesi',
                icons: settings?.icons || ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣']
            }
        });
    } catch (e) {
        console.error('[API] getSlotState error:', e);
        res.json({ active: false });
    }
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

// Slot overlay route (must be before catch-all)
app.get('/:slug/overlay/slot', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'slot.html'));
});

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
