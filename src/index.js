import { app } from './server.js';
import { config } from './config.js';
import { db } from './db/database.js';
import { kickApi } from './api/kick.js';
import open from 'open';

console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🎮  DoxiBot - Multi-Tenant Kick RPG Bot  🎮    ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

// Automatic token refresh for all channels
async function refreshAllTokens() {
    console.log('[TokenRefresh] Starting automatic token refresh...');
    try {
        const channels = await db.getAllChannels();
        let refreshed = 0;
        let failed = 0;

        for (const channel of channels) {
            if (!channel.refresh_token) {
                console.log(`[TokenRefresh] Channel ${channel.owner_username} has no refresh token, skipping`);
                continue;
            }

            try {
                const newTokens = await kickApi.refreshAccessToken(channel.refresh_token);
                if (newTokens && newTokens.access_token) {
                    await db.updateChannelTokens(
                        channel.channel_id,
                        newTokens.access_token,
                        newTokens.refresh_token || channel.refresh_token,
                        newTokens.expires_in || 3600
                    );
                    refreshed++;
                    console.log(`[TokenRefresh] ✅ ${channel.owner_username} token refreshed`);
                } else {
                    failed++;
                    console.log(`[TokenRefresh] ❌ ${channel.owner_username} refresh failed`);
                }
            } catch (e) {
                failed++;
                console.error(`[TokenRefresh] ❌ ${channel.owner_username} error:`, e.message);
            }

            // Rate limiting - wait 1 second between each refresh
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`[TokenRefresh] Complete: ${refreshed} refreshed, ${failed} failed`);
    } catch (e) {
        console.error('[TokenRefresh] Error:', e.message);
    }
}

async function start() {
    try {
        // Initialize PostgreSQL database
        await db.init();

        app.listen(config.port, async () => {
            console.log(`✅ Sunucu başlatıldı: http://localhost:${config.port}`);
            console.log(`🔑 Client ID: ${config.kickClientId.substring(0, 10)}...`);
            console.log(`👑 Super Admin: ${config.superAdmin}`);

            try {
                const globalStats = await db.getGlobalStats();
                console.log(`📺 Kayıtlı Kanal: ${globalStats.totalChannels}`);
                console.log(`👥 Toplam Oyuncu: ${globalStats.totalPlayers}`);
            } catch (e) {
                console.log(`📺 Kayıtlı Kanal: 0`);
                console.log(`👥 Toplam Oyuncu: 0`);
            }

            // Don't auto-open on Railway
            if (!process.env.RAILWAY_ENVIRONMENT) {
                console.log('\n🌐 Dashboard açılıyor...');
                open(`http://localhost:${config.port}`);
            }

            console.log('\n📌 Kick Developer Panel URL\'leri:');
            console.log(`   Redirect URI: ${config.publicUrl}/auth/kick/callback`);
            console.log(`   Webhook URL:  ${config.publicUrl}/webhook`);

            if (!process.env.DATABASE_URL) {
                console.log('\n⚠️  DATABASE_URL ayarlanmamış!');
                console.log('   Railway PostgreSQL veya lokal PostgreSQL kullanın.');
            }

            // Start automatic token refresh every 15 minutes
            const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
            console.log(`\n🔄 Token refresh interval: ${REFRESH_INTERVAL / 60000} dakika`);

            // Initial refresh after 1 minute
            setTimeout(refreshAllTokens, 60 * 1000);

            // Then every 15 minutes
            setInterval(refreshAllTokens, REFRESH_INTERVAL);
        });
    } catch (error) {
        console.error('❌ Başlatma hatası:', error);
        process.exit(1);
    }
}

start();
