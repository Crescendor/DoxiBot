// Monster definitions for DoxiRPG - Extended Edition (Levels 1-99)
// Monsters organized by level tiers

export const monsters = {
    // ========== TIER 1: Levels 1-10 (Başlangıç) ==========
    slime: {
        id: 'slime',
        name: '🟢 Slime',
        emoji: '🟢',
        minLevel: 1,
        hp: 30,
        atk: 5,
        def: 2,
        exp: 15,
        gold: [5, 15],
        drops: [
            { itemId: 'slime_gel', chance: 0.5 },
            { itemId: 'hp_potion_small', chance: 0.2 }
        ]
    },
    goblin: {
        id: 'goblin',
        name: '👺 Goblin',
        emoji: '👺',
        minLevel: 1,
        hp: 40,
        atk: 8,
        def: 3,
        exp: 20,
        gold: [10, 25],
        drops: [
            { itemId: 'goblin_ear', chance: 0.4 },
            { itemId: 'rusty_dagger', chance: 0.1 }
        ]
    },
    rat: {
        id: 'rat',
        name: '🐀 Dev Sıçan',
        emoji: '🐀',
        minLevel: 1,
        hp: 25,
        atk: 6,
        def: 1,
        exp: 12,
        gold: [3, 10],
        drops: [
            { itemId: 'rat_tail', chance: 0.6 },
            { itemId: 'cheese', chance: 0.3 }
        ]
    },
    bat: {
        id: 'bat',
        name: '🦇 Yarasa',
        emoji: '🦇',
        minLevel: 2,
        hp: 35,
        atk: 9,
        def: 2,
        exp: 18,
        gold: [8, 18],
        drops: [
            { itemId: 'bat_wing', chance: 0.45 },
            { itemId: 'echo_stone', chance: 0.1 }
        ]
    },
    wolf: {
        id: 'wolf',
        name: '🐺 Kurt',
        emoji: '🐺',
        minLevel: 3,
        hp: 50,
        atk: 12,
        def: 4,
        exp: 30,
        gold: [15, 35],
        drops: [
            { itemId: 'wolf_fang', chance: 0.35 },
            { itemId: 'wolf_pelt', chance: 0.25 }
        ]
    },
    spider: {
        id: 'spider',
        name: '🕷️ Dev Örümcek',
        emoji: '🕷️',
        minLevel: 4,
        hp: 45,
        atk: 14,
        def: 3,
        exp: 28,
        gold: [12, 30],
        drops: [
            { itemId: 'spider_silk', chance: 0.5 },
            { itemId: 'poison_gland', chance: 0.2 }
        ]
    },
    boar: {
        id: 'boar',
        name: '🐗 Yaban Domuzu',
        emoji: '🐗',
        minLevel: 5,
        hp: 70,
        atk: 15,
        def: 8,
        exp: 40,
        gold: [20, 45],
        drops: [
            { itemId: 'boar_tusk', chance: 0.4 },
            { itemId: 'raw_meat', chance: 0.5 }
        ]
    },
    snake: {
        id: 'snake',
        name: '🐍 Zehirli Yılan',
        emoji: '🐍',
        minLevel: 6,
        hp: 55,
        atk: 18,
        def: 4,
        exp: 38,
        gold: [18, 40],
        drops: [
            { itemId: 'snake_venom', chance: 0.35 },
            { itemId: 'snake_skin', chance: 0.4 }
        ]
    },
    skeleton: {
        id: 'skeleton',
        name: '💀 İskelet',
        emoji: '💀',
        minLevel: 7,
        hp: 70,
        atk: 20,
        def: 6,
        exp: 50,
        gold: [25, 55],
        drops: [
            { itemId: 'bone', chance: 0.5 },
            { itemId: 'skeleton_sword', chance: 0.08 }
        ]
    },
    zombie: {
        id: 'zombie',
        name: '🧟 Zombi',
        emoji: '🧟',
        minLevel: 8,
        hp: 90,
        atk: 18,
        def: 10,
        exp: 55,
        gold: [30, 60],
        drops: [
            { itemId: 'rotten_flesh', chance: 0.6 },
            { itemId: 'zombie_heart', chance: 0.15 }
        ]
    },
    ghost: {
        id: 'ghost',
        name: '👻 Hayalet',
        emoji: '👻',
        minLevel: 9,
        hp: 60,
        atk: 25,
        def: 2,
        exp: 60,
        gold: [35, 65],
        drops: [
            { itemId: 'ectoplasm', chance: 0.4 },
            { itemId: 'ghost_essence', chance: 0.2 }
        ]
    },

    // ========== TIER 2: Levels 10-25 (Orta Seviye) ==========
    orc: {
        id: 'orc',
        name: '👹 Ork',
        emoji: '👹',
        minLevel: 10,
        hp: 120,
        atk: 28,
        def: 15,
        exp: 80,
        gold: [50, 100],
        drops: [
            { itemId: 'orc_tusk', chance: 0.3 },
            { itemId: 'orc_axe', chance: 0.05 }
        ]
    },
    harpy: {
        id: 'harpy',
        name: '🦅 Harpi',
        emoji: '🦅',
        minLevel: 12,
        hp: 100,
        atk: 35,
        def: 10,
        exp: 90,
        gold: [55, 110],
        drops: [
            { itemId: 'harpy_feather', chance: 0.45 },
            { itemId: 'wind_crystal', chance: 0.15 }
        ]
    },
    troll: {
        id: 'troll',
        name: '🧌 Trol',
        emoji: '🧌',
        minLevel: 15,
        hp: 180,
        atk: 35,
        def: 25,
        exp: 120,
        gold: [70, 140],
        drops: [
            { itemId: 'troll_blood', chance: 0.4 },
            { itemId: 'troll_club', chance: 0.08 }
        ]
    },
    ogre: {
        id: 'ogre',
        name: '👹 Ogre',
        emoji: '👹',
        minLevel: 17,
        hp: 220,
        atk: 40,
        def: 20,
        exp: 140,
        gold: [80, 160],
        drops: [
            { itemId: 'ogre_tooth', chance: 0.35 },
            { itemId: 'giants_belt', chance: 0.05 }
        ]
    },
    golem: {
        id: 'golem',
        name: '🗿 Taş Golem',
        emoji: '🗿',
        minLevel: 20,
        hp: 300,
        atk: 45,
        def: 40,
        exp: 180,
        gold: [100, 200],
        drops: [
            { itemId: 'stone_core', chance: 0.3 },
            { itemId: 'golem_heart', chance: 0.1 }
        ]
    },
    dragon_whelp: {
        id: 'dragon_whelp',
        name: '🐲 Yavru Ejderha',
        emoji: '🐲',
        minLevel: 22,
        hp: 250,
        atk: 50,
        def: 30,
        exp: 200,
        gold: [120, 240],
        drops: [
            { itemId: 'dragon_scale', chance: 0.25 },
            { itemId: 'fire_sword', chance: 0.02 }
        ]
    },
    minotaur: {
        id: 'minotaur',
        name: '🐂 Minotaur',
        emoji: '🐂',
        minLevel: 25,
        hp: 350,
        atk: 55,
        def: 35,
        exp: 250,
        gold: [150, 300],
        drops: [
            { itemId: 'minotaur_horn', chance: 0.3 },
            { itemId: 'labyrinth_key', chance: 0.08 }
        ]
    },

    // ========== TIER 3: Levels 25-40 (İleri Seviye) ==========
    dark_knight: {
        id: 'dark_knight',
        name: '⚔️ Kara Şövalye',
        emoji: '⚔️',
        minLevel: 28,
        hp: 400,
        atk: 60,
        def: 45,
        exp: 300,
        gold: [180, 360],
        drops: [
            { itemId: 'dark_essence', chance: 0.5 },
            { itemId: 'shadow_blade', chance: 0.03 }
        ]
    },
    banshee: {
        id: 'banshee',
        name: '👰 Banshee',
        emoji: '👰',
        minLevel: 30,
        hp: 320,
        atk: 70,
        def: 25,
        exp: 320,
        gold: [200, 400],
        drops: [
            { itemId: 'banshee_tear', chance: 0.35 },
            { itemId: 'wailing_crystal', chance: 0.1 }
        ]
    },
    werewolf: {
        id: 'werewolf',
        name: '🐺 Kurtadam',
        emoji: '🐺',
        minLevel: 32,
        hp: 450,
        atk: 75,
        def: 40,
        exp: 350,
        gold: [220, 440],
        drops: [
            { itemId: 'werewolf_claw', chance: 0.4 },
            { itemId: 'moon_shard', chance: 0.12 }
        ]
    },
    vampire: {
        id: 'vampire',
        name: '🧛 Vampir',
        emoji: '🧛',
        minLevel: 35,
        hp: 500,
        atk: 80,
        def: 35,
        exp: 400,
        gold: [250, 500],
        drops: [
            { itemId: 'vampire_fang', chance: 0.35 },
            { itemId: 'blood_ruby', chance: 0.1 },
            { itemId: 'vampiric_blade', chance: 0.02 }
        ]
    },
    lich: {
        id: 'lich',
        name: '💀 Lich',
        emoji: '💀',
        minLevel: 38,
        hp: 450,
        atk: 95,
        def: 30,
        exp: 450,
        gold: [280, 560],
        drops: [
            { itemId: 'lich_phylactery', chance: 0.2 },
            { itemId: 'death_staff', chance: 0.03 }
        ]
    },

    // ========== TIER 4: Levels 40-55 (Uzman Seviye) ==========
    fire_elemental: {
        id: 'fire_elemental',
        name: '🔥 Ateş Elementi',
        emoji: '🔥',
        minLevel: 40,
        hp: 550,
        atk: 100,
        def: 40,
        exp: 500,
        gold: [300, 600],
        drops: [
            { itemId: 'fire_essence', chance: 0.45 },
            { itemId: 'inferno_crystal', chance: 0.15 }
        ]
    },
    ice_elemental: {
        id: 'ice_elemental',
        name: '❄️ Buz Elementi',
        emoji: '❄️',
        minLevel: 42,
        hp: 580,
        atk: 95,
        def: 50,
        exp: 520,
        gold: [320, 640],
        drops: [
            { itemId: 'ice_essence', chance: 0.45 },
            { itemId: 'frost_crystal', chance: 0.15 }
        ]
    },
    thunder_elemental: {
        id: 'thunder_elemental',
        name: '⚡ Yıldırım Elementi',
        emoji: '⚡',
        minLevel: 44,
        hp: 520,
        atk: 110,
        def: 35,
        exp: 550,
        gold: [340, 680],
        drops: [
            { itemId: 'thunder_essence', chance: 0.45 },
            { itemId: 'storm_crystal', chance: 0.15 }
        ]
    },
    demon: {
        id: 'demon',
        name: '😈 İblis',
        emoji: '😈',
        minLevel: 46,
        hp: 650,
        atk: 105,
        def: 55,
        exp: 600,
        gold: [380, 760],
        drops: [
            { itemId: 'demon_horn', chance: 0.35 },
            { itemId: 'hellfire_gem', chance: 0.12 },
            { itemId: 'demonic_sword', chance: 0.02 }
        ]
    },
    basilisk: {
        id: 'basilisk',
        name: '🦎 Basilisk',
        emoji: '🦎',
        minLevel: 48,
        hp: 700,
        atk: 100,
        def: 65,
        exp: 650,
        gold: [400, 800],
        drops: [
            { itemId: 'basilisk_eye', chance: 0.3 },
            { itemId: 'petrify_scale', chance: 0.2 }
        ]
    },
    hydra: {
        id: 'hydra',
        name: '🐉 Hidra',
        emoji: '🐉',
        minLevel: 50,
        hp: 800,
        atk: 115,
        def: 60,
        exp: 750,
        gold: [450, 900],
        drops: [
            { itemId: 'hydra_head', chance: 0.25 },
            { itemId: 'regeneration_orb', chance: 0.1 }
        ]
    },
    phoenix: {
        id: 'phoenix',
        name: '🔥 Anka Kuşu',
        emoji: '🔥',
        minLevel: 52,
        hp: 750,
        atk: 125,
        def: 50,
        exp: 800,
        gold: [480, 960],
        drops: [
            { itemId: 'phoenix_feather', chance: 0.2 },
            { itemId: 'rebirth_flame', chance: 0.08 }
        ]
    },
    kraken: {
        id: 'kraken',
        name: '🐙 Kraken',
        emoji: '🐙',
        minLevel: 55,
        hp: 900,
        atk: 130,
        def: 70,
        exp: 900,
        gold: [550, 1100],
        drops: [
            { itemId: 'kraken_tentacle', chance: 0.3 },
            { itemId: 'sea_crown', chance: 0.05 }
        ]
    },

    // ========== TIER 5: Levels 55-70 (Usta Seviye) ==========
    void_walker: {
        id: 'void_walker',
        name: '🌑 Boşluk Gezgini',
        emoji: '🌑',
        minLevel: 58,
        hp: 950,
        atk: 140,
        def: 65,
        exp: 1000,
        gold: [600, 1200],
        drops: [
            { itemId: 'void_essence', chance: 0.35 },
            { itemId: 'dimension_shard', chance: 0.12 }
        ]
    },
    dragon_knight: {
        id: 'dragon_knight',
        name: '🐲 Ejderha Şövalyesi',
        emoji: '🐲',
        minLevel: 60,
        hp: 1100,
        atk: 150,
        def: 85,
        exp: 1100,
        gold: [700, 1400],
        drops: [
            { itemId: 'dragon_knight_helm', chance: 0.15 },
            { itemId: 'dragonslayer', chance: 0.02 }
        ]
    },
    ancient_dragon: {
        id: 'ancient_dragon',
        name: '🔥 Kadim Ejderha',
        emoji: '🔥',
        minLevel: 65,
        hp: 1500,
        atk: 180,
        def: 100,
        exp: 1500,
        gold: [1000, 2000],
        drops: [
            { itemId: 'ancient_scale', chance: 0.4 },
            { itemId: 'dragon_heart', chance: 0.1 },
            { itemId: 'legendary_sword', chance: 0.01 }
        ]
    },
    shadow_lord: {
        id: 'shadow_lord',
        name: '🌑 Gölge Lordu',
        emoji: '🌑',
        minLevel: 68,
        hp: 1400,
        atk: 200,
        def: 80,
        exp: 1600,
        gold: [1100, 2200],
        drops: [
            { itemId: 'shadow_core', chance: 0.3 },
            { itemId: 'cloak_of_shadows', chance: 0.05 }
        ]
    },
    titan: {
        id: 'titan',
        name: '🗿 Titan',
        emoji: '🗿',
        minLevel: 70,
        hp: 2000,
        atk: 190,
        def: 120,
        exp: 1800,
        gold: [1300, 2600],
        drops: [
            { itemId: 'titan_bone', chance: 0.35 },
            { itemId: 'colossus_armor', chance: 0.03 }
        ]
    },

    // ========== TIER 6: Levels 70-85 (Efsane Seviye) ==========
    archangel: {
        id: 'archangel',
        name: '👼 Başmelek',
        emoji: '👼',
        minLevel: 72,
        hp: 1800,
        atk: 220,
        def: 100,
        exp: 2000,
        gold: [1500, 3000],
        drops: [
            { itemId: 'angelic_feather', chance: 0.3 },
            { itemId: 'divine_halo', chance: 0.08 }
        ]
    },
    demon_lord: {
        id: 'demon_lord',
        name: '👿 İblis Lordu',
        emoji: '👿',
        minLevel: 75,
        hp: 2200,
        atk: 250,
        def: 110,
        exp: 2500,
        gold: [1800, 3600],
        drops: [
            { itemId: 'demonic_core', chance: 0.25 },
            { itemId: 'hellfire_crown', chance: 0.05 },
            { itemId: 'soul_reaver', chance: 0.01 }
        ]
    },
    elder_god: {
        id: 'elder_god',
        name: '🌌 Kadim Tanrı',
        emoji: '🌌',
        minLevel: 78,
        hp: 2500,
        atk: 280,
        def: 130,
        exp: 3000,
        gold: [2200, 4400],
        drops: [
            { itemId: 'cosmic_essence', chance: 0.2 },
            { itemId: 'elder_seal', chance: 0.08 }
        ]
    },
    world_serpent: {
        id: 'world_serpent',
        name: '🐍 Dünya Yılanı',
        emoji: '🐍',
        minLevel: 80,
        hp: 3000,
        atk: 300,
        def: 150,
        exp: 3500,
        gold: [2500, 5000],
        drops: [
            { itemId: 'world_scale', chance: 0.2 },
            { itemId: 'ouroboros_ring', chance: 0.03 }
        ]
    },
    chaos_dragon: {
        id: 'chaos_dragon',
        name: '💜 Kaos Ejderhası',
        emoji: '💜',
        minLevel: 83,
        hp: 3500,
        atk: 320,
        def: 140,
        exp: 4000,
        gold: [3000, 6000],
        drops: [
            { itemId: 'chaos_scale', chance: 0.25 },
            { itemId: 'chaos_blade', chance: 0.02 }
        ]
    },
    time_lord: {
        id: 'time_lord',
        name: '⏰ Zaman Lordu',
        emoji: '⏰',
        minLevel: 85,
        hp: 3200,
        atk: 350,
        def: 120,
        exp: 4500,
        gold: [3500, 7000],
        drops: [
            { itemId: 'time_crystal', chance: 0.2 },
            { itemId: 'chrono_staff', chance: 0.03 }
        ]
    },

    // ========== TIER 7: Levels 85-99 (Tanrısal Seviye) ==========
    celestial_guardian: {
        id: 'celestial_guardian',
        name: '✨ Göksel Muhafız',
        emoji: '✨',
        minLevel: 87,
        hp: 4000,
        atk: 380,
        def: 180,
        exp: 5000,
        gold: [4000, 8000],
        drops: [
            { itemId: 'celestial_ore', chance: 0.2 },
            { itemId: 'guardian_shield', chance: 0.05 }
        ]
    },
    void_emperor: {
        id: 'void_emperor',
        name: '🌌 Boşluk İmparatoru',
        emoji: '🌌',
        minLevel: 90,
        hp: 5000,
        atk: 420,
        def: 200,
        exp: 6000,
        gold: [5000, 10000],
        drops: [
            { itemId: 'void_heart', chance: 0.15 },
            { itemId: 'emperors_crown', chance: 0.03 },
            { itemId: 'reality_breaker', chance: 0.01 }
        ]
    },
    primordial_beast: {
        id: 'primordial_beast',
        name: '🦖 İlkel Canavar',
        emoji: '🦖',
        minLevel: 93,
        hp: 6000,
        atk: 450,
        def: 220,
        exp: 7500,
        gold: [6000, 12000],
        drops: [
            { itemId: 'primordial_essence', chance: 0.15 },
            { itemId: 'genesis_stone', chance: 0.05 }
        ]
    },
    god_slayer: {
        id: 'god_slayer',
        name: '⚔️ Tanrı Katili',
        emoji: '⚔️',
        minLevel: 95,
        hp: 7000,
        atk: 500,
        def: 250,
        exp: 9000,
        gold: [8000, 16000],
        drops: [
            { itemId: 'divinity_shard', chance: 0.12 },
            { itemId: 'god_slayer_blade', chance: 0.02 }
        ]
    },
    eternal_one: {
        id: 'eternal_one',
        name: '♾️ Ebedi Varlık',
        emoji: '♾️',
        minLevel: 97,
        hp: 8000,
        atk: 550,
        def: 280,
        exp: 12000,
        gold: [10000, 20000],
        drops: [
            { itemId: 'eternity_fragment', chance: 0.1 },
            { itemId: 'immortal_crown', chance: 0.03 }
        ]
    },
    world_ender: {
        id: 'world_ender',
        name: '💀 Dünya Yıkıcı',
        emoji: '💀',
        minLevel: 99,
        hp: 10000,
        atk: 600,
        def: 300,
        exp: 15000,
        gold: [15000, 30000],
        drops: [
            { itemId: 'apocalypse_core', chance: 0.1 },
            { itemId: 'world_breaker', chance: 0.01 },
            { itemId: 'genesis_armor', chance: 0.01 }
        ]
    }
};

// Get random monster appropriate for player level
export function getRandomMonster(playerLevel) {
    const available = Object.values(monsters).filter(m =>
        m.minLevel <= playerLevel + 3 && m.minLevel >= Math.max(1, playerLevel - 10)
    );

    if (available.length === 0) {
        // Fallback to any monster at or below player level
        const fallback = Object.values(monsters).filter(m => m.minLevel <= playerLevel + 3);
        if (fallback.length === 0) return monsters.slime;
        return fallback[Math.floor(Math.random() * fallback.length)];
    }

    // Weight towards appropriate level monsters
    const weighted = available.map(m => ({
        monster: m,
        weight: Math.max(1, 15 - Math.abs(playerLevel - m.minLevel))
    }));

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const w of weighted) {
        random -= w.weight;
        if (random <= 0) return w.monster;
    }

    return available[Math.floor(Math.random() * available.length)];
}

// Get monster by ID
export function getMonster(monsterId) {
    return monsters[monsterId] || null;
}

// Get all monsters (for admin)
export function getAllMonsters() {
    return Object.values(monsters);
}
