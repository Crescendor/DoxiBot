import { config } from '../config.js';

const KICK_API_BASE = 'https://api.kick.com/public/v1';

export const kickApi = {
    // Refresh access token using refresh_token
    async refreshAccessToken(refreshToken) {
        console.log('[Kick] Refreshing access token...');
        try {
            const response = await fetch('https://id.kick.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    refresh_token: refreshToken
                })
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`[Kick] Token refresh failed: ${response.status} - ${text}`);
                return null;
            }

            const tokens = await response.json();
            console.log('[Kick] Token refreshed successfully');
            return tokens;
        } catch (e) {
            console.error('[Kick] Token refresh error:', e.message);
            return null;
        }
    },

    // Get current user with provided token
    async getCurrentUserWithToken(accessToken) {
        const response = await fetch(`${KICK_API_BASE}/users`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Kick API error: ${response.status}`);
        return response.json();
    },

    // Send message to a specific channel using their token
    // Now accepts db and channelId for auto-refresh
    async sendMessageToChannel(channelId, accessToken, content, replyTo = null, db = null, refreshToken = null) {
        const body = {
            broadcaster_user_id: parseInt(channelId),
            content,
            type: 'bot'
        };
        if (replyTo) body.reply_to_message_id = replyTo;

        console.log(`[Kick] Sending message to channel ${channelId}`);

        let response = await fetch(`${KICK_API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        // If 401 and we have refresh token, try to refresh
        if (response.status === 401 && refreshToken && db) {
            console.log('[Kick] Got 401, attempting token refresh...');
            const newTokens = await this.refreshAccessToken(refreshToken);

            if (newTokens && newTokens.access_token) {
                // Update tokens in database
                await db.updateChannelTokens(channelId, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in || 3600);
                console.log('[Kick] Tokens updated, retrying message...');

                // Retry with new token
                response = await fetch(`${KICK_API_BASE}/chat`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${newTokens.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
            }
        }

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

