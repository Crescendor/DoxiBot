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

// Store verifiers per state (supports multiple concurrent logins)
const pendingAuth = new Map();

// Clean up old entries (older than 10 minutes)
function cleanupPendingAuth() {
    const now = Date.now();
    for (const [state, data] of pendingAuth.entries()) {
        if (now - data.createdAt > 10 * 60 * 1000) {
            pendingAuth.delete(state);
        }
    }
}

export function getAuthorizationUrl() {
    cleanupPendingAuth();

    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store verifier by state
    pendingAuth.set(state, {
        verifier: codeVerifier,
        createdAt: Date.now()
    });

    console.log(`[OAuth] Created auth request with state: ${state.substring(0, 8)}...`);

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

export async function exchangeCodeForTokens(code, state) {
    // Get verifier for this state
    const authData = pendingAuth.get(state);
    if (!authData) {
        throw new Error('Invalid or expired state - please try logging in again');
    }

    const codeVerifier = authData.verifier;
    pendingAuth.delete(state); // Clean up after use

    console.log(`[OAuth] Exchanging code for state: ${state?.substring(0, 8)}...`);

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
