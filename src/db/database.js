import pg from 'pg';
const { Pool } = pg;

// PostgreSQL connection (Railway provides DATABASE_URL)
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/doxirpg';
console.log(`📦 Database URL: ${connectionString ? 'configured' : 'NOT SET!'}`);

const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err.message);
});

// Initialize database schema
async function initDatabase() {
    let client;
    try {
        client = await pool.connect();
        console.log('✅ PostgreSQL bağlantısı kuruldu');
    } catch (err) {
        console.error('❌ PostgreSQL bağlantı hatası:', err.message);
        console.log('⚠️  Database olmadan devam ediliyor (sınırlı işlevsellik)');
        return;
    }

    try {
        await client.query(`
      -- Authorized channels (users who enabled bot)
      CREATE TABLE IF NOT EXISTS channels (
        channel_id BIGINT PRIMARY KEY,
        owner_username TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at BIGINT,
        bot_enabled INTEGER DEFAULT 1,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
      );

      -- Per-channel command settings
      CREATE TABLE IF NOT EXISTS channel_commands (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        command TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        response TEXT,
        description TEXT,
        UNIQUE(channel_id, command)
      );

      -- Per-channel game settings
      CREATE TABLE IF NOT EXISTS channel_settings (
        channel_id BIGINT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (channel_id, key)
      );

      -- Characters (per-channel)
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        username TEXT NOT NULL,
        class TEXT DEFAULT 'warrior',
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        hp INTEGER DEFAULT 100,
        max_hp INTEGER DEFAULT 100,
        atk INTEGER DEFAULT 10,
        def INTEGER DEFAULT 5,
        luck INTEGER DEFAULT 5,
        gold INTEGER DEFAULT 100,
        doxigem INTEGER DEFAULT 0,
        total_kills INTEGER DEFAULT 0,
        total_gold_earned INTEGER DEFAULT 0,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        UNIQUE(channel_id, user_id)
      );

      -- Inventory
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        equipped INTEGER DEFAULT 0
      );

      -- Active battles
      CREATE TABLE IF NOT EXISTS battles (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        monster_id TEXT NOT NULL,
        monster_hp INTEGER NOT NULL,
        monster_max_hp INTEGER NOT NULL,
        started_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        UNIQUE(channel_id, user_id)
      );

      -- Cooldowns
      CREATE TABLE IF NOT EXISTS cooldowns (
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        action TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        PRIMARY KEY (channel_id, user_id, action)
      );

      -- Fishing
      CREATE TABLE IF NOT EXISTS fishing (
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        rod_id TEXT,
        started_at BIGINT NOT NULL,
        ends_at BIGINT NOT NULL,
        PRIMARY KEY (channel_id, user_id)
      );

      -- Active Quests
      CREATE TABLE IF NOT EXISTS active_quests (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        quest_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        started_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        expires_at BIGINT,
        UNIQUE(channel_id, user_id, quest_id)
      );

      -- Completed Quests
      CREATE TABLE IF NOT EXISTS completed_quests (
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        quest_id TEXT NOT NULL,
        completed_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        PRIMARY KEY (channel_id, user_id, quest_id)
      );

      -- Monster Drop Overrides
      CREATE TABLE IF NOT EXISTS monster_drop_overrides (
        channel_id BIGINT NOT NULL,
        monster_id TEXT NOT NULL,
        drops TEXT NOT NULL,
        PRIMARY KEY (channel_id, monster_id)
      );

      -- Quest Reward Overrides
      CREATE TABLE IF NOT EXISTS quest_reward_overrides (
        channel_id BIGINT NOT NULL,
        quest_id TEXT NOT NULL,
        rewards TEXT NOT NULL,
        PRIMARY KEY (channel_id, quest_id)
      );

      -- Chat log
      CREATE TABLE IF NOT EXISTS chat_log (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT,
        user_id BIGINT,
        username TEXT,
        content TEXT,
        response TEXT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
      );

      -- Custom commands (user-defined)
      CREATE TABLE IF NOT EXISTS custom_commands (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        command TEXT NOT NULL,
        response TEXT NOT NULL,
        sub_response TEXT,
        reply_to_user INTEGER DEFAULT 1,
        enabled INTEGER DEFAULT 1,
        use_count INTEGER DEFAULT 0,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        UNIQUE(channel_id, command)
      );

      -- Command counters (for {sayaç} variable)
      CREATE TABLE IF NOT EXISTS command_counters (
        channel_id BIGINT NOT NULL,
        counter_name TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        PRIMARY KEY (channel_id, counter_name)
      );

      -- Pools (for {havuz} variable)
      CREATE TABLE IF NOT EXISTS pools (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        pool_name TEXT NOT NULL,
        values TEXT NOT NULL,
        UNIQUE(channel_id, pool_name)
      );

      -- Add game_enabled column to channels if not exists
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'channels' AND column_name = 'game_enabled') THEN
          ALTER TABLE channels ADD COLUMN game_enabled INTEGER DEFAULT 1;
        END IF;
      END $$;
    `);
        console.log('✅ PostgreSQL veritabanı başlatıldı');
    } finally {
        client.release();
    }
}

// Default commands with descriptions
const DEFAULT_COMMANDS = [
    { command: 'kayit', description: 'Yeni karakter oluşturur (!kayit warrior/mage/archer)', enabled: 1, response: '🎮 Hoş geldin @{username}! {class_emoji} {class_name} | HP:{hp} ATK:{atk} DEF:{def}' },
    { command: 'profil', description: 'Karakter bilgilerini gösterir', enabled: 1, response: '📊 @{username} | {class_emoji} Lv.{level}/{max_level} | ❤️{hp}/{max_hp} ⚔️{atk} 🛡️{def} | 💰{gold} 💎{doxigem}' },
    { command: 'av', description: 'Avlanmaya çıkar ve rastgele canavar bulur', enabled: 1, response: '🎯 @{username} {monster_emoji} {monster_name} ile karşılaştı! HP:{monster_hp} | !saldir' },
    { command: 'saldir', description: 'Canavara saldırır', enabled: 1, response: '⚔️ @{username} {damage} hasar verdi!' },
    { command: 'kac', description: 'Savaştan kaçar', enabled: 1, response: '🏃 @{username} kaçtı!' },
    { command: 'balik', description: 'Balık tutmaya başlar (20dk)', enabled: 1, response: '🎣 @{username} balık tutmaya başladı! Süre: {duration}' },
    { command: 'gorev', description: 'Aktif ve mevcut görevleri gösterir', enabled: 1, response: '📋 Görevler: {quest_list}' },
    { command: 'envanter', description: 'Envanteri gösterir', enabled: 1, response: '🎒 @{username}: {items}' },
    { command: 'dukkan', description: 'Normal dükkandaki eşyaları gösterir (Altın)', enabled: 1, response: '🏪 Dükkan: {items}' },
    { command: 'pdukkan', description: 'Premium dükkandaki eşyaları gösterir (DoxiGem)', enabled: 1, response: '💎 Premium Dükkan: {items}' },
    { command: 'satin', description: 'Eşya satın alır (!satin [isim])', enabled: 1, response: '✅ @{username} {item} satın aldı! (-{price})' },
    { command: 'sat', description: 'Eşya satar (!sat [isim])', enabled: 1, response: '✅ @{username} {item} sattı! (+{price}💰)' },
    { command: 'kusak', description: 'Silah/zırh kuşanır (!kusak [isim])', enabled: 1, response: '✅ @{username} {item} kuşandı!' },
    { command: 'kullan', description: 'Tüketilebilir eşya kullanır (!kullan [isim])', enabled: 1, response: '✨ @{username} {item} kullandı! {effect}' },
    { command: 'gunluk', description: 'Günlük ödülü alır (24 saat arayla)', enabled: 1, response: '🎁 @{username} günlük ödül: +{gold}💰 +{exp}EXP' },
    { command: 'siralama', description: 'Liderlik tablosunu gösterir', enabled: 1, response: '🏆 Sıralama: {leaderboard}' },
    { command: 'yardim', description: 'Tüm komutları listeler', enabled: 1, response: '📖 Komutlar: !kayit !profil !av !saldir !balik !gorev !dukkan !pdukkan !gunluk !siralama' }
];

// Helper functions
async function query(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}

async function queryOne(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
}

function now() {
    return Math.floor(Date.now() / 1000);
}

export const db = {
    init: initDatabase,

    // ========== CHANNELS ==========
    async getChannel(channelId) {
        return queryOne('SELECT * FROM channels WHERE channel_id = $1', [channelId]);
    },

    async getAllChannels() {
        return query('SELECT * FROM channels ORDER BY created_at DESC');
    },

    async createChannel(channelId, ownerUsername, accessToken, refreshToken, expiresIn) {
        const expiresAt = now() + expiresIn;
        await pool.query(`
      INSERT INTO channels (channel_id, owner_username, access_token, refresh_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (channel_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at
    `, [channelId, ownerUsername, accessToken, refreshToken, expiresAt]);

        // Initialize default commands
        for (const cmd of DEFAULT_COMMANDS) {
            await pool.query(`
        INSERT INTO channel_commands (channel_id, command, enabled, response, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (channel_id, command) DO NOTHING
      `, [channelId, cmd.command, cmd.enabled, cmd.response, cmd.description]);
        }
        return this.getChannel(channelId);
    },

    async toggleChannel(channelId, enabled) {
        await pool.query('UPDATE channels SET bot_enabled = $1 WHERE channel_id = $2', [enabled ? 1 : 0, channelId]);
    },

    async deleteChannel(channelId) {
        const tables = ['channels', 'channel_commands', 'channel_settings', 'characters', 'inventory', 'battles', 'cooldowns', 'fishing', 'active_quests', 'completed_quests'];
        for (const table of tables) {
            await pool.query(`DELETE FROM ${table} WHERE channel_id = $1`, [channelId]);
        }
    },

    // ========== CHANNEL COMMANDS ==========
    async getChannelCommands(channelId) {
        return query('SELECT * FROM channel_commands WHERE channel_id = $1 ORDER BY command', [channelId]);
    },

    async getChannelCommand(channelId, command) {
        return queryOne('SELECT * FROM channel_commands WHERE channel_id = $1 AND command = $2', [channelId, command]);
    },

    async setChannelCommand(channelId, command, enabled, response, description) {
        await pool.query(`
      INSERT INTO channel_commands (channel_id, command, enabled, response, description)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (channel_id, command) DO UPDATE SET
        enabled = EXCLUDED.enabled, response = EXCLUDED.response, description = EXCLUDED.description
    `, [channelId, command, enabled, response, description]);
    },

    async toggleChannelCommand(channelId, command, enabled) {
        await pool.query('UPDATE channel_commands SET enabled = $1 WHERE channel_id = $2 AND command = $3', [enabled ? 1 : 0, channelId, command]);
    },

    // ========== CHARACTERS ==========
    async getCharacter(channelId, userId) {
        return queryOne('SELECT * FROM characters WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    },

    async getAllCharacters(channelId, limit = 100) {
        return query('SELECT * FROM characters WHERE channel_id = $1 ORDER BY level DESC, exp DESC LIMIT $2', [channelId, limit]);
    },

    async createCharacter(channelId, userId, username, charClass = 'warrior') {
        const baseStats = {
            warrior: { hp: 120, atk: 12, def: 8, luck: 5 },
            mage: { hp: 80, atk: 15, def: 4, luck: 8 },
            archer: { hp: 100, atk: 14, def: 5, luck: 10 }
        };
        const stats = baseStats[charClass] || baseStats.warrior;
        await pool.query(`
      INSERT INTO characters (channel_id, user_id, username, class, hp, max_hp, atk, def, luck)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [channelId, userId, username, charClass, stats.hp, stats.hp, stats.atk, stats.def, stats.luck]);
        return this.getCharacter(channelId, userId);
    },

    async updateCharacter(channelId, userId, updates) {
        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        await pool.query(`UPDATE characters SET ${setClause} WHERE channel_id = $${keys.length + 1} AND user_id = $${keys.length + 2}`, [...values, channelId, userId]);
        return this.getCharacter(channelId, userId);
    },

    async deleteCharacter(channelId, userId) {
        const tables = ['characters', 'inventory', 'battles', 'cooldowns', 'fishing', 'active_quests'];
        for (const table of tables) {
            await pool.query(`DELETE FROM ${table} WHERE channel_id = $1 AND user_id = $2`, [channelId, userId]);
        }
    },

    // ========== BATTLES ==========
    async getBattle(channelId, userId) {
        return queryOne('SELECT * FROM battles WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    },
    async startBattle(channelId, userId, monsterId, monsterHp) {
        await pool.query(`
      INSERT INTO battles (channel_id, user_id, monster_id, monster_hp, monster_max_hp)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (channel_id, user_id) DO UPDATE SET
        monster_id = EXCLUDED.monster_id, monster_hp = EXCLUDED.monster_hp, monster_max_hp = EXCLUDED.monster_max_hp
    `, [channelId, userId, monsterId, monsterHp, monsterHp]);
        return this.getBattle(channelId, userId);
    },
    async updateBattleHp(channelId, userId, newHp) {
        await pool.query('UPDATE battles SET monster_hp = $1 WHERE channel_id = $2 AND user_id = $3', [newHp, channelId, userId]);
    },
    async endBattle(channelId, userId) {
        await pool.query('DELETE FROM battles WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    },

    // ========== INVENTORY ==========
    async getInventory(channelId, userId) {
        return query('SELECT * FROM inventory WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    },
    async addItem(channelId, userId, itemId, quantity = 1) {
        const existing = await queryOne('SELECT * FROM inventory WHERE channel_id = $1 AND user_id = $2 AND item_id = $3', [channelId, userId, itemId]);
        if (existing) {
            await pool.query('UPDATE inventory SET quantity = quantity + $1 WHERE id = $2', [quantity, existing.id]);
        } else {
            await pool.query('INSERT INTO inventory (channel_id, user_id, item_id, quantity) VALUES ($1, $2, $3, $4)', [channelId, userId, itemId, quantity]);
        }
    },
    async removeItem(channelId, userId, itemId, quantity = 1) {
        const existing = await queryOne('SELECT * FROM inventory WHERE channel_id = $1 AND user_id = $2 AND item_id = $3', [channelId, userId, itemId]);
        if (existing) {
            if (existing.quantity <= quantity) {
                await pool.query('DELETE FROM inventory WHERE id = $1', [existing.id]);
            } else {
                await pool.query('UPDATE inventory SET quantity = quantity - $1 WHERE id = $2', [quantity, existing.id]);
            }
            return true;
        }
        return false;
    },
    async equipItem(channelId, userId, itemId, equip = true) {
        await pool.query('UPDATE inventory SET equipped = $1 WHERE channel_id = $2 AND user_id = $3 AND item_id = $4', [equip ? 1 : 0, channelId, userId, itemId]);
    },

    // ========== COOLDOWNS ==========
    async getCooldown(channelId, userId, action) {
        const cd = await queryOne('SELECT * FROM cooldowns WHERE channel_id = $1 AND user_id = $2 AND action = $3', [channelId, userId, action]);
        if (cd && cd.expires_at > now()) return cd.expires_at - now();
        return 0;
    },
    async setCooldown(channelId, userId, action, seconds) {
        const expiresAt = now() + seconds;
        await pool.query(`
      INSERT INTO cooldowns (channel_id, user_id, action, expires_at) VALUES ($1, $2, $3, $4)
      ON CONFLICT (channel_id, user_id, action) DO UPDATE SET expires_at = EXCLUDED.expires_at
    `, [channelId, userId, action, expiresAt]);
    },

    // ========== FISHING ==========
    async getFishing(channelId, userId) {
        const fishing = await queryOne('SELECT * FROM fishing WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
        if (fishing && fishing.ends_at > now()) return { ...fishing, remaining: fishing.ends_at - now() };
        else if (fishing) return { ...fishing, remaining: 0, completed: true };
        return null;
    },
    async startFishing(channelId, userId, rodId, duration) {
        const n = now();
        await pool.query(`
      INSERT INTO fishing (channel_id, user_id, rod_id, started_at, ends_at) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (channel_id, user_id) DO UPDATE SET rod_id = EXCLUDED.rod_id, started_at = EXCLUDED.started_at, ends_at = EXCLUDED.ends_at
    `, [channelId, userId, rodId, n, n + duration]);
    },
    async endFishing(channelId, userId) {
        await pool.query('DELETE FROM fishing WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    },

    // ========== QUESTS ==========
    async getActiveQuests(channelId, userId) {
        return query('SELECT * FROM active_quests WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    },
    async startQuest(channelId, userId, questId, expiresAt = null) {
        await pool.query(`
      INSERT INTO active_quests (channel_id, user_id, quest_id, progress, expires_at) VALUES ($1, $2, $3, 0, $4)
      ON CONFLICT (channel_id, user_id, quest_id) DO UPDATE SET progress = 0, expires_at = EXCLUDED.expires_at
    `, [channelId, userId, questId, expiresAt]);
    },
    async updateQuestProgress(channelId, userId, questId, progress) {
        await pool.query('UPDATE active_quests SET progress = $1 WHERE channel_id = $2 AND user_id = $3 AND quest_id = $4', [progress, channelId, userId, questId]);
    },
    async completeQuest(channelId, userId, questId) {
        await pool.query('DELETE FROM active_quests WHERE channel_id = $1 AND user_id = $2 AND quest_id = $3', [channelId, userId, questId]);
        await pool.query(`
      INSERT INTO completed_quests (channel_id, user_id, quest_id) VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [channelId, userId, questId]);
    },
    async getCompletedQuests(channelId, userId) {
        const rows = await query('SELECT quest_id FROM completed_quests WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
        return rows.map(r => r.quest_id);
    },

    // ========== DROP OVERRIDES ==========
    async getMonsterDropOverride(channelId, monsterId) {
        const row = await queryOne('SELECT drops FROM monster_drop_overrides WHERE channel_id = $1 AND monster_id = $2', [channelId, monsterId]);
        return row ? JSON.parse(row.drops) : null;
    },
    async saveMonsterDropOverride(channelId, monsterId, drops) {
        await pool.query(`
      INSERT INTO monster_drop_overrides (channel_id, monster_id, drops) VALUES ($1, $2, $3)
      ON CONFLICT (channel_id, monster_id) DO UPDATE SET drops = EXCLUDED.drops
    `, [channelId, monsterId, JSON.stringify(drops)]);
    },

    // ========== CHAT LOG ==========
    async logChat(channelId, userId, username, content, response) {
        await pool.query('INSERT INTO chat_log (channel_id, user_id, username, content, response) VALUES ($1, $2, $3, $4, $5)', [channelId, userId, username, content, response]);
    },
    async getRecentChats(channelId, limit = 50) {
        const rows = await query('SELECT * FROM chat_log WHERE channel_id = $1 ORDER BY id DESC LIMIT $2', [channelId, limit]);
        return rows.reverse();
    },

    // ========== STATS ==========
    async getLeaderboard(channelId, limit = 10) {
        return query('SELECT username, level, exp, gold, doxigem, class, total_kills FROM characters WHERE channel_id = $1 ORDER BY level DESC, exp DESC LIMIT $2', [channelId, limit]);
    },

    async getStats(channelId) {
        const totalPlayers = (await queryOne('SELECT COUNT(*) as count FROM characters WHERE channel_id = $1', [channelId]))?.count || 0;
        const totalBattles = (await queryOne('SELECT COUNT(*) as count FROM battles WHERE channel_id = $1', [channelId]))?.count || 0;
        const highestLevel = (await queryOne('SELECT MAX(level) as level FROM characters WHERE channel_id = $1', [channelId]))?.level || 0;
        const activeFishing = (await queryOne('SELECT COUNT(*) as count FROM fishing WHERE channel_id = $1 AND ends_at > $2', [channelId, now()]))?.count || 0;
        return { totalPlayers: parseInt(totalPlayers), totalBattles: parseInt(totalBattles), highestLevel: parseInt(highestLevel) || 0, activeFishing: parseInt(activeFishing) };
    },

    async getGlobalStats() {
        const totalChannels = (await queryOne('SELECT COUNT(*) as count FROM channels'))?.count || 0;
        const totalPlayers = (await queryOne('SELECT COUNT(*) as count FROM characters'))?.count || 0;
        const activeBattles = (await queryOne('SELECT COUNT(*) as count FROM battles'))?.count || 0;
        return { totalChannels: parseInt(totalChannels), totalPlayers: parseInt(totalPlayers), activeBattles: parseInt(activeBattles) };
    },

    // ========== CUSTOM COMMANDS ==========
    async getCustomCommands(channelId) {
        return query('SELECT * FROM custom_commands WHERE channel_id = $1 ORDER BY command', [channelId]);
    },
    async getCustomCommand(channelId, command) {
        return queryOne('SELECT * FROM custom_commands WHERE channel_id = $1 AND command = $2', [channelId, command.toLowerCase()]);
    },
    async upsertCustomCommand(channelId, command, data) {
        await pool.query(`
            INSERT INTO custom_commands (channel_id, command, response, sub_response, reply_to_user, enabled)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (channel_id, command) DO UPDATE SET
                response = $3,
                sub_response = $4,
                reply_to_user = $5,
                enabled = $6
        `, [channelId, command.toLowerCase(), data.response, data.sub_response || null, data.reply_to_user ? 1 : 0, data.enabled ? 1 : 0]);
    },
    async deleteCustomCommand(channelId, command) {
        await pool.query('DELETE FROM custom_commands WHERE channel_id = $1 AND command = $2', [channelId, command.toLowerCase()]);
    },
    async incrementCommandUse(channelId, command) {
        await pool.query('UPDATE custom_commands SET use_count = use_count + 1 WHERE channel_id = $1 AND command = $2', [channelId, command]);
    },

    // ========== COMMAND COUNTERS ==========
    async getCounter(channelId, counterName) {
        const row = await queryOne('SELECT count FROM command_counters WHERE channel_id = $1 AND counter_name = $2', [channelId, counterName]);
        return row?.count || 0;
    },
    async incrementCounter(channelId, counterName) {
        await pool.query(`
            INSERT INTO command_counters (channel_id, counter_name, count)
            VALUES ($1, $2, 1)
            ON CONFLICT (channel_id, counter_name) DO UPDATE SET count = command_counters.count + 1
        `, [channelId, counterName]);
        return (await this.getCounter(channelId, counterName));
    },

    // ========== POOLS ==========
    async getPools(channelId) {
        return query('SELECT * FROM pools WHERE channel_id = $1 ORDER BY pool_name', [channelId]);
    },
    async getPool(channelId, poolName) {
        return queryOne('SELECT * FROM pools WHERE channel_id = $1 AND pool_name = $2', [channelId, poolName.toLowerCase()]);
    },
    async upsertPool(channelId, poolName, values) {
        await pool.query(`
            INSERT INTO pools (channel_id, pool_name, values)
            VALUES ($1, $2, $3)
            ON CONFLICT (channel_id, pool_name) DO UPDATE SET values = $3
        `, [channelId, poolName.toLowerCase(), values]);
    },
    async deletePool(channelId, poolName) {
        await pool.query('DELETE FROM pools WHERE channel_id = $1 AND pool_name = $2', [channelId, poolName.toLowerCase()]);
    },

    // ========== GAME TOGGLE ==========
    async getGameEnabled(channelId) {
        const row = await queryOne('SELECT game_enabled FROM channels WHERE channel_id = $1', [channelId]);
        return row?.game_enabled !== 0;
    },
    async setGameEnabled(channelId, enabled) {
        await pool.query('UPDATE channels SET game_enabled = $1 WHERE channel_id = $2', [enabled ? 1 : 0, channelId]);
    }
};
