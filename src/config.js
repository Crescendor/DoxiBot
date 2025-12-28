import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Kick API
  kickClientId: process.env.KICK_CLIENT_ID || '01K3VTSFHXQHETAAGTNRV54JYE',
  kickClientSecret: process.env.KICK_CLIENT_SECRET || '386340c8620f3e3d9992cb3178de0d38f89d6370c7e30793cca456a996de9d01',
  kickRedirectUri: process.env.KICK_REDIRECT_URI || 'http://localhost:3000/auth/kick/callback',

  // Server
  port: process.env.PORT || 3000,
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',

  // Super Admin (can manage all channels)
  superAdmin: process.env.SUPER_ADMIN || 'Doxish',

  // Game defaults (all times in seconds)
  game: {
    // Cooldowns
    huntCooldown: 30,           // !av sonrası bekleme (30 sn)
    attackCooldown: 5,          // !saldir sonrası bekleme (5 sn)
    dailyCooldown: 86400,       // !gunluk (24 saat)

    // Durations
    fishingDuration: 1200,      // Balık tutma süresi (20 dk = 1200 sn)

    // Level
    levelCap: 99
  }
};

// Default cooldowns (can be overridden per-channel)
export const DEFAULT_COOLDOWNS = {
  hunt: { cooldown: 30, label: 'Av Bekleme (sn)' },
  attack: { cooldown: 5, label: 'Saldırı Bekleme (sn)' },
  daily: { cooldown: 86400, label: 'Günlük Ödül (sn)' },
  fishing: { duration: 1200, label: 'Balık Süresi (sn)' }
};
