// Custom Commands Processor
// Handles user-defined commands with variables

import { db } from '../db/database.js';

// Format time remaining
function formatTimeRemaining(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;

    if (diff <= 0) return 'Süre doldu!';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const parts = [];
    if (days > 0) parts.push(`${days} gün`);
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (seconds > 0 && days === 0) parts.push(`${seconds} saniye`);

    return parts.join(' ') || '0 saniye';
}

// Check if user is subscriber/mod/broadcaster
function isPrivileged(sender) {
    if (!sender) return false;

    // Check badges
    const badges = sender.badges || [];
    const hasSub = badges.some(b => b.type === 'subscriber' || b.type === 'sub');
    const hasMod = badges.some(b => b.type === 'moderator' || b.type === 'mod');
    const hasBroadcaster = badges.some(b => b.type === 'broadcaster' || b.type === 'owner');

    // Check identity if available
    const identity = sender.identity || {};

    return hasSub || hasMod || hasBroadcaster ||
        identity.is_subscriber || identity.is_moderator || identity.is_broadcaster;
}

// Parse and process variables in response
export async function processVariables(channelId, response, sender) {
    let result = response;

    // {bahset} - Mention user
    result = result.replace(/\{bahset\}/gi, `@${sender?.username || 'Kullanıcı'}`);

    // {kullanici} - Just username
    result = result.replace(/\{kullanici\}/gi, sender?.username || 'Kullanıcı');

    // {rastgele[x,y]} - Random number between x and y
    const randomMatches = [...result.matchAll(/\{rastgele\[(\d+),(\d+)\]\}/gi)];
    for (const match of randomMatches) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        const random = Math.floor(Math.random() * (max - min + 1)) + min;
        result = result.replace(match[0], random.toString());
    }

    // {havuz[x]} - Random from pool
    const poolMatches = [...result.matchAll(/\{havuz\[([^\]]+)\]\}/gi)];
    for (const match of poolMatches) {
        const poolName = match[1];
        const pool = await db.getPool(channelId, poolName);
        if (pool && pool.values) {
            const values = pool.values.split(',').map(v => v.trim()).filter(v => v);
            const randomValue = values[Math.floor(Math.random() * values.length)] || poolName;
            result = result.replace(match[0], randomValue);
        } else {
            result = result.replace(match[0], `[havuz "${poolName}" bulunamadı]`);
        }
    }

    // {sayaç[x]} - Counter
    const counterMatches = [...result.matchAll(/\{sayaç\[([^\]]+)\]\}/gi)];
    for (const match of counterMatches) {
        const counterName = match[1];
        const count = await db.incrementCounter(channelId, counterName);
        result = result.replace(match[0], count.toString());
    }

    // {sayac[x]} - Alternative spelling
    const counterMatches2 = [...result.matchAll(/\{sayac\[([^\]]+)\]\}/gi)];
    for (const match of counterMatches2) {
        const counterName = match[1];
        const count = await db.incrementCounter(channelId, counterName);
        result = result.replace(match[0], count.toString());
    }
    // {nekadarkaldi[date]} - Time remaining until date
    // Format: YYYY-MM-DD HH:mm or YYYY,MM,DD HH:mm
    const countdownMatches = [...result.matchAll(/\{nekadarkaldi\[([^\]]+)\]\}/gi)];
    for (const match of countdownMatches) {
        const dateStr = match[1].trim();
        let targetDate;

        // Try to parse various formats
        if (dateStr.includes(',')) {
            // Format: 2024,12,25 20:00
            const parts = dateStr.replace(' ', ',').split(',');
            targetDate = new Date(
                parseInt(parts[0]), // year
                parseInt(parts[1]) - 1, // month (0-indexed)
                parseInt(parts[2]), // day
                parseInt(parts[3]?.split(':')[0] || 0), // hour
                parseInt(parts[3]?.split(':')[1] || 0) // minute
            );
        } else {
            // Try standard parsing
            targetDate = new Date(dateStr);
        }

        if (!isNaN(targetDate.getTime())) {
            result = result.replace(match[0], formatTimeRemaining(targetDate));
        } else {
            result = result.replace(match[0], '[geçersiz tarih]');
        }
    }

    return result;
}

// Process a custom command
export async function processCustomCommand(channelId, command, message) {
    const cmd = await db.getCustomCommand(channelId, command);

    if (!cmd || !cmd.enabled) {
        return null;
    }

    const sender = message.sender;

    // Choose response based on priority:
    // 1. User specific response
    // 2. Subscriber/Mod response (if privileged)
    // 3. Default response

    let response = cmd.response;

    // Check user specific response first
    if (cmd.user_responses) {
        try {
            const userResponses = JSON.parse(cmd.user_responses || '[]');
            const username = sender.username.toLowerCase();
            const userResponse = userResponses.find(u => u.username.toLowerCase() === username);

            if (userResponse) {
                response = userResponse.response;
            } else if (cmd.sub_response && isPrivileged(sender)) {
                // If no user response, checks for sub response
                response = cmd.sub_response;
            }
        } catch (e) {
            console.error('Error parsing user_responses:', e);
            // Fallback to normal flow on error
            if (cmd.sub_response && isPrivileged(sender)) {
                response = cmd.sub_response;
            }
        }
    } else if (cmd.sub_response && isPrivileged(sender)) {
        response = cmd.sub_response;
    }

    // Process variables
    response = await processVariables(channelId, response, sender);

    // Increment use count
    await db.incrementCommandUse(channelId, command);

    return {
        response,
        reply_to_user: cmd.reply_to_user === 1,
        message_id: message.message_id
    };
}

// Process !öneri command
export async function processSuggestion(channelId, message) {
    const content = message.content;

    // Check if it's !öneri command
    if (!content.toLowerCase().startsWith('!öneri ') && !content.toLowerCase().startsWith('!oneri ')) {
        return null;
    }

    // Extract suggestion text
    const suggestionText = content.slice(content.indexOf(' ') + 1).trim();

    if (!suggestionText || suggestionText.length < 5) {
        return {
            response: '❌ Öneri en az 5 karakter olmalı! Örnek: !öneri Yayın saatlerini değiştir',
            reply_to_user: true
        };
    }

    if (suggestionText.length > 500) {
        return {
            response: '❌ Öneri en fazla 500 karakter olabilir!',
            reply_to_user: true
        };
    }

    const sender = message.sender;

    // Save suggestion
    await db.addSuggestion(channelId, sender?.user_id || 0, sender?.username || 'Anonim', suggestionText);

    return {
        response: `✅ Öneri kaydedildi! Teşekkürler @${sender?.username || 'Kullanıcı'}`,
        reply_to_user: true
    };
}
