// Item definitions for DoxiRPG - Extended Edition (100+ items)
// Organized by categories

export const items = {
    // ========== CONSUMABLES - HP Potions ==========
    hp_potion_small: {
        id: 'hp_potion_small', name: '🧪 Küçük Can İksiri', type: 'consumable',
        effect: { hp: 50 }, price: 25, sellPrice: 10, rarity: 'common',
        description: '+50 HP iyileştirir', shopTier: 1, canSellInShop: true
    },
    hp_potion_medium: {
        id: 'hp_potion_medium', name: '🧪 Orta Can İksiri', type: 'consumable',
        effect: { hp: 150 }, price: 75, sellPrice: 30, rarity: 'common',
        description: '+150 HP iyileştirir', shopTier: 2, canSellInShop: true
    },
    hp_potion_large: {
        id: 'hp_potion_large', name: '🧪 Büyük Can İksiri', type: 'consumable',
        effect: { hp: 400 }, price: 200, sellPrice: 80, rarity: 'uncommon',
        description: '+400 HP iyileştirir', shopTier: 3, canSellInShop: true
    },
    hp_potion_mega: {
        id: 'hp_potion_mega', name: '🧪 Dev Can İksiri', type: 'consumable',
        effect: { hp: 1000 }, price: 500, sellPrice: 200, rarity: 'rare',
        description: '+1000 HP iyileştirir', shopTier: 4, canSellInShop: true
    },
    hp_potion_divine: {
        id: 'hp_potion_divine', name: '✨ İlahi Can İksiri', type: 'consumable',
        effect: { hp: 3000 }, price: 1500, sellPrice: 600, rarity: 'epic',
        description: '+3000 HP iyileştirir', shopTier: 5, canSellInShop: true
    },
    full_restore: {
        id: 'full_restore', name: '💎 Tam İyileşme', type: 'consumable',
        effect: { fullHeal: true }, price: 5000, sellPrice: 2000, rarity: 'legendary',
        description: 'HP\'yi tamamen doldurur', shopTier: 6, canSellInShop: false
    },

    // ========== CONSUMABLES - Buff Scrolls ==========
    atk_scroll: {
        id: 'atk_scroll', name: '📜 Güç Parşömeni', type: 'consumable',
        effect: { tempAtk: 20, duration: 300 }, price: 100, sellPrice: 40, rarity: 'uncommon',
        description: '+20 ATK (5 dakika)', shopTier: 2, canSellInShop: true
    },
    def_scroll: {
        id: 'def_scroll', name: '📜 Savunma Parşömeni', type: 'consumable',
        effect: { tempDef: 15, duration: 300 }, price: 100, sellPrice: 40, rarity: 'uncommon',
        description: '+15 DEF (5 dakika)', shopTier: 2, canSellInShop: true
    },
    luck_scroll: {
        id: 'luck_scroll', name: '📜 Şans Parşömeni', type: 'consumable',
        effect: { tempLuck: 25, duration: 300 }, price: 150, sellPrice: 60, rarity: 'uncommon',
        description: '+25 LUCK (5 dakika)', shopTier: 2, canSellInShop: true
    },
    exp_scroll: {
        id: 'exp_scroll', name: '📜 Deneyim Parşömeni', type: 'consumable',
        effect: { expBoost: 1.5, duration: 600 }, price: 500, sellPrice: 200, rarity: 'rare',
        description: '1.5x EXP (10 dakika)', shopTier: 4, canSellInShop: true
    },
    gold_scroll: {
        id: 'gold_scroll', name: '📜 Altın Parşömeni', type: 'consumable',
        effect: { goldBoost: 1.5, duration: 600 }, price: 500, sellPrice: 200, rarity: 'rare',
        description: '1.5x Altın (10 dakika)', shopTier: 4, canSellInShop: true
    },

    // ========== PREMIUM SPEED ITEMS ==========
    speed_hunt: {
        id: 'speed_hunt', name: '⚡ Hızlı Av Tokeni', type: 'premium',
        effect: { reduceCooldown: 'hunt', reduction: 0.5 }, price: 100, sellPrice: 0, rarity: 'rare',
        description: 'Av cooldown\'unu yarıya indirir (1 kullanım)', shopTier: 0, canSellInShop: false, premiumShop: true
    },
    speed_attack: {
        id: 'speed_attack', name: '⚡ Hızlı Saldırı Tokeni', type: 'premium',
        effect: { reduceCooldown: 'attack', reduction: 0.5 }, price: 50, sellPrice: 0, rarity: 'uncommon',
        description: 'Saldırı cooldown\'unu yarıya indirir (1 kullanım)', shopTier: 0, canSellInShop: false, premiumShop: true
    },
    speed_fish: {
        id: 'speed_fish', name: '⚡ Hızlı Balıkçılık Tokeni', type: 'premium',
        effect: { reduceCooldown: 'fish', reduction: 0.5 }, price: 200, sellPrice: 0, rarity: 'rare',
        description: 'Balıkçılık süresini yarıya indirir (1 kullanım)', shopTier: 0, canSellInShop: false, premiumShop: true
    },
    speed_quest: {
        id: 'speed_quest', name: '⚡ Hızlı Görev Tokeni', type: 'premium',
        effect: { reduceCooldown: 'quest', reduction: 0.5 }, price: 300, sellPrice: 0, rarity: 'epic',
        description: 'Görev süresini yarıya indirir (1 kullanım)', shopTier: 0, canSellInShop: false, premiumShop: true
    },
    instant_heal: {
        id: 'instant_heal', name: '💫 Anında İyileşme', type: 'premium',
        effect: { fullHeal: true, instant: true }, price: 500, sellPrice: 0, rarity: 'epic',
        description: 'Anında tam HP', shopTier: 0, canSellInShop: false, premiumShop: true
    },
    double_drop: {
        id: 'double_drop', name: '🎁 Çift Düşüş Tokeni', type: 'premium',
        effect: { doubleDrop: true, duration: 1800 }, price: 800, sellPrice: 0, rarity: 'legendary',
        description: '2x loot şansı (30 dakika)', shopTier: 0, canSellInShop: false, premiumShop: true
    },

    // ========== WEAPONS - Tier 1 (Lv 1-15) ==========
    rusty_dagger: {
        id: 'rusty_dagger', name: '🗡️ Paslı Hançer', type: 'weapon',
        stats: { atk: 5 }, reqLevel: 1, price: 50, sellPrice: 20, rarity: 'common',
        description: '+5 ATK', shopTier: 1, canSellInShop: true
    },
    wooden_sword: {
        id: 'wooden_sword', name: '🗡️ Tahta Kılıç', type: 'weapon',
        stats: { atk: 8 }, reqLevel: 1, price: 80, sellPrice: 32, rarity: 'common',
        description: '+8 ATK', shopTier: 1, canSellInShop: true
    },
    iron_sword: {
        id: 'iron_sword', name: '⚔️ Demir Kılıç', type: 'weapon',
        stats: { atk: 15 }, reqLevel: 5, price: 200, sellPrice: 80, rarity: 'common',
        description: '+15 ATK', shopTier: 1, canSellInShop: true
    },
    steel_blade: {
        id: 'steel_blade', name: '⚔️ Çelik Kılıç', type: 'weapon',
        stats: { atk: 25 }, reqLevel: 10, price: 400, sellPrice: 160, rarity: 'uncommon',
        description: '+25 ATK', shopTier: 2, canSellInShop: true
    },
    skeleton_sword: {
        id: 'skeleton_sword', name: '💀 İskelet Kılıcı', type: 'weapon',
        stats: { atk: 30, luck: 5 }, reqLevel: 12, price: 600, sellPrice: 240, rarity: 'uncommon',
        description: '+30 ATK, +5 LUCK', shopTier: 0, canSellInShop: false
    },

    // ========== WEAPONS - Tier 2 (Lv 15-30) ==========
    orc_axe: {
        id: 'orc_axe', name: '🪓 Ork Baltası', type: 'weapon',
        stats: { atk: 45 }, reqLevel: 15, price: 800, sellPrice: 320, rarity: 'uncommon',
        description: '+45 ATK', shopTier: 0, canSellInShop: false
    },
    troll_club: {
        id: 'troll_club', name: '🏏 Trol Sopası', type: 'weapon',
        stats: { atk: 55, def: 10 }, reqLevel: 18, price: 1200, sellPrice: 480, rarity: 'rare',
        description: '+55 ATK, +10 DEF', shopTier: 0, canSellInShop: false
    },
    fire_sword: {
        id: 'fire_sword', name: '🔥 Ateş Kılıcı', type: 'weapon',
        stats: { atk: 70, luck: 10 }, reqLevel: 22, price: 2000, sellPrice: 800, rarity: 'rare',
        description: '+70 ATK, +10 LUCK', shopTier: 0, canSellInShop: false
    },
    shadow_blade: {
        id: 'shadow_blade', name: '🌑 Gölge Kılıcı', type: 'weapon',
        stats: { atk: 85, luck: 15 }, reqLevel: 28, price: 3500, sellPrice: 1400, rarity: 'epic',
        description: '+85 ATK, +15 LUCK', shopTier: 0, canSellInShop: false
    },

    // ========== WEAPONS - Tier 3 (Lv 30-50) ==========
    vampiric_blade: {
        id: 'vampiric_blade', name: '🩸 Vampirik Kılıç', type: 'weapon',
        stats: { atk: 100, lifesteal: 5 }, reqLevel: 35, price: 5000, sellPrice: 2000, rarity: 'epic',
        description: '+100 ATK, Hasar\'ın %5\'i HP', shopTier: 0, canSellInShop: false
    },
    death_staff: {
        id: 'death_staff', name: '💀 Ölüm Asası', type: 'weapon',
        stats: { atk: 120, luck: 20 }, reqLevel: 40, price: 7500, sellPrice: 3000, rarity: 'epic',
        description: '+120 ATK, +20 LUCK', shopTier: 0, canSellInShop: false
    },
    demonic_sword: {
        id: 'demonic_sword', name: '😈 Şeytani Kılıç', type: 'weapon',
        stats: { atk: 150, def: -20, luck: 25 }, reqLevel: 46, price: 12000, sellPrice: 4800, rarity: 'legendary',
        description: '+150 ATK, -20 DEF, +25 LUCK', shopTier: 0, canSellInShop: false
    },

    // ========== WEAPONS - Tier 4 (Lv 50-70) ==========
    legendary_sword: {
        id: 'legendary_sword', name: '✨ Efsanevi Kılıç', type: 'weapon',
        stats: { atk: 180, def: 30, luck: 30 }, reqLevel: 55, price: 20000, sellPrice: 8000, rarity: 'legendary',
        description: '+180 ATK, +30 DEF, +30 LUCK', shopTier: 0, canSellInShop: false
    },
    dragonslayer: {
        id: 'dragonslayer', name: '🐉 Ejderha Katili', type: 'weapon',
        stats: { atk: 220, def: 40 }, reqLevel: 60, price: 35000, sellPrice: 14000, rarity: 'legendary',
        description: '+220 ATK, +40 DEF', shopTier: 0, canSellInShop: false
    },
    chrono_staff: {
        id: 'chrono_staff', name: '⏰ Zaman Asası', type: 'weapon',
        stats: { atk: 250, luck: 50 }, reqLevel: 70, price: 50000, sellPrice: 20000, rarity: 'mythic',
        description: '+250 ATK, +50 LUCK', shopTier: 0, canSellInShop: false
    },

    // ========== WEAPONS - Tier 5 (Lv 70-99) ==========
    void_blade: {
        id: 'void_blade', name: '🌌 Boşluk Kılıcı', type: 'weapon',
        stats: { atk: 300, def: 50, luck: 40 }, reqLevel: 75, price: 75000, sellPrice: 30000, rarity: 'mythic',
        description: '+300 ATK, +50 DEF, +40 LUCK', shopTier: 0, canSellInShop: false
    },
    soul_reaver: {
        id: 'soul_reaver', name: '👻 Ruh Avcısı', type: 'weapon',
        stats: { atk: 350, lifesteal: 10 }, reqLevel: 80, price: 100000, sellPrice: 40000, rarity: 'mythic',
        description: '+350 ATK, Hasar\'ın %10\'u HP', shopTier: 0, canSellInShop: false
    },
    chaos_blade: {
        id: 'chaos_blade', name: '💜 Kaos Kılıcı', type: 'weapon',
        stats: { atk: 400, luck: 60 }, reqLevel: 85, price: 150000, sellPrice: 60000, rarity: 'mythic',
        description: '+400 ATK, +60 LUCK', shopTier: 0, canSellInShop: false
    },
    reality_breaker: {
        id: 'reality_breaker', name: '♾️ Gerçeklik Kırıcı', type: 'weapon',
        stats: { atk: 500, def: 80, luck: 80 }, reqLevel: 90, price: 250000, sellPrice: 100000, rarity: 'divine',
        description: '+500 ATK, +80 DEF, +80 LUCK', shopTier: 0, canSellInShop: false
    },
    god_slayer_blade: {
        id: 'god_slayer_blade', name: '⚔️ Tanrı Katili', type: 'weapon',
        stats: { atk: 600, def: 100, luck: 100, lifesteal: 15 }, reqLevel: 95, price: 500000, sellPrice: 200000, rarity: 'divine',
        description: '+600 ATK, +100 DEF/LUCK, %15 Lifesteal', shopTier: 0, canSellInShop: false
    },
    world_breaker: {
        id: 'world_breaker', name: '💀 Dünya Yıkıcı', type: 'weapon',
        stats: { atk: 800, def: 150, luck: 150, lifesteal: 20 }, reqLevel: 99, price: 1000000, sellPrice: 400000, rarity: 'divine',
        description: 'En güçlü silah', shopTier: 0, canSellInShop: false
    },

    // ========== ARMOR - Tier 1-2 ==========
    leather_armor: {
        id: 'leather_armor', name: '🦺 Deri Zırh', type: 'armor',
        stats: { def: 10, maxHp: 50 }, reqLevel: 1, price: 150, sellPrice: 60, rarity: 'common',
        description: '+10 DEF, +50 Max HP', shopTier: 1, canSellInShop: true
    },
    iron_armor: {
        id: 'iron_armor', name: '🛡️ Demir Zırh', type: 'armor',
        stats: { def: 25, maxHp: 150 }, reqLevel: 10, price: 500, sellPrice: 200, rarity: 'uncommon',
        description: '+25 DEF, +150 Max HP', shopTier: 2, canSellInShop: true
    },
    steel_armor: {
        id: 'steel_armor', name: '🛡️ Çelik Zırh', type: 'armor',
        stats: { def: 40, maxHp: 300 }, reqLevel: 20, price: 1200, sellPrice: 480, rarity: 'uncommon',
        description: '+40 DEF, +300 Max HP', shopTier: 3, canSellInShop: true
    },
    giants_belt: {
        id: 'giants_belt', name: '🦸 Dev Kemeri', type: 'armor',
        stats: { def: 20, maxHp: 500 }, reqLevel: 17, price: 1000, sellPrice: 400, rarity: 'rare',
        description: '+20 DEF, +500 Max HP', shopTier: 0, canSellInShop: false
    },

    // ========== ARMOR - Tier 3-4 ==========
    dragon_armor: {
        id: 'dragon_armor', name: '🐉 Ejderha Zırhı', type: 'armor',
        stats: { def: 60, maxHp: 600 }, reqLevel: 30, price: 3000, sellPrice: 1200, rarity: 'rare',
        description: '+60 DEF, +600 Max HP', shopTier: 0, canSellInShop: false
    },
    shadow_cloak: {
        id: 'shadow_cloak', name: '🌑 Gölge Pelerini', type: 'armor',
        stats: { def: 40, luck: 30, maxHp: 400 }, reqLevel: 35, price: 4000, sellPrice: 1600, rarity: 'epic',
        description: '+40 DEF, +30 LUCK, +400 Max HP', shopTier: 0, canSellInShop: false
    },
    cloak_of_shadows: {
        id: 'cloak_of_shadows', name: '🌑 Gölgeler Pelerini', type: 'armor',
        stats: { def: 80, luck: 50, maxHp: 800 }, reqLevel: 50, price: 15000, sellPrice: 6000, rarity: 'legendary',
        description: '+80 DEF, +50 LUCK, +800 Max HP', shopTier: 0, canSellInShop: false
    },
    colossus_armor: {
        id: 'colossus_armor', name: '🗿 Kolos Zırhı', type: 'armor',
        stats: { def: 120, maxHp: 1500 }, reqLevel: 60, price: 30000, sellPrice: 12000, rarity: 'legendary',
        description: '+120 DEF, +1500 Max HP', shopTier: 0, canSellInShop: false
    },

    // ========== ARMOR - Tier 5 ==========
    guardian_shield: {
        id: 'guardian_shield', name: '🛡️ Muhafız Kalkanı', type: 'armor',
        stats: { def: 180, maxHp: 2000 }, reqLevel: 75, price: 60000, sellPrice: 24000, rarity: 'mythic',
        description: '+180 DEF, +2000 Max HP', shopTier: 0, canSellInShop: false
    },
    genesis_armor: {
        id: 'genesis_armor', name: '✨ Yaratılış Zırhı', type: 'armor',
        stats: { def: 250, maxHp: 5000, luck: 100 }, reqLevel: 90, price: 200000, sellPrice: 80000, rarity: 'divine',
        description: '+250 DEF, +5000 Max HP, +100 LUCK', shopTier: 0, canSellInShop: false
    },

    // ========== ACCESSORIES ==========
    lucky_charm: {
        id: 'lucky_charm', name: '🍀 Şans Tılsımı', type: 'accessory',
        stats: { luck: 15 }, reqLevel: 5, price: 300, sellPrice: 120, rarity: 'uncommon',
        description: '+15 LUCK', shopTier: 2, canSellInShop: true
    },
    gold_ring: {
        id: 'gold_ring', name: '💍 Altın Yüzük', type: 'accessory',
        stats: { luck: 25, goldBonus: 10 }, reqLevel: 15, price: 800, sellPrice: 320, rarity: 'rare',
        description: '+25 LUCK, +10% Altın', shopTier: 0, canSellInShop: false
    },
    blood_ruby: {
        id: 'blood_ruby', name: '💎 Kan Yakutu', type: 'accessory',
        stats: { atk: 30, lifesteal: 3 }, reqLevel: 35, price: 5000, sellPrice: 2000, rarity: 'epic',
        description: '+30 ATK, %3 Lifesteal', shopTier: 0, canSellInShop: false
    },
    ouroboros_ring: {
        id: 'ouroboros_ring', name: '🐍 Ouroboros Yüzüğü', type: 'accessory',
        stats: { maxHp: 1000, def: 50, regen: 10 }, reqLevel: 60, price: 25000, sellPrice: 10000, rarity: 'legendary',
        description: '+1000 Max HP, +50 DEF, +10 HP/sn', shopTier: 0, canSellInShop: false
    },
    divine_halo: {
        id: 'divine_halo', name: '😇 İlahi Hale', type: 'accessory',
        stats: { atk: 80, def: 80, luck: 80, maxHp: 800 }, reqLevel: 75, price: 80000, sellPrice: 32000, rarity: 'mythic',
        description: '+80 tüm statlar, +800 Max HP', shopTier: 0, canSellInShop: false
    },
    immortal_crown: {
        id: 'immortal_crown', name: '👑 Ölümsüz Tacı', type: 'accessory',
        stats: { atk: 150, def: 150, luck: 150, maxHp: 3000 }, reqLevel: 95, price: 300000, sellPrice: 120000, rarity: 'divine',
        description: '+150 tüm statlar, +3000 Max HP', shopTier: 0, canSellInShop: false
    },
    emperors_crown: {
        id: 'emperors_crown', name: '👑 İmparator Tacı', type: 'accessory',
        stats: { atk: 200, def: 200, luck: 200, maxHp: 5000, goldBonus: 50 }, reqLevel: 99, price: 500000, sellPrice: 200000, rarity: 'divine',
        description: 'En güçlü aksesuar', shopTier: 0, canSellInShop: false
    },

    // ========== FISHING ITEMS ==========
    fishing_rod_basic: {
        id: 'fishing_rod_basic', name: '🎣 Basit Olta', type: 'fishing',
        stats: { fishBonus: 0 }, reqLevel: 1, price: 100, sellPrice: 40, rarity: 'common',
        description: 'Standart balıkçılık', shopTier: 1, canSellInShop: true
    },
    fishing_rod_advanced: {
        id: 'fishing_rod_advanced', name: '🎣 Gelişmiş Olta', type: 'fishing',
        stats: { fishBonus: 20 }, reqLevel: 15, price: 500, sellPrice: 200, rarity: 'uncommon',
        description: '+20% daha iyi balık', shopTier: 2, canSellInShop: true
    },
    fishing_rod_pro: {
        id: 'fishing_rod_pro', name: '🎣 Profesyonel Olta', type: 'fishing',
        stats: { fishBonus: 50 }, reqLevel: 30, price: 2000, sellPrice: 800, rarity: 'rare',
        description: '+50% daha iyi balık', shopTier: 3, canSellInShop: true
    },
    fishing_rod_master: {
        id: 'fishing_rod_master', name: '🎣 Usta Olta', type: 'fishing',
        stats: { fishBonus: 100, fishSpeed: 20 }, reqLevel: 50, price: 10000, sellPrice: 4000, rarity: 'epic',
        description: '+100% balık, -20% süre', shopTier: 4, canSellInShop: true
    },
    fishing_rod_legendary: {
        id: 'fishing_rod_legendary', name: '🎣 Efsanevi Olta', type: 'fishing',
        stats: { fishBonus: 200, fishSpeed: 40 }, reqLevel: 75, price: 50000, sellPrice: 20000, rarity: 'legendary',
        description: '+200% balık, -40% süre', shopTier: 0, canSellInShop: false
    },

    // ========== FISH (Caught from fishing) ==========
    small_fish: {
        id: 'small_fish', name: '🐟 Küçük Balık', type: 'fish',
        price: 0, sellPrice: 10, rarity: 'common',
        description: 'Satılabilir', shopTier: 0, canSellInShop: false
    },
    medium_fish: {
        id: 'medium_fish', name: '🐠 Orta Balık', type: 'fish',
        price: 0, sellPrice: 30, rarity: 'common',
        description: 'Satılabilir', shopTier: 0, canSellInShop: false
    },
    large_fish: {
        id: 'large_fish', name: '🐡 Büyük Balık', type: 'fish',
        price: 0, sellPrice: 75, rarity: 'uncommon',
        description: 'Satılabilir', shopTier: 0, canSellInShop: false
    },
    rare_fish: {
        id: 'rare_fish', name: '🦈 Nadir Balık', type: 'fish',
        price: 0, sellPrice: 200, rarity: 'rare',
        description: 'Değerli balık', shopTier: 0, canSellInShop: false
    },
    golden_fish: {
        id: 'golden_fish', name: '✨ Altın Balık', type: 'fish',
        price: 0, sellPrice: 500, rarity: 'epic',
        description: 'Çok değerli', shopTier: 0, canSellInShop: false
    },
    legendary_fish: {
        id: 'legendary_fish', name: '🐲 Efsanevi Balık', type: 'fish',
        price: 0, sellPrice: 2000, rarity: 'legendary',
        description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false
    },
    treasure_chest: {
        id: 'treasure_chest', name: '📦 Hazine Sandığı', type: 'fish',
        price: 0, sellPrice: 5000, rarity: 'mythic',
        description: 'Balıkçılıktan nadir bulunur', shopTier: 0, canSellInShop: false
    },

    // ========== MATERIALS (Monster drops) ==========
    slime_gel: { id: 'slime_gel', name: '💚 Slime Jeli', type: 'material', price: 0, sellPrice: 5, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    goblin_ear: { id: 'goblin_ear', name: '👂 Goblin Kulağı', type: 'material', price: 0, sellPrice: 8, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    rat_tail: { id: 'rat_tail', name: '🐀 Sıçan Kuyruğu', type: 'material', price: 0, sellPrice: 5, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    cheese: { id: 'cheese', name: '🧀 Peynir', type: 'material', price: 0, sellPrice: 3, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    bat_wing: { id: 'bat_wing', name: '🦇 Yarasa Kanadı', type: 'material', price: 0, sellPrice: 8, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    echo_stone: { id: 'echo_stone', name: '🔮 Yankı Taşı', type: 'material', price: 0, sellPrice: 25, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    wolf_fang: { id: 'wolf_fang', name: '🦷 Kurt Dişi', type: 'material', price: 0, sellPrice: 12, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    wolf_pelt: { id: 'wolf_pelt', name: '🐾 Kurt Postu', type: 'material', price: 0, sellPrice: 15, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    spider_silk: { id: 'spider_silk', name: '🕸️ Örümcek İpeği', type: 'material', price: 0, sellPrice: 15, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    poison_gland: { id: 'poison_gland', name: '☠️ Zehir Bezi', type: 'material', price: 0, sellPrice: 30, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    boar_tusk: { id: 'boar_tusk', name: '🐗 Domuz Dişi', type: 'material', price: 0, sellPrice: 20, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    raw_meat: { id: 'raw_meat', name: '🥩 Çiğ Et', type: 'material', price: 0, sellPrice: 10, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    snake_venom: { id: 'snake_venom', name: '🐍 Yılan Zehiri', type: 'material', price: 0, sellPrice: 25, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    snake_skin: { id: 'snake_skin', name: '🐍 Yılan Derisi', type: 'material', price: 0, sellPrice: 20, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    bone: { id: 'bone', name: '🦴 Kemik', type: 'material', price: 0, sellPrice: 10, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    rotten_flesh: { id: 'rotten_flesh', name: '🧟 Çürük Et', type: 'material', price: 0, sellPrice: 8, rarity: 'common', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    zombie_heart: { id: 'zombie_heart', name: '💜 Zombi Kalbi', type: 'material', price: 0, sellPrice: 40, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    ectoplasm: { id: 'ectoplasm', name: '👻 Ektoplazma', type: 'material', price: 0, sellPrice: 35, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    ghost_essence: { id: 'ghost_essence', name: '👻 Hayalet Özü', type: 'material', price: 0, sellPrice: 50, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    orc_tusk: { id: 'orc_tusk', name: '🦷 Ork Dişi', type: 'material', price: 0, sellPrice: 30, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    harpy_feather: { id: 'harpy_feather', name: '🪶 Harpi Tüyü', type: 'material', price: 0, sellPrice: 40, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    wind_crystal: { id: 'wind_crystal', name: '💎 Rüzgar Kristali', type: 'material', price: 0, sellPrice: 80, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    troll_blood: { id: 'troll_blood', name: '🩸 Trol Kanı', type: 'material', price: 0, sellPrice: 50, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    ogre_tooth: { id: 'ogre_tooth', name: '🦷 Ogre Dişi', type: 'material', price: 0, sellPrice: 45, rarity: 'uncommon', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    stone_core: { id: 'stone_core', name: '🗿 Taş Çekirdeği', type: 'material', price: 0, sellPrice: 60, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    golem_heart: { id: 'golem_heart', name: '💎 Golem Kalbi', type: 'material', price: 0, sellPrice: 150, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    dragon_scale: { id: 'dragon_scale', name: '🐲 Ejderha Pulu', type: 'material', price: 0, sellPrice: 100, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    dragon_claw: { id: 'dragon_claw', name: '🐉 Ejderha Pençesi', type: 'material', price: 0, sellPrice: 120, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    minotaur_horn: { id: 'minotaur_horn', name: '🐂 Minotaur Boynuzu', type: 'material', price: 0, sellPrice: 100, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    labyrinth_key: { id: 'labyrinth_key', name: '🔑 Labirent Anahtarı', type: 'material', price: 0, sellPrice: 200, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    dark_essence: { id: 'dark_essence', name: '🌑 Karanlık Öz', type: 'material', price: 0, sellPrice: 150, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    banshee_tear: { id: 'banshee_tear', name: '💧 Banshee Gözyaşı', type: 'material', price: 0, sellPrice: 120, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    wailing_crystal: { id: 'wailing_crystal', name: '💎 Feryat Kristali', type: 'material', price: 0, sellPrice: 200, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    werewolf_claw: { id: 'werewolf_claw', name: '🐺 Kurtadam Pençesi', type: 'material', price: 0, sellPrice: 150, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    moon_shard: { id: 'moon_shard', name: '🌙 Ay Parçası', type: 'material', price: 0, sellPrice: 250, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    vampire_fang: { id: 'vampire_fang', name: '🧛 Vampir Dişi', type: 'material', price: 0, sellPrice: 180, rarity: 'rare', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    lich_phylactery: { id: 'lich_phylactery', name: '💀 Lich Phylactery', type: 'material', price: 0, sellPrice: 500, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    fire_essence: { id: 'fire_essence', name: '🔥 Ateş Özü', type: 'material', price: 0, sellPrice: 200, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    ice_essence: { id: 'ice_essence', name: '❄️ Buz Özü', type: 'material', price: 0, sellPrice: 200, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    thunder_essence: { id: 'thunder_essence', name: '⚡ Yıldırım Özü', type: 'material', price: 0, sellPrice: 200, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    inferno_crystal: { id: 'inferno_crystal', name: '🔥 Cehennem Kristali', type: 'material', price: 0, sellPrice: 400, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    frost_crystal: { id: 'frost_crystal', name: '❄️ Buz Kristali', type: 'material', price: 0, sellPrice: 400, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    storm_crystal: { id: 'storm_crystal', name: '⚡ Fırtına Kristali', type: 'material', price: 0, sellPrice: 400, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    demon_horn: { id: 'demon_horn', name: '😈 İblis Boynuzu', type: 'material', price: 0, sellPrice: 250, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    hellfire_gem: { id: 'hellfire_gem', name: '🔥 Cehennem Taşı', type: 'material', price: 0, sellPrice: 350, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    basilisk_eye: { id: 'basilisk_eye', name: '👁️ Basilisk Gözü', type: 'material', price: 0, sellPrice: 300, rarity: 'epic', description: 'Satılabilir', shopTier: 0, canSellInShop: false },
    petrify_scale: { id: 'petrify_scale', name: '🦎 Taşlaştırma Pulu', type: 'material', price: 0, sellPrice: 400, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    hydra_head: { id: 'hydra_head', name: '🐉 Hidra Başı', type: 'material', price: 0, sellPrice: 500, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    regeneration_orb: { id: 'regeneration_orb', name: '💚 Yenilenme Küresi', type: 'material', price: 0, sellPrice: 800, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    phoenix_feather: { id: 'phoenix_feather', name: '🔥 Anka Tüyü', type: 'material', price: 0, sellPrice: 600, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    rebirth_flame: { id: 'rebirth_flame', name: '🔥 Yeniden Doğuş Alevi', type: 'material', price: 0, sellPrice: 1000, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    kraken_tentacle: { id: 'kraken_tentacle', name: '🐙 Kraken Dokunaç', type: 'material', price: 0, sellPrice: 500, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    sea_crown: { id: 'sea_crown', name: '👑 Deniz Tacı', type: 'material', price: 0, sellPrice: 2000, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    void_essence: { id: 'void_essence', name: '🌌 Boşluk Özü', type: 'material', price: 0, sellPrice: 600, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    dimension_shard: { id: 'dimension_shard', name: '💎 Boyut Parçası', type: 'material', price: 0, sellPrice: 1000, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    dragon_knight_helm: { id: 'dragon_knight_helm', name: '⚔️ Ejderha Şövalye Miğferi', type: 'material', price: 0, sellPrice: 1500, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    ancient_scale: { id: 'ancient_scale', name: '✨ Kadim Pul', type: 'material', price: 0, sellPrice: 800, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    dragon_heart: { id: 'dragon_heart', name: '❤️‍🔥 Ejderha Kalbi', type: 'material', price: 0, sellPrice: 2000, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    shadow_core: { id: 'shadow_core', name: '🌑 Gölge Çekirdeği', type: 'material', price: 0, sellPrice: 1000, rarity: 'legendary', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    titan_bone: { id: 'titan_bone', name: '🦴 Titan Kemiği', type: 'material', price: 0, sellPrice: 1200, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    angelic_feather: { id: 'angelic_feather', name: '🪶 Melek Tüyü', type: 'material', price: 0, sellPrice: 1500, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    demonic_core: { id: 'demonic_core', name: '😈 İblis Çekirdeği', type: 'material', price: 0, sellPrice: 2000, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    hellfire_crown: { id: 'hellfire_crown', name: '👑 Cehennem Tacı', type: 'material', price: 0, sellPrice: 5000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    cosmic_essence: { id: 'cosmic_essence', name: '🌌 Kozmik Öz', type: 'material', price: 0, sellPrice: 3000, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    elder_seal: { id: 'elder_seal', name: '📜 Kadim Mühür', type: 'material', price: 0, sellPrice: 5000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    world_scale: { id: 'world_scale', name: '🌍 Dünya Pulu', type: 'material', price: 0, sellPrice: 4000, rarity: 'mythic', description: 'Çok değerli', shopTier: 0, canSellInShop: false },
    chaos_scale: { id: 'chaos_scale', name: '💜 Kaos Pulu', type: 'material', price: 0, sellPrice: 5000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    time_crystal: { id: 'time_crystal', name: '⏰ Zaman Kristali', type: 'material', price: 0, sellPrice: 6000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    celestial_ore: { id: 'celestial_ore', name: '✨ Göksel Maden', type: 'material', price: 0, sellPrice: 8000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    void_heart: { id: 'void_heart', name: '🌌 Boşluk Kalbi', type: 'material', price: 0, sellPrice: 15000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    primordial_essence: { id: 'primordial_essence', name: '🦖 İlkel Öz', type: 'material', price: 0, sellPrice: 20000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    genesis_stone: { id: 'genesis_stone', name: '💎 Yaratılış Taşı', type: 'material', price: 0, sellPrice: 30000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    divinity_shard: { id: 'divinity_shard', name: '✨ İlahilik Parçası', type: 'material', price: 0, sellPrice: 40000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    eternity_fragment: { id: 'eternity_fragment', name: '♾️ Sonsuzluk Parçası', type: 'material', price: 0, sellPrice: 50000, rarity: 'divine', description: 'Efsanevi değerde', shopTier: 0, canSellInShop: false },
    apocalypse_core: { id: 'apocalypse_core', name: '💀 Kıyamet Çekirdeği', type: 'material', price: 0, sellPrice: 100000, rarity: 'divine', description: 'Eşsiz değer', shopTier: 0, canSellInShop: false }
};

// Regular shop items (random selection from allowed items)
export function getShopItems(playerLevel) {
    const tier = Math.min(6, Math.floor(playerLevel / 15) + 1);
    const available = Object.values(items).filter(item =>
        item.canSellInShop && item.shopTier > 0 && item.shopTier <= tier
    );

    // Shuffle and pick 8 random items
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
}

// Premium shop items
export function getPremiumShopItems() {
    return Object.values(items).filter(item => item.premiumShop);
}

// Get item by ID
export function getItem(itemId) {
    return items[itemId] || null;
}

// Get all items (for admin)
export function getAllItems() {
    return Object.values(items);
}

// Rarity colors for display
export const rarityColors = {
    common: '#9CA3AF',
    uncommon: '#22C55E',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#F59E0B',
    mythic: '#EF4444',
    divine: '#FFD700'
};
