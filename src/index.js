import { app } from './server.js';
import { config } from './config.js';
import { db } from './db/database.js';
import open from 'open';

console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🎮  DoxiBot - Multi-Tenant Kick RPG Bot  🎮    ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

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
        });
    } catch (error) {
        console.error('❌ Başlatma hatası:', error);
        process.exit(1);
    }
}

start();
