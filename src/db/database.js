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
        password_hash TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at BIGINT,
        bot_enabled INTEGER DEFAULT 1,
        game_enabled INTEGER DEFAULT 1,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
      );

      -- Migration: Add game_enabled column if not exists
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'channels' AND column_name = 'game_enabled') THEN
          ALTER TABLE channels ADD COLUMN game_enabled INTEGER DEFAULT 1;
        END IF;
      END $$;

      -- Migration: Add password_hash column if not exists
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'channels' AND column_name = 'password_hash') THEN
          ALTER TABLE channels ADD COLUMN password_hash TEXT;
        END IF;
      END $$;

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
        user_responses TEXT,
        reply_to_user INTEGER DEFAULT 1,
        enabled INTEGER DEFAULT 1,
        use_count INTEGER DEFAULT 0,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        UNIQUE(channel_id, command)
      );

      -- Add user_responses column if not exists
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'custom_commands' AND column_name = 'user_responses') THEN
          ALTER TABLE custom_commands ADD COLUMN user_responses TEXT;
        END IF;
      END $$;

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

      -- Suggestions (!öneri command)
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
      );

      -- Add game_enabled column to channels if not exists
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'channels' AND column_name = 'game_enabled') THEN
          ALTER TABLE channels ADD COLUMN game_enabled INTEGER DEFAULT 1;
        END IF;
      END $$;

      -- Game Items Table
      CREATE TABLE IF NOT EXISTS game_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '📦',
        type TEXT DEFAULT 'material',
        rarity TEXT DEFAULT 'common',
        description TEXT,
        price INTEGER DEFAULT 0,
        gem_price INTEGER DEFAULT 0,
        shop_item BOOLEAN DEFAULT FALSE,
        premium_shop BOOLEAN DEFAULT FALSE,
        attack INTEGER DEFAULT 0,
        defense INTEGER DEFAULT 0,
        hp INTEGER DEFAULT 0
      );

      -- Game Monsters Table
      CREATE TABLE IF NOT EXISTS game_monsters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '👹',
        hp INTEGER DEFAULT 100,
        atk INTEGER DEFAULT 10,
        def INTEGER DEFAULT 5,
        min_level INTEGER DEFAULT 1,
        exp_reward INTEGER DEFAULT 50,
        gold_reward INTEGER DEFAULT 100
      );

      -- Game Quests Table
      CREATE TABLE IF NOT EXISTS game_quests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        gold_reward INTEGER DEFAULT 100,
        exp_reward INTEGER DEFAULT 50,
        min_level INTEGER DEFAULT 1
      );

      -- Migration: Add missing columns to game_items if they don't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_items' AND column_name = 'gem_price') THEN
          ALTER TABLE game_items ADD COLUMN gem_price INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_items' AND column_name = 'shop_item') THEN
          ALTER TABLE game_items ADD COLUMN shop_item BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_items' AND column_name = 'premium_shop') THEN
          ALTER TABLE game_items ADD COLUMN premium_shop BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_items' AND column_name = 'attack') THEN
          ALTER TABLE game_items ADD COLUMN attack INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_items' AND column_name = 'defense') THEN
          ALTER TABLE game_items ADD COLUMN defense INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_items' AND column_name = 'hp') THEN
          ALTER TABLE game_items ADD COLUMN hp INTEGER DEFAULT 0;
        END IF;
        -- Per-channel support
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_items' AND column_name = 'channel_id') THEN
          ALTER TABLE game_items ADD COLUMN channel_id TEXT DEFAULT 'global';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_monsters' AND column_name = 'channel_id') THEN
          ALTER TABLE game_monsters ADD COLUMN channel_id TEXT DEFAULT 'global';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_quests' AND column_name = 'channel_id') THEN
          ALTER TABLE game_quests ADD COLUMN channel_id TEXT DEFAULT 'global';
        END IF;
      END $$;

      -- Create composite unique constraints for per-channel data
      -- First drop old primary key and recreate with composite
      DO $$
      BEGIN
        -- game_items: drop PK if exists, create unique on (id, channel_id)
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_items_channel_unique') THEN
          ALTER TABLE game_items DROP CONSTRAINT IF EXISTS game_items_pkey;
          ALTER TABLE game_items ADD CONSTRAINT game_items_channel_unique UNIQUE (id, channel_id);
        END IF;
        -- game_monsters
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_monsters_channel_unique') THEN
          ALTER TABLE game_monsters DROP CONSTRAINT IF EXISTS game_monsters_pkey;
          ALTER TABLE game_monsters ADD CONSTRAINT game_monsters_channel_unique UNIQUE (id, channel_id);
        END IF;
        -- game_quests
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_quests_channel_unique') THEN
          ALTER TABLE game_quests DROP CONSTRAINT IF EXISTS game_quests_pkey;
          ALTER TABLE game_quests ADD CONSTRAINT game_quests_channel_unique UNIQUE (id, channel_id);
        END IF;
      END $$;

      -- ========== SLOT GAME TABLES ==========
      -- Slot Settings (per-channel)
      CREATE TABLE IF NOT EXISTS slot_settings (
        channel_id BIGINT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        game_name TEXT DEFAULT 'Slot Makinesi',
        coin_name TEXT DEFAULT 'Coin',
        min_bet INTEGER DEFAULT 10,
        max_bet INTEGER DEFAULT 100000000,
        spin_count INTEGER DEFAULT 5,
        start_balance INTEGER DEFAULT 1000,
        multipliers JSONB DEFAULT '{"2": 40, "5": 25, "10": 15, "20": 10, "50": 7, "100": 3}',
        icons JSONB DEFAULT '["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"]',
        cmd_slot TEXT DEFAULT 'slot',
        cmd_balance TEXT DEFAULT 'bakiye',
        cmd_leaderboard TEXT DEFAULT 'slotsiralama',
        win_message TEXT DEFAULT '🎰 @{username} {multiplier}x çarpan ile {amount} {coin} kazandı! 💰',
        jackpot_message TEXT DEFAULT '🎰🎰🎰 JACKPOT! @{username} {amount} {coin} kazandı! 🎰🎰🎰'
      );

      -- Slot Players (per-channel balances)
      CREATE TABLE IF NOT EXISTS slot_players (
        id SERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        username TEXT NOT NULL,
        balance INTEGER DEFAULT 10000,
        total_won INTEGER DEFAULT 0,
        total_lost INTEGER DEFAULT 0,
        total_spins INTEGER DEFAULT 0,
        biggest_win INTEGER DEFAULT 0,
        last_played BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        UNIQUE(channel_id, user_id)
      );

      -- Slot Active Game (lock for single player)
      CREATE TABLE IF NOT EXISTS slot_active_game (
        channel_id BIGINT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        username TEXT NOT NULL,
        bet_amount INTEGER NOT NULL,
        current_spin INTEGER DEFAULT 0,
        total_spins INTEGER DEFAULT 5,
        current_multiplier INTEGER DEFAULT 0,
        result JSONB,
        started_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
      );
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

    // ========== COMMANDS ==========
    async getChannelCommands(channelId) {
        const result = await pool.query(
            'SELECT command, description, enabled, response FROM channel_commands WHERE channel_id = $1::BIGINT ORDER BY command',
            [String(channelId)]
        );
        return result.rows;
    },

    async toggleCommand(channelId, command, enabled) {
        await pool.query(
            'UPDATE channel_commands SET enabled = $1 WHERE channel_id = $2::BIGINT AND command = $3',
            [enabled ? 1 : 0, String(channelId), command]
        );
    },

    async updateCommandResponse(channelId, originalCommand, response, newCommand = null, description = null) {
        const cid = String(channelId);
        console.log(`[DB] updateCommandResponse: channel=${cid}, original=${originalCommand}, new=${newCommand}, response length=${response?.length}, desc=${description?.substring(0, 20)}`);

        if (newCommand && newCommand !== originalCommand) {
            // Update command name, response, and optionally description
            const result = await pool.query(
                'UPDATE channel_commands SET command = $1, response = $2, description = COALESCE($5, description) WHERE channel_id = $3::BIGINT AND command = $4',
                [newCommand, response, cid, originalCommand, description]
            );
            console.log(`[DB] updateCommandResponse rows affected: ${result.rowCount}`);
        } else {
            // Update response and optionally description
            const result = await pool.query(
                'UPDATE channel_commands SET response = $1, description = COALESCE($4, description) WHERE channel_id = $2::BIGINT AND command = $3',
                [response, cid, originalCommand, description]
            );
            console.log(`[DB] updateCommandResponse rows affected: ${result.rowCount}`);
        }
    },

    async updateChannelTokens(channelId, accessToken, refreshToken, expiresIn) {
        const expiresAt = now() + expiresIn;
        console.log(`[DB] Updating tokens for channel ${channelId}`);
        await pool.query(
            'UPDATE channels SET access_token = $1, refresh_token = $2, token_expires_at = $3 WHERE channel_id = $4::BIGINT',
            [accessToken, refreshToken, expiresAt, String(channelId)]
        );
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
            INSERT INTO custom_commands (channel_id, command, response, sub_response, user_responses, reply_to_user, enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (channel_id, command) DO UPDATE SET
                response = $3,
                sub_response = $4,
                user_responses = $5,
                reply_to_user = $6,
                enabled = $7
        `, [channelId, command.toLowerCase(), data.response, data.sub_response || null, data.user_responses || null, data.reply_to_user ? 1 : 0, data.enabled ? 1 : 0]);
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
        // Ensure channelId is treated as a string for BIGINT comparison
        const cid = String(channelId);
        console.log(`[DB] getGameEnabled called for channel: ${cid}`);

        const row = await queryOne('SELECT game_enabled FROM channels WHERE channel_id = $1::BIGINT', [cid]);
        console.log(`[DB] getGameEnabled result:`, row);

        // If no row or game_enabled is NULL, default to true (enabled)
        if (!row) {
            console.log(`[DB] No channel found for ID ${cid}, returning default true`);
            return true;
        }

        // game_enabled is stored as INTEGER: 1 = enabled, 0 = disabled
        // PostgreSQL may return as string or number, so convert to Number
        const rawValue = row.game_enabled;
        console.log(`[DB] Raw game_enabled value: ${rawValue}, type: ${typeof rawValue}`);
        const enabled = Number(rawValue) === 1;
        console.log(`[DB] Channel ${cid} game_enabled = ${enabled} (converted from ${rawValue})`);
        return enabled;
    },

    async setGameEnabled(channelId, enabled) {
        // Ensure channelId is treated as a string for BIGINT comparison
        const cid = String(channelId);
        const value = enabled ? 1 : 0;
        console.log(`[DB] setGameEnabled called: channel=${cid}, enabled=${enabled}, value=${value}`);

        // Use RETURNING to verify the update actually happened
        const result = await pool.query(
            'UPDATE channels SET game_enabled = $1 WHERE channel_id = $2::BIGINT RETURNING channel_id, game_enabled',
            [value, cid]
        );

        if (result.rowCount === 0) {
            console.log(`[DB] WARNING: No rows updated for channel ${cid}! Check if channel exists.`);
        } else {
            console.log(`[DB] Successfully updated ${result.rowCount} row(s). New value:`, result.rows[0]);
        }

        return result.rowCount > 0;
    },

    // ========== SUGGESTIONS ==========
    async addSuggestion(channelId, userId, username, content) {
        await pool.query('INSERT INTO suggestions (channel_id, user_id, username, content) VALUES ($1, $2, $3, $4)',
            [channelId, userId, username, content]);
    },
    async getSuggestions(channelId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        return query('SELECT * FROM suggestions WHERE channel_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [channelId, limit, offset]);
    },
    async getSuggestionCount(channelId) {
        const row = await queryOne('SELECT COUNT(*) as count FROM suggestions WHERE channel_id = $1', [channelId]);
        return parseInt(row?.count || 0);
    },
    async updateSuggestionStatus(suggestionId, status) {
        await pool.query('UPDATE suggestions SET status = $1 WHERE id = $2', [status, suggestionId]);
    },
    async deleteSuggestion(suggestionId) {
        await pool.query('DELETE FROM suggestions WHERE id = $1', [suggestionId]);
    },

    async getChannelByUsername(username) {
        return queryOne('SELECT * FROM channels WHERE LOWER(owner_username) = LOWER($1)', [username]);
    },
    async setChannelPassword(channelId, passwordHash) {
        await pool.query('UPDATE channels SET password_hash = $1 WHERE channel_id = $2', [passwordHash, channelId]);
    },
    async getChannelPassword(channelId) {
        const row = await queryOne('SELECT password_hash FROM channels WHERE channel_id = $1', [channelId]);
        return row?.password_hash || null;
    },

    // ========== GAME ITEMS (Per-Channel) ==========
    async getAllGameItems(channelId) {
        const cid = String(channelId || 'global');
        const result = await pool.query('SELECT * FROM game_items WHERE channel_id = $1 ORDER BY name', [cid]);
        return result.rows;
    },
    async saveGameItem(item, channelId) {
        const cid = String(channelId || 'global');
        // Use composite key: id + channel_id
        await pool.query(
            `INSERT INTO game_items (id, name, emoji, type, rarity, description, price, gem_price, shop_item, premium_shop, attack, defense, hp, channel_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (id, channel_id) DO UPDATE SET
             name = $2, emoji = $3, type = $4, rarity = $5, description = $6,
             price = $7, gem_price = $8, shop_item = $9, premium_shop = $10,
             attack = $11, defense = $12, hp = $13`,
            [item.id, item.name, item.emoji || '📦', item.type || 'material', item.rarity || 'common',
            item.description || '', item.price || 0, item.gem_price || 0,
            item.shop_item || false, item.premium_shop || false,
            item.attack || 0, item.defense || 0, item.hp || 0, cid]
        );
    },
    async deleteGameItem(id, channelId) {
        const cid = String(channelId || 'global');
        await pool.query('DELETE FROM game_items WHERE id = $1 AND channel_id = $2', [id, cid]);
    },

    // ========== GAME MONSTERS (Per-Channel) ==========
    async getAllGameMonsters(channelId) {
        const cid = String(channelId || 'global');
        const result = await pool.query('SELECT * FROM game_monsters WHERE channel_id = $1 ORDER BY min_level, name', [cid]);
        return result.rows;
    },
    async saveGameMonster(m, channelId) {
        const cid = String(channelId || 'global');
        await pool.query(
            `INSERT INTO game_monsters (id, name, emoji, hp, atk, def, min_level, exp_reward, gold_reward, channel_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id, channel_id) DO UPDATE SET
             name = $2, emoji = $3, hp = $4, atk = $5, def = $6,
             min_level = $7, exp_reward = $8, gold_reward = $9`,
            [m.id, m.name, m.emoji || '👹', m.hp || 100, m.atk || 10, m.def || 5,
            m.min_level || 1, m.exp_reward || 50, m.gold_reward || 100, cid]
        );
    },
    async deleteGameMonster(id, channelId) {
        const cid = String(channelId || 'global');
        await pool.query('DELETE FROM game_monsters WHERE id = $1 AND channel_id = $2', [id, cid]);
    },

    // ========== GAME QUESTS (Per-Channel) ==========
    async getAllGameQuests(channelId) {
        const cid = String(channelId || 'global');
        const result = await pool.query('SELECT * FROM game_quests WHERE channel_id = $1 ORDER BY min_level, name', [cid]);
        return result.rows;
    },
    async saveGameQuest(q, channelId) {
        const cid = String(channelId || 'global');
        await pool.query(
            `INSERT INTO game_quests (id, name, description, gold_reward, exp_reward, min_level, channel_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id, channel_id) DO UPDATE SET
             name = $2, description = $3, gold_reward = $4, exp_reward = $5, min_level = $6`,
            [q.id, q.name, q.description || '', q.gold_reward || 100, q.exp_reward || 50, q.min_level || 1, cid]
        );
    },
    async deleteGameQuest(id, channelId) {
        const cid = String(channelId || 'global');
        await pool.query('DELETE FROM game_quests WHERE id = $1 AND channel_id = $2', [id, cid]);
    },

    // ========== SLOT GAME ==========
    async getSlotSettings(channelId) {
        const cid = String(channelId);
        let result = await pool.query('SELECT * FROM slot_settings WHERE channel_id = $1::BIGINT', [cid]);
        if (!result.rows[0]) {
            // Create default settings
            await pool.query(
                `INSERT INTO slot_settings (channel_id) VALUES ($1::BIGINT) ON CONFLICT DO NOTHING`,
                [cid]
            );
            result = await pool.query('SELECT * FROM slot_settings WHERE channel_id = $1::BIGINT', [cid]);
        }
        return result.rows[0];
    },

    async saveSlotSettings(channelId, settings) {
        const cid = String(channelId);
        await pool.query(
            `INSERT INTO slot_settings (channel_id, enabled, game_name, coin_name, min_bet, max_bet, spin_count, start_balance, multipliers, icons, cmd_slot, cmd_balance, cmd_leaderboard, win_message, jackpot_message)
             VALUES ($1::BIGINT, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             ON CONFLICT (channel_id) DO UPDATE SET
             enabled = $2, game_name = $3, coin_name = $4, min_bet = $5, max_bet = $6, spin_count = $7,
             start_balance = $8, multipliers = $9, icons = $10, cmd_slot = $11, cmd_balance = $12, cmd_leaderboard = $13, win_message = $14, jackpot_message = $15`,
            [cid, settings.enabled || 0, settings.game_name || 'Slot Makinesi', settings.coin_name || 'Coin',
                settings.min_bet || 10, settings.max_bet || 100000000, settings.spin_count || 5,
                settings.start_balance || 1000, JSON.stringify(settings.multipliers || {}),
                JSON.stringify(settings.icons || ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣']),
                settings.cmd_slot || 'slot', settings.cmd_balance || 'bakiye', settings.cmd_leaderboard || 'slotsiralama',
                settings.win_message || '', settings.jackpot_message || '']
        );
    },

    async toggleSlot(channelId, enabled) {
        const cid = String(channelId);
        await pool.query(
            `INSERT INTO slot_settings (channel_id, enabled) VALUES ($1::BIGINT, $2)
             ON CONFLICT (channel_id) DO UPDATE SET enabled = $2`,
            [cid, enabled ? 1 : 0]
        );
    },

    async getSlotPlayer(channelId, userId) {
        const cid = String(channelId);
        let result = await pool.query(
            'SELECT * FROM slot_players WHERE channel_id = $1::BIGINT AND user_id = $2::BIGINT',
            [cid, String(userId)]
        );
        return result.rows[0];
    },

    async createOrGetSlotPlayer(channelId, userId, username, startBalance = 10000) {
        const cid = String(channelId);
        await pool.query(
            `INSERT INTO slot_players (channel_id, user_id, username, balance)
             VALUES ($1::BIGINT, $2::BIGINT, $3, $4)
             ON CONFLICT (channel_id, user_id) DO UPDATE SET username = $3`,
            [cid, String(userId), username, startBalance]
        );
        return this.getSlotPlayer(channelId, userId);
    },

    async updateSlotPlayer(channelId, userId, balance, won = 0, lost = 0, biggestWin = 0) {
        const cid = String(channelId);
        await pool.query(
            `UPDATE slot_players SET 
             balance = $3, total_won = total_won + $4, total_lost = total_lost + $5,
             total_spins = total_spins + 1, biggest_win = GREATEST(biggest_win, $6),
             last_played = EXTRACT(EPOCH FROM NOW())
             WHERE channel_id = $1::BIGINT AND user_id = $2::BIGINT`,
            [cid, String(userId), balance, won, lost, biggestWin]
        );
    },

    async getSlotLeaderboard(channelId, limit = 10) {
        const cid = String(channelId);
        const result = await pool.query(
            'SELECT username, balance, total_won, biggest_win, total_spins FROM slot_players WHERE channel_id = $1::BIGINT ORDER BY total_won DESC LIMIT $2',
            [cid, limit]
        );
        return result.rows;
    },

    async getActiveSlotGame(channelId) {
        const cid = String(channelId);
        const result = await pool.query('SELECT * FROM slot_active_game WHERE channel_id = $1::BIGINT', [cid]);
        return result.rows[0];
    },

    async startSlotGame(channelId, userId, username, betAmount, totalSpins) {
        const cid = String(channelId);
        await pool.query(
            `INSERT INTO slot_active_game (channel_id, user_id, username, bet_amount, total_spins)
             VALUES ($1::BIGINT, $2::BIGINT, $3, $4, $5)
             ON CONFLICT (channel_id) DO UPDATE SET
             user_id = $2::BIGINT, username = $3, bet_amount = $4, total_spins = $5,
             current_spin = 0, current_multiplier = 0, result = NULL,
             started_at = EXTRACT(EPOCH FROM NOW())`,
            [cid, String(userId), username, betAmount, totalSpins]
        );
    },

    async updateSlotGame(channelId, currentSpin, currentMultiplier, result = null) {
        const cid = String(channelId);
        await pool.query(
            `UPDATE slot_active_game SET current_spin = $2, current_multiplier = $3, result = $4 WHERE channel_id = $1::BIGINT`,
            [cid, currentSpin, currentMultiplier, result ? JSON.stringify(result) : null]
        );
    },

    async endSlotGame(channelId) {
        const cid = String(channelId);
        await pool.query('DELETE FROM slot_active_game WHERE channel_id = $1::BIGINT', [cid]);
    }
};
