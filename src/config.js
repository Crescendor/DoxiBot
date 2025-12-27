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

  // Game defaults
  game: {
    huntCooldown: 30,
    attackCooldown: 5,
    dailyCooldown: 86400,
    fishingDuration: 1200,
    levelCap: 99
  }
};
