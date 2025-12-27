// Fishing system for DoxiRPG
// 20 minute fishing duration with various catches

export const fishingConfig = {
    baseDuration: 1200, // 20 minutes in seconds
    minLevel: 1,

    // Fish pools by rarity with weights
    fishPool: [
        { itemId: 'small_fish', weight: 40, minLevel: 1 },
        { itemId: 'medium_fish', weight: 30, minLevel: 1 },
        { itemId: 'large_fish', weight: 15, minLevel: 5 },
        { itemId: 'rare_fish', weight: 8, minLevel: 15 },
        { itemId: 'golden_fish', weight: 4, minLevel: 30 },
        { itemId: 'legendary_fish', weight: 2, minLevel: 50 },
        { itemId: 'treasure_chest', weight: 1, minLevel: 70 }
    ],

    // Bonus items that can be caught
    bonusPool: [
        { itemId: 'hp_potion_small', weight: 20, minLevel: 1 },
        { itemId: 'hp_potion_medium', weight: 10, minLevel: 15 },
        { itemId: 'atk_scroll', weight: 5, minLevel: 20 },
        { itemId: 'gold_ring', weight: 2, minLevel: 30 },
        { itemId: 'exp_scroll', weight: 3, minLevel: 25 }
    ],

    // Gold rewards range
    goldReward: {
        min: 20,
        max: 100,
        levelMultiplier: 2 // Additional gold per level
    }
};

// Calculate fish catch based on player level and fishing rod
export function calculateFishCatch(playerLevel, fishingRodBonus = 0) {
    const availableFish = fishingConfig.fishPool.filter(f => f.minLevel <= playerLevel);

    // Apply fishing rod bonus to rare fish weights
    const adjustedPool = availableFish.map(f => ({
        ...f,
        weight: f.weight * (1 + fishingRodBonus / 100)
    }));

    const totalWeight = adjustedPool.reduce((sum, f) => sum + f.weight, 0);
    let random = Math.random() * totalWeight;

    for (const fish of adjustedPool) {
        random -= fish.weight;
        if (random <= 0) {
            return fish.itemId;
        }
    }

    return 'small_fish';
}

// Calculate bonus item from fishing
export function calculateBonusItem(playerLevel) {
    // 20% chance for bonus item
    if (Math.random() > 0.2) return null;

    const availableBonus = fishingConfig.bonusPool.filter(b => b.minLevel <= playerLevel);
    if (availableBonus.length === 0) return null;

    const totalWeight = availableBonus.reduce((sum, b) => sum + b.weight, 0);
    let random = Math.random() * totalWeight;

    for (const bonus of availableBonus) {
        random -= bonus.weight;
        if (random <= 0) {
            return bonus.itemId;
        }
    }

    return null;
}

// Calculate gold reward from fishing
export function calculateFishingGold(playerLevel) {
    const baseMin = fishingConfig.goldReward.min;
    const baseMax = fishingConfig.goldReward.max;
    const levelBonus = playerLevel * fishingConfig.goldReward.levelMultiplier;

    return Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin + levelBonus;
}

// Calculate fishing duration (with rod speed bonus)
export function calculateFishingDuration(rodSpeedBonus = 0) {
    const baseDuration = fishingConfig.baseDuration;
    const reduction = baseDuration * (rodSpeedBonus / 100);
    return Math.max(60, baseDuration - reduction); // Minimum 1 minute
}
