# DoxiBot - Multi-Tenant Kick RPG Bot

🎮 Chat-based RPG game for Kick.com streamers.

## Features
- Multi-tenant: Works on multiple channels with independent settings
- Super Admin: Doxish can manage all channels
- Fully editable commands with enable/disable toggles
- Premium currency (DoxiGem) system
- 50+ monsters, 100+ items, level cap 99

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Login with GitHub

### 2. Add PostgreSQL
- Click "New" → "Database" → "Add PostgreSQL"

### 3. Deploy from GitHub
- Click "New" → "GitHub Repo"
- Select this repository

### 4. Set Environment Variables
```
KICK_CLIENT_ID=your_kick_client_id
KICK_CLIENT_SECRET=your_kick_client_secret
KICK_REDIRECT_URI=https://your-app.up.railway.app/auth/kick/callback
PUBLIC_URL=https://your-app.up.railway.app
SUPER_ADMIN=Doxish
```

### 5. Update Kick Developer Panel
- Redirect URI: `https://your-app.up.railway.app/auth/kick/callback`
- Webhook URL: `https://your-app.up.railway.app/webhook`

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Run with local PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/doxirpg npm start
```

## Commands

| Command | Description |
|---------|-------------|
| !kayit [class] | Create character (warrior/mage/archer) |
| !profil | View profile |
| !av | Hunt for monsters |
| !saldir | Attack in battle |
| !balik | Go fishing |
| !dukkan | View shop (Gold) |
| !pdukkan | Premium shop (DoxiGem) |
| !gunluk | Daily reward |
| !siralama | Leaderboard |

## License
MIT
