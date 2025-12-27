import { config } from '../config.js';

const KICK_API_BASE = 'https://api.kick.com/public/v1';

export const kickApi = {
    // Get current user with provided token
    async getCurrentUserWithToken(accessToken) {
        const response = await fetch(`${KICK_API_BASE}/users`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Kick API error: ${response.status}`);
        return response.json();
    },

    // Send message to a specific channel using their token
    async sendMessageToChannel(channelId, accessToken, content, replyTo = null) {
        const body = {
            broadcaster_user_id: parseInt(channelId),
            content,
            type: 'bot'
        };
        if (replyTo) body.reply_to_message_id = replyTo;

        console.log(`[Kick] Sending message to channel ${channelId}`);

        const response = await fetch(`${KICK_API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[Kick] Send message error: ${response.status} - ${text}`);
            throw new Error(`Kick API error: ${response.status} - ${text}`);
        }

        const result = await response.json();
        console.log(`[Kick] Message sent: ${result?.data?.message_id}`);
        return result;
    },

    // Subscribe to webhook events for a channel
    async subscribeToEvents(channelId, accessToken) {
        console.log(`[Kick] Subscribing to events for channel ${channelId}`);
        console.log(`[Kick] PUBLIC_URL: ${config.publicUrl}`);

        try {
            const response = await fetch(`${KICK_API_BASE}/events/subscriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    broadcaster_user_id: parseInt(channelId),
                    events: [
                        { name: 'chat.message.sent', version: 1 }
                    ],
                    method: 'webhook'
                })
            });

            const text = await response.text();
            console.log(`[Kick] Subscribe response: ${response.status} - ${text}`);

            if (!response.ok) {
                console.error(`[Kick] Failed to subscribe: ${response.status}`);
            } else {
                console.log('[Kick] Successfully subscribed to chat.message.sent');
            }

            return response.ok;
        } catch (e) {
            console.error(`[Kick] Subscribe error:`, e.message);
            return false;
        }
    },

    // Get current subscriptions
    async getSubscriptions(accessToken) {
        const response = await fetch(`${KICK_API_BASE}/events/subscriptions`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return response.json();
    }
};

