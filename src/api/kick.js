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

    // Validate webhook signature (if needed)
    validateWebhookSignature(payload, signature, timestamp) {
        // TODO: Implement HMAC validation with KICK_WEBHOOK_SECRET
        return true;
    }
};
