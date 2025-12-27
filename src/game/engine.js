import { db } from '../db/database.js';
import { config } from '../config.js';
import { getRandomMonster, getMonster } from '../data/monsters.js';
import { getItem, getShopItems, getPremiumShopItems } from '../data/items.js';
import { getQuest, getAvailableQuests } from '../data/quests.js';
import { calculateFishCatch, calculateFishingGold, calculateFishingDuration } from '../data/fishing.js';

const LEVEL_CAP = 99;

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}sn`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}dk ${seconds % 60}sn`;
    return `${Math.floor(seconds / 3600)}sa ${Math.floor((seconds % 3600) / 60)}dk`;
}

function expForLevel(level) {
    if (level >= LEVEL_CAP) return Infinity;
    return Math.floor(100 * Math.pow(1.15, level - 1) + level * 50);
}

function calculateDamage(attacker, defender) {
    const baseDamage = attacker.atk * (1 + (attacker.level || 1) * 0.05);
    const reduction = defender.def * 0.3;
    const damage = Math.max(1, Math.floor(baseDamage - reduction));
    const critChance = (attacker.luck || 5) / 100;
    const isCrit = Math.random() < critChance;
    return { damage: isCrit ? Math.floor(damage * 1.5) : damage, isCrit };
}

async function getEquippedStats(channelId, userId) {
    const inventory = await db.getInventory(channelId, userId);
    let bonusStats = { atk: 0, def: 0, luck: 0, maxHp: 0 };
    for (const inv of inventory) {
        if (inv.equipped) {
            const item = getItem(inv.item_id);
            if (item?.stats) {
                bonusStats.atk += item.stats.atk || 0;
                bonusStats.def += item.stats.def || 0;
                bonusStats.luck += item.stats.luck || 0;
                bonusStats.maxHp += item.stats.maxHp || 0;
            }
        }
    }
    return bonusStats;
}

const classNames = { warrior: 'Savaşçı', mage: 'Büyücü', archer: 'Okçu' };
const classEmojis = { warrior: '⚔️', mage: '🔮', archer: '🏹' };

async function getMonsterDrops(channelId, monsterId) {
    const override = await db.getMonsterDropOverride(channelId, monsterId);
    if (override) return override;
    const monster = getMonster(monsterId);
    return monster?.drops || [];
}

// Game command handlers (async for PostgreSQL)
export const gameCommands = {
    async kayit(channelId, userId, username, args) {
        const existing = await db.getCharacter(channelId, userId);
        if (existing) return `⚠️ @${username}, zaten bir karakterin var! !profil`;

        let charClass = 'warrior';
        if (args[0]) {
            const classArg = args[0].toLowerCase();
            if (['warrior', 'mage', 'archer', 'savaşçı', 'büyücü', 'okçu'].includes(classArg)) {
                if (classArg === 'savaşçı') charClass = 'warrior';
                else if (classArg === 'büyücü') charClass = 'mage';
                else if (classArg === 'okçu') charClass = 'archer';
                else charClass = classArg;
            }
        }

        const char = await db.createCharacter(channelId, userId, username, charClass);
        await db.addItem(channelId, userId, 'hp_potion_small', 3);
        await db.addItem(channelId, userId, 'fishing_rod_basic', 1);

        return `🎮 Hoş geldin @${username}! ${classEmojis[charClass]} ${classNames[charClass]} | HP:${char.hp} ATK:${char.atk} DEF:${char.def}`;
    },

    async profil(channelId, userId, username) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ @${username}, önce !kayit ile karakter oluştur!`;

        const bonusStats = await getEquippedStats(channelId, userId);
        let expNeeded = char.level >= LEVEL_CAP ? 'MAX' : expForLevel(char.level + 1);
        const progress = char.level >= LEVEL_CAP ? 10 : Math.min(10, Math.floor(char.exp / expNeeded * 10));
        const expBar = '█'.repeat(progress) + '░'.repeat(10 - progress);

        return `📊 @${username} | ${classEmojis[char.class]} ${classNames[char.class]}\n⭐ Lv.${char.level}/${LEVEL_CAP} [${expBar}] ${char.exp}/${expNeeded}\n❤️ ${char.hp}/${char.max_hp + bonusStats.maxHp} | ⚔️ ${char.atk + bonusStats.atk} | 🛡️ ${char.def + bonusStats.def} | 🍀 ${char.luck + bonusStats.luck}\n💰 ${char.gold} | 💎 ${char.doxigem || 0} | 💀 ${char.total_kills || 0}`;
    },

    async av(channelId, userId, username) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ @${username}, önce !kayit ile karakter oluştur!`;

        const cooldown = await db.getCooldown(channelId, userId, 'hunt');
        if (cooldown > 0) return `⏳ @${username}, ${formatTime(cooldown)} bekle!`;

        const existingBattle = await db.getBattle(channelId, userId);
        if (existingBattle) {
            const monster = getMonster(existingBattle.monster_id);
            return `⚔️ @${username}, zaten ${monster?.name || 'canavar'} ile savaşıyorsun! !saldir`;
        }

        const monster = getRandomMonster(char.level);
        await db.startBattle(channelId, userId, monster.id, monster.hp);
        await db.setCooldown(channelId, userId, 'hunt', config.game.huntCooldown);

        return `🎯 @${username} ${monster.emoji} ${monster.name} ile karşılaştı!\nLv.${monster.minLevel} | HP:${monster.hp} | ATK:${monster.atk} | !saldir`;
    },

    async saldir(channelId, userId, username) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ @${username}, önce !kayit!`;

        const battle = await db.getBattle(channelId, userId);
        if (!battle) return `❌ @${username}, savaşacak canavar yok! !av`;

        const cooldown = await db.getCooldown(channelId, userId, 'attack');
        if (cooldown > 0) return `⏳ ${formatTime(cooldown)} bekle!`;

        const monster = getMonster(battle.monster_id);
        if (!monster) { await db.endBattle(channelId, userId); return `❌ Canavar bulunamadı.`; }

        const bonusStats = await getEquippedStats(channelId, userId);
        const playerStats = {
            atk: char.atk + bonusStats.atk,
            def: char.def + bonusStats.def,
            luck: char.luck + bonusStats.luck,
            level: char.level
        };

        const playerAttack = calculateDamage(playerStats, monster);
        let newMonsterHp = battle.monster_hp - playerAttack.damage;

        let result = `⚔️ @${username} ${playerAttack.damage} hasar verdi!${playerAttack.isCrit ? ' 💥KRİTİK!' : ''}\n`;

        if (newMonsterHp <= 0) {
            await db.endBattle(channelId, userId);

            const baseGold = Math.floor(Math.random() * (monster.gold[1] - monster.gold[0] + 1)) + monster.gold[0];

            const drops = [];
            const monsterDrops = await getMonsterDrops(channelId, monster.id);
            for (const drop of monsterDrops) {
                if (Math.random() < drop.chance) {
                    await db.addItem(channelId, userId, drop.itemId, drop.quantity || 1);
                    const item = getItem(drop.itemId);
                    drops.push(item?.name || drop.itemId);
                }
            }

            let newExp = char.exp + monster.exp;
            let newLevel = char.level;
            let statGains = { maxHp: 0, atk: 0, def: 0, luck: 0 };

            while (newLevel < LEVEL_CAP && newExp >= expForLevel(newLevel + 1)) {
                newExp -= expForLevel(newLevel + 1);
                newLevel++;
                statGains.maxHp += 15; statGains.atk += 3; statGains.def += 2; statGains.luck += 1;
            }

            const updates = {
                gold: char.gold + baseGold,
                exp: newExp,
                level: newLevel,
                total_kills: (char.total_kills || 0) + 1
            };

            if (statGains.maxHp > 0) {
                updates.max_hp = char.max_hp + statGains.maxHp;
                updates.hp = Math.min(char.hp + 30, updates.max_hp);
                updates.atk = char.atk + statGains.atk;
                updates.def = char.def + statGains.def;
                updates.luck = char.luck + statGains.luck;
            }

            await db.updateCharacter(channelId, userId, updates);

            let levelUpMsg = newLevel > char.level ? `\n🎉 SEVİYE: Lv.${newLevel}!${newLevel === LEVEL_CAP ? ' 👑MAX!' : ''}` : '';
            return `🏆 ${monster.name} yenildi!\n💰+${baseGold} | ⭐+${monster.exp} EXP${drops.length > 0 ? `\n🎁 ${drops.join(', ')}` : ''}${levelUpMsg}`;
        }

        await db.updateBattleHp(channelId, userId, newMonsterHp);
        const monsterAttack = calculateDamage(monster, playerStats);
        let newPlayerHp = char.hp - monsterAttack.damage;

        result += `${monster.emoji} ${monsterAttack.damage} hasar verdi!${monsterAttack.isCrit ? ' 💥' : ''}\n`;

        if (newPlayerHp <= 0) {
            await db.endBattle(channelId, userId);
            const goldLoss = Math.floor(char.gold * 0.1);
            await db.updateCharacter(channelId, userId, { hp: Math.floor(char.max_hp * 0.5), gold: Math.max(0, char.gold - goldLoss) });
            result += `💀 Yenildin! -${goldLoss}💰`;
        } else {
            await db.updateCharacter(channelId, userId, { hp: newPlayerHp });
            result += `❤️ ${newPlayerHp}/${char.max_hp + bonusStats.maxHp} | ${monster.emoji} ${newMonsterHp}/${battle.monster_max_hp}`;
        }

        await db.setCooldown(channelId, userId, 'attack', config.game.attackCooldown);
        return result;
    },

    async kac(channelId, userId, username) {
        const battle = await db.getBattle(channelId, userId);
        if (!battle) return `❌ Kaçacak savaş yok!`;
        await db.endBattle(channelId, userId);
        const monster = getMonster(battle.monster_id);
        return `🏃 @${username} ${monster?.name || 'canavardan'} kaçtı!`;
    },

    async balik(channelId, userId, username) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ @${username}, önce !kayit!`;

        const fishing = await db.getFishing(channelId, userId);
        if (fishing) {
            if (fishing.completed) {
                const rod = getItem(fishing.rod_id);
                const fishCaught = calculateFishCatch(char.level, rod?.stats?.fishBonus || 0);
                const goldEarned = calculateFishingGold(char.level);

                const fish = getItem(fishCaught);
                await db.addItem(channelId, userId, fishCaught);
                await db.updateCharacter(channelId, userId, { gold: char.gold + goldEarned });
                await db.endFishing(channelId, userId);

                return `🎣 @${username} ${fish?.name || fishCaught} tuttu! +${goldEarned}💰`;
            } else {
                return `🎣 @${username}, ${formatTime(fishing.remaining)} kaldı!`;
            }
        }

        const inventory = await db.getInventory(channelId, userId);
        const rod = inventory.find(inv => getItem(inv.item_id)?.type === 'fishing');
        if (!rod) return `❌ @${username}, oltan yok! !dukkan`;

        const rodItem = getItem(rod.item_id);
        const duration = calculateFishingDuration(rodItem?.stats?.fishSpeed || 0);
        await db.startFishing(channelId, userId, rod.item_id, duration);

        return `🎣 @${username} balık tutmaya başladı! (${rodItem?.name}) Süre: ${formatTime(duration)}`;
    },

    async envanter(channelId, userId, username) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ @${username}, önce !kayit!`;

        const inventory = await db.getInventory(channelId, userId);
        if (inventory.length === 0) return `🎒 @${username}'in envanteri boş!`;

        const itemList = inventory.slice(0, 8).map(inv => {
            const item = getItem(inv.item_id);
            return `${item?.name || inv.item_id} x${inv.quantity}${inv.equipped ? '✓' : ''}`;
        }).join(' | ');

        return `🎒 @${username}: ${itemList}${inventory.length > 8 ? ` (+${inventory.length - 8})` : ''}`;
    },

    async dukkan(channelId, userId, username) {
        const char = await db.getCharacter(channelId, userId);
        const level = char?.level || 1;
        const shopItems = getShopItems(level);
        const itemList = shopItems.slice(0, 5).map(item => `${item.name} ${item.price}💰`).join(' | ');
        return `🏪 Dükkan (Lv.${level}): ${itemList}\n!satin [isim] | !pdukkan (💎)`;
    },

    async pdukkan(channelId, userId, username) {
        const premiumItems = getPremiumShopItems();
        const itemList = premiumItems.slice(0, 5).map(item => `${item.name} ${item.price}💎`).join(' | ');
        return `💎 Premium: ${itemList}\n!satin [isim]`;
    },

    async satin(channelId, userId, username, args) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ !kayit`;
        if (!args[0]) return `❌ !satin [isim]`;

        const searchTerm = args.join(' ').toLowerCase();
        const premiumItems = getPremiumShopItems();
        const premiumItem = premiumItems.find(i => i.name.toLowerCase().includes(searchTerm));

        if (premiumItem) {
            if ((char.doxigem || 0) < premiumItem.price) return `❌ Yetersiz DoxiGem!`;
            await db.updateCharacter(channelId, userId, { doxigem: (char.doxigem || 0) - premiumItem.price });
            await db.addItem(channelId, userId, premiumItem.id);
            return `✅ @${username} ${premiumItem.name} aldı! (-${premiumItem.price}💎)`;
        }

        const shopItems = getShopItems(char.level);
        const item = shopItems.find(i => i.name.toLowerCase().includes(searchTerm));
        if (!item) return `❌ "${searchTerm}" yok!`;
        if (char.gold < item.price) return `❌ Yetersiz altın!`;

        await db.updateCharacter(channelId, userId, { gold: char.gold - item.price });
        await db.addItem(channelId, userId, item.id);
        return `✅ @${username} ${item.name} aldı! (-${item.price}💰)`;
    },

    async sat(channelId, userId, username, args) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ !kayit`;
        if (!args[0]) return `❌ !sat [isim]`;

        const searchTerm = args.join(' ').toLowerCase();
        const inventory = await db.getInventory(channelId, userId);
        const invItem = inventory.find(inv => {
            const item = getItem(inv.item_id);
            return item && item.name.toLowerCase().includes(searchTerm);
        });

        if (!invItem) return `❌ "${searchTerm}" yok!`;

        const item = getItem(invItem.item_id);
        if (!item.sellPrice) return `❌ Satılamaz!`;

        await db.removeItem(channelId, userId, invItem.item_id);
        await db.updateCharacter(channelId, userId, { gold: char.gold + item.sellPrice });
        return `✅ @${username} ${item.name} sattı! (+${item.sellPrice}💰)`;
    },

    async kusak(channelId, userId, username, args) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ !kayit`;
        if (!args[0]) return `❌ !kusak [isim]`;

        const searchTerm = args.join(' ').toLowerCase();
        const inventory = await db.getInventory(channelId, userId);
        const invItem = inventory.find(inv => {
            const item = getItem(inv.item_id);
            return item && item.name.toLowerCase().includes(searchTerm);
        });

        if (!invItem) return `❌ "${searchTerm}" yok!`;

        const item = getItem(invItem.item_id);
        if (!['weapon', 'armor', 'accessory'].includes(item.type)) return `❌ Kuşanılamaz!`;

        for (const inv of inventory) {
            const i = getItem(inv.item_id);
            if (i?.type === item.type && inv.equipped) await db.equipItem(channelId, userId, inv.item_id, false);
        }

        await db.equipItem(channelId, userId, invItem.item_id, true);
        return `✅ @${username} ${item.name} kuşandı!`;
    },

    async kullan(channelId, userId, username, args) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ !kayit`;
        if (!args[0]) return `❌ !kullan [isim]`;

        const searchTerm = args.join(' ').toLowerCase();
        const inventory = await db.getInventory(channelId, userId);
        const invItem = inventory.find(inv => {
            const item = getItem(inv.item_id);
            return item && ['consumable', 'premium'].includes(item.type) && item.name.toLowerCase().includes(searchTerm);
        });

        if (!invItem) return `❌ "${searchTerm}" yok!`;

        const item = getItem(invItem.item_id);
        await db.removeItem(channelId, userId, invItem.item_id);

        const bonusStats = await getEquippedStats(channelId, userId);
        let effectMsg = '';

        if (item.effect.hp) {
            const newHp = Math.min(char.hp + item.effect.hp, char.max_hp + bonusStats.maxHp);
            await db.updateCharacter(channelId, userId, { hp: newHp });
            effectMsg = `❤️+${item.effect.hp}`;
        } else if (item.effect.fullHeal) {
            await db.updateCharacter(channelId, userId, { hp: char.max_hp + bonusStats.maxHp });
            effectMsg = `❤️ Tam HP!`;
        }

        return `✨ @${username} ${item.name} kullandı! ${effectMsg}`;
    },

    async gorev(channelId, userId, username, args) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ !kayit`;

        const activeQuests = await db.getActiveQuests(channelId, userId);
        const completedQuests = await db.getCompletedQuests(channelId, userId);

        if (args[0] === 'al' && args[1]) {
            const searchTerm = args.slice(1).join(' ').toLowerCase();
            const available = getAvailableQuests(char.level, completedQuests);
            const quest = available.find(q => q.name.toLowerCase().includes(searchTerm));
            if (!quest) return `❌ "${searchTerm}" yok!`;

            const expiresAt = quest.duration > 0 ? Math.floor(Date.now() / 1000) + quest.duration : null;
            await db.startQuest(channelId, userId, quest.id, expiresAt);
            return `✅ "${quest.name}" alındı!`;
        }

        if (activeQuests.length === 0) {
            const available = getAvailableQuests(char.level, completedQuests);
            return `📋 Görev yok. Mevcut: ${available.slice(0, 4).map(q => q.name).join(', ')}\n!gorev al [isim]`;
        }

        const questList = activeQuests.slice(0, 4).map(aq => {
            const quest = getQuest(aq.quest_id);
            return quest ? `${quest.name} (${aq.progress}/${quest.objective.count})` : null;
        }).filter(Boolean).join(' | ');

        return `📋 @${username}: ${questList}`;
    },

    async gunluk(channelId, userId, username) {
        const char = await db.getCharacter(channelId, userId);
        if (!char) return `❌ !kayit`;

        const cooldown = await db.getCooldown(channelId, userId, 'daily');
        if (cooldown > 0) return `⏳ ${formatTime(cooldown)} bekle!`;

        const goldReward = 100 + char.level * 20;
        const expReward = 50 + char.level * 10;

        const bonusStats = await getEquippedStats(channelId, userId);
        await db.updateCharacter(channelId, userId, {
            gold: char.gold + goldReward,
            exp: char.exp + expReward,
            hp: char.max_hp + bonusStats.maxHp
        });

        await db.setCooldown(channelId, userId, 'daily', config.game.dailyCooldown);
        return `🎁 @${username} +${goldReward}💰 +${expReward}EXP ❤️Tam HP!`;
    },

    async siralama(channelId, userId, username) {
        const leaderboard = await db.getLeaderboard(channelId, 5);
        if (leaderboard.length === 0) return `📊 Henüz oyuncu yok!`;

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const list = leaderboard.map((p, i) =>
            `${medals[i]} ${p.username} Lv.${p.level}`
        ).join(' | ');

        return `🏆 ${list}`;
    },

    async yardim(channelId, userId, username) {
        return `📖 !kayit !profil !av !saldir !balik !gorev !dukkan !pdukkan !gunluk !siralama`;
    }
};

// Process command for a specific channel
export async function processCommand(channelId, message) {
    const { content, sender } = message;
    if (!content.startsWith('!')) return null;

    const parts = content.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check if command is enabled for this channel
    const cmdSettings = await db.getChannelCommand(channelId, command);
    if (cmdSettings && cmdSettings.enabled === 0) return null;

    const aliases = {
        'avlan': 'av', 'hunt': 'av', 'attack': 'saldir', 'saldır': 'saldir',
        'flee': 'kac', 'kaç': 'kac', 'fish': 'balik', 'balık': 'balik',
        'profile': 'profil', 'inv': 'envanter', 'inventory': 'envanter',
        'shop': 'dukkan', 'dükkan': 'dukkan', 'buy': 'satin', 'satın': 'satin',
        'sell': 'sat', 'equip': 'kusak', 'kuşan': 'kusak', 'use': 'kullan',
        'quest': 'gorev', 'görev': 'gorev', 'daily': 'gunluk', 'günlük': 'gunluk',
        'top': 'siralama', 'lb': 'siralama', 'leaderboard': 'siralama',
        'help': 'yardim', 'yardım': 'yardim', 'register': 'kayit', 'kayıt': 'kayit',
        'premium': 'pdukkan', 'pshop': 'pdukkan'
    };

    const actualCommand = aliases[command] || command;
    const handler = gameCommands[actualCommand];
    if (!handler) return null;

    try {
        const response = await handler(channelId, sender.user_id, sender.username, args);
        await db.logChat(channelId, sender.user_id, sender.username, content, response);
        return response;
    } catch (error) {
        console.error(`Command error (${command}):`, error);
        return `❌ Hata: ${error.message}`;
    }
}
