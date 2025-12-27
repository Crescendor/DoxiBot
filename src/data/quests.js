// Quest definitions for DoxiRPG
// Timed quests with various objectives

export const quests = {
    // ========== DAILY QUESTS (Reset every 24h) ==========
    daily_hunt_5: {
        id: 'daily_hunt_5', name: '🎯 Günlük Avcı', type: 'daily',
        description: '5 canavar öldür',
        objective: { type: 'kill', count: 5 },
        duration: 86400, // 24 hours
        rewards: { gold: 100, exp: 50 },
        minLevel: 1
    },
    daily_hunt_15: {
        id: 'daily_hunt_15', name: '🎯 Usta Avcı', type: 'daily',
        description: '15 canavar öldür',
        objective: { type: 'kill', count: 15 },
        duration: 86400,
        rewards: { gold: 300, exp: 150, item: 'hp_potion_medium' },
        minLevel: 10
    },
    daily_gold_500: {
        id: 'daily_gold_500', name: '💰 Altın Toplayıcı', type: 'daily',
        description: '500 altın kazan',
        objective: { type: 'gold', count: 500 },
        duration: 86400,
        rewards: { gold: 200, exp: 75 },
        minLevel: 5
    },
    daily_fish_3: {
        id: 'daily_fish_3', name: '🎣 Balıkçı', type: 'daily',
        description: '3 kez balık tut',
        objective: { type: 'fish', count: 3 },
        duration: 86400,
        rewards: { gold: 150, exp: 60 },
        minLevel: 1
    },

    // ========== WEEKLY QUESTS (7 days) ==========
    weekly_hunt_50: {
        id: 'weekly_hunt_50', name: '⚔️ Haftalık Savaşçı', type: 'weekly',
        description: '50 canavar öldür',
        objective: { type: 'kill', count: 50 },
        duration: 604800, // 7 days
        rewards: { gold: 1000, exp: 500, item: 'exp_scroll' },
        minLevel: 10
    },
    weekly_boss_5: {
        id: 'weekly_boss_5', name: '👑 Boss Avcısı', type: 'weekly',
        description: '5 boss canavar öldür (Lv40+)',
        objective: { type: 'killBoss', count: 5 },
        duration: 604800,
        rewards: { gold: 3000, exp: 1500, item: 'gold_scroll' },
        minLevel: 40
    },
    weekly_gold_5000: {
        id: 'weekly_gold_5000', name: '💎 Hazine Avcısı', type: 'weekly',
        description: '5000 altın kazan',
        objective: { type: 'gold', count: 5000 },
        duration: 604800,
        rewards: { gold: 2000, exp: 1000 },
        minLevel: 15
    },
    weekly_fish_20: {
        id: 'weekly_fish_20', name: '🐟 Balık Ustası', type: 'weekly',
        description: '20 balık tut',
        objective: { type: 'fish', count: 20 },
        duration: 604800,
        rewards: { gold: 1500, exp: 750, item: 'fishing_rod_advanced' },
        minLevel: 10
    },

    // ========== TIMED QUESTS (Short duration) ==========
    speed_hunt_10: {
        id: 'speed_hunt_10', name: '⚡ Hızlı Av', type: 'timed',
        description: '1 saat içinde 10 canavar öldür',
        objective: { type: 'kill', count: 10 },
        duration: 3600, // 1 hour
        rewards: { gold: 500, exp: 250 },
        minLevel: 5
    },
    speed_hunt_25: {
        id: 'speed_hunt_25', name: '⚡ Yıldırım Avcı', type: 'timed',
        description: '2 saat içinde 25 canavar öldür',
        objective: { type: 'kill', count: 25 },
        duration: 7200, // 2 hours
        rewards: { gold: 1200, exp: 600, item: 'atk_scroll' },
        minLevel: 15
    },
    speed_gold_1000: {
        id: 'speed_gold_1000', name: '⚡ Hızlı Zenginlik', type: 'timed',
        description: '2 saat içinde 1000 altın kazan',
        objective: { type: 'gold', count: 1000 },
        duration: 7200,
        rewards: { gold: 500, exp: 300 },
        minLevel: 10
    },

    // ========== SPECIAL QUESTS (One-time, high reward) ==========
    reach_level_10: {
        id: 'reach_level_10', name: '🌟 Acemi Savaşçı', type: 'milestone',
        description: 'Seviye 10\'a ulaş',
        objective: { type: 'level', count: 10 },
        duration: 0, // No time limit
        rewards: { gold: 500, exp: 0, item: 'steel_blade' },
        minLevel: 1, oneTime: true
    },
    reach_level_25: {
        id: 'reach_level_25', name: '🌟 Deneyimli Savaşçı', type: 'milestone',
        description: 'Seviye 25\'e ulaş',
        objective: { type: 'level', count: 25 },
        duration: 0,
        rewards: { gold: 2000, exp: 0, item: 'dragon_armor' },
        minLevel: 1, oneTime: true
    },
    reach_level_50: {
        id: 'reach_level_50', name: '🌟 Usta Savaşçı', type: 'milestone',
        description: 'Seviye 50\'ye ulaş',
        objective: { type: 'level', count: 50 },
        duration: 0,
        rewards: { gold: 10000, exp: 0, item: 'legendary_sword' },
        minLevel: 1, oneTime: true
    },
    reach_level_75: {
        id: 'reach_level_75', name: '🌟 Efsane Savaşçı', type: 'milestone',
        description: 'Seviye 75\'e ulaş',
        objective: { type: 'level', count: 75 },
        duration: 0,
        rewards: { gold: 50000, exp: 0, item: 'void_blade' },
        minLevel: 1, oneTime: true
    },
    reach_level_99: {
        id: 'reach_level_99', name: '👑 Tanrısal Savaşçı', type: 'milestone',
        description: 'Seviye 99\'a ulaş (MAX)',
        objective: { type: 'level', count: 99 },
        duration: 0,
        rewards: { gold: 500000, exp: 0, item: 'world_breaker' },
        minLevel: 1, oneTime: true
    },
    first_legendary: {
        id: 'first_legendary', name: '✨ İlk Efsane', type: 'milestone',
        description: 'İlk legendary eşyanı al',
        objective: { type: 'getLegendary', count: 1 },
        duration: 0,
        rewards: { gold: 5000, exp: 2500 },
        minLevel: 1, oneTime: true
    },
    kill_100_monsters: {
        id: 'kill_100_monsters', name: '💀 100 Kurban', type: 'milestone',
        description: 'Toplam 100 canavar öldür',
        objective: { type: 'totalKills', count: 100 },
        duration: 0,
        rewards: { gold: 2000, exp: 1000 },
        minLevel: 1, oneTime: true
    },
    kill_1000_monsters: {
        id: 'kill_1000_monsters', name: '💀 1000 Kurban', type: 'milestone',
        description: 'Toplam 1000 canavar öldür',
        objective: { type: 'totalKills', count: 1000 },
        duration: 0,
        rewards: { gold: 20000, exp: 10000, item: 'double_drop' },
        minLevel: 1, oneTime: true
    }
};

// Get available quests for player level
export function getAvailableQuests(playerLevel, completedQuests = []) {
    return Object.values(quests).filter(quest => {
        if (quest.minLevel > playerLevel) return false;
        if (quest.oneTime && completedQuests.includes(quest.id)) return false;
        return true;
    });
}

// Get quest by ID
export function getQuest(questId) {
    return quests[questId] || null;
}

// Get all quests (for admin)
export function getAllQuests() {
    return Object.values(quests);
}
