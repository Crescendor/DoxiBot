import { config } from '../config.js';
import crypto from 'crypto';

const KICK_AUTH_URL = 'https://id.kick.com/oauth/authorize';
const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';

// PKCE helpers
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Store verifier temporarily (in production, use session/redis)
let codeVerifier = generateCodeVerifier();

export function getAuthorizationUrl() {
    codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
        client_id: config.kickClientId,
        redirect_uri: config.kickRedirectUri,
        response_type: 'code',
        scope: 'user:read channel:read channel:write chat:read chat:write events:subscribe streamkey:read',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });

    return `${KICK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
    const response = await fetch(KICK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.kickClientId,
            client_secret: config.kickClientSecret,
            code,
            redirect_uri: config.kickRedirectUri,
            code_verifier: codeVerifier
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${text}`);
    }

    return response.json();
}

export async function refreshAccessToken(refreshToken) {
    const response = await fetch(KICK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: config.kickClientId,
            client_secret: config.kickClientSecret,
            refresh_token: refreshToken
        })
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    return response.json();
}
