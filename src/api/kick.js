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
        const body = { content, type: 'bot' };
        if (replyTo) body.reply_to_message_id = replyTo;

        const response = await fetch(`${KICK_API_BASE}/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Kick API error: ${response.status} - ${text}`);
        }
        return response.json();
    },

    // Subscribe to webhook events for a channel
    async subscribeToEvents(channelId, accessToken) {
        const webhookUrl = `${config.publicUrl}/webhook`;
        const events = ['chat.message.sent'];

        console.log(`[Kick] Subscribing to events for channel ${channelId}`);
        console.log(`[Kick] Webhook URL: ${webhookUrl}`);

        for (const event of events) {
            try {
                const response = await fetch(`${KICK_API_BASE}/events/subscriptions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event: event,
                        broadcaster_user_id: channelId,
                        method: 'webhook'
                    })
                });

                const text = await response.text();
                console.log(`[Kick] Subscribe ${event}: ${response.status} - ${text}`);

                if (!response.ok && response.status !== 409) { // 409 = already subscribed
                    console.error(`[Kick] Failed to subscribe to ${event}`);
                }
            } catch (e) {
                console.error(`[Kick] Subscribe error for ${event}:`, e.message);
            }
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

