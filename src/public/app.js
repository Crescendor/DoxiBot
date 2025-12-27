// DoxiRPG Multi-Tenant Dashboard

let currentPage = 'dashboard';
let currentChannelId = null;
let channels = [];

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadStatus();
  updateSetupUrls();

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('success')) {
    const channelId = params.get('channel');
    const username = params.get('username');
    showNotification(`✅ ${username || 'Kanal'} aktifleştirildi!`, 'success');
    if (channelId) currentChannelId = parseInt(channelId);
    window.history.replaceState({}, '', '/');
  }

  setInterval(loadStatus, 30000);
});

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => { e.preventDefault(); navigateTo(item.dataset.page); });
  });
  document.getElementById('login-btn').addEventListener('click', () => window.location.href = '/login');
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));

  const titles = {
    dashboard: 'Dashboard', commands: '💬 Komutlar', players: '👥 Oyuncular',
    leaderboard: '🏆 Sıralama', chat: '📝 Chat Log', test: '🧪 Test',
    channels: '📺 Tüm Kanallar', setup: '⚙️ Kurulum'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  if (page === 'commands') loadCommands();
  if (page === 'players') loadPlayers();
  if (page === 'leaderboard') loadLeaderboard();
  if (page === 'chat') loadChatLog();
  if (page === 'channels') loadChannels();
  if (page === 'dashboard') loadDashboard();
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    channels = data.channels || [];

    // Populate channel selector
    const select = document.getElementById('channel-select');
    select.innerHTML = '<option value="">Seçin...</option>' +
      channels.map(c => `<option value="${c.id}">${c.username}</option>`).join('');

    // Auto-select first channel or last selected
    if (!currentChannelId && channels.length > 0) {
      currentChannelId = channels[0].id;
    }
    if (currentChannelId) {
      select.value = currentChannelId;
      const ch = channels.find(c => c.id === currentChannelId);
      document.getElementById('current-channel').textContent = ch ? `📺 ${ch.username}` : '';
    }

    if (currentPage === 'dashboard') loadDashboard();
  } catch (e) { console.error('Status error:', e); }
}

function switchChannel() {
  const select = document.getElementById('channel-select');
  currentChannelId = select.value ? parseInt(select.value) : null;
  const ch = channels.find(c => c.id === currentChannelId);
  document.getElementById('current-channel').textContent = ch ? `📺 ${ch.username}` : '';

  // Reload current page data
  navigateTo(currentPage);
}

async function loadDashboard() {
  if (!currentChannelId) {
    document.getElementById('stat-players').textContent = '0';
    document.getElementById('stat-battles').textContent = '0';
    document.getElementById('stat-level').textContent = '0';
    document.getElementById('stat-fishing').textContent = '0';
    document.getElementById('top-players').innerHTML = '<div class="empty-state">Kanal seçin</div>';
    return;
  }

  try {
    const res = await fetch(`/api/channel/${currentChannelId}/status`);
    const data = await res.json();

    document.getElementById('stat-players').textContent = data.stats?.totalPlayers || 0;
    document.getElementById('stat-battles').textContent = data.stats?.totalBattles || 0;
    document.getElementById('stat-level').textContent = data.stats?.highestLevel || 0;
    document.getElementById('stat-fishing').textContent = data.stats?.activeFishing || 0;

    // Top players
    const lbRes = await fetch(`/api/channel/${currentChannelId}/leaderboard`);
    const leaderboard = await lbRes.json();

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    document.getElementById('top-players').innerHTML = leaderboard.length > 0 ? leaderboard.slice(0, 5).map((p, i) => `
      <div class="player-item">
        <div class="player-rank">${medals[i]}</div>
        <div class="player-info"><div class="player-name">${esc(p.username)}</div><div class="player-stats">Lv.${p.level} | ${p.doxigem || 0}💎</div></div>
        <div class="player-gold">${p.gold}💰</div>
      </div>
    `).join('') : '<div class="empty-state">Henüz oyuncu yok</div>';
  } catch (e) { console.error('Dashboard error:', e); }
}

// ========== COMMANDS ==========
async function loadCommands() {
  if (!currentChannelId) {
    document.getElementById('commands-list').innerHTML = '<div class="empty-state">Kanal seçin</div>';
    return;
  }

  try {
    const res = await fetch(`/api/admin/channel/${currentChannelId}/commands`);
    const commands = await res.json();

    document.getElementById('commands-list').innerHTML = commands.map(cmd => `
      <div class="command-editor-item ${cmd.enabled ? '' : 'disabled'}">
        <div class="command-header">
          <div class="command-name">!${cmd.command}</div>
          <label class="toggle-switch">
            <input type="checkbox" ${cmd.enabled ? 'checked' : ''} onchange="toggleCommand('${cmd.command}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="command-description">${cmd.description || 'Açıklama yok'}</div>
        <textarea class="input command-response" data-cmd="${cmd.command}" placeholder="Yanıt şablonu...">${esc(cmd.response || '')}</textarea>
        <button class="btn btn-small" onclick="saveCommandResponse('${cmd.command}')">💾 Kaydet</button>
      </div>
    `).join('');
  } catch (e) {
    console.error('Commands error:', e);
    document.getElementById('commands-list').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

async function toggleCommand(command, enabled) {
  if (!currentChannelId) return;
  await fetch(`/api/admin/channel/${currentChannelId}/command/${command}/toggle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  showNotification(`${enabled ? '✅ Açıldı' : '❌ Kapatıldı'}: !${command}`, enabled ? 'success' : 'info');
  loadCommands();
}

async function saveCommandResponse(command) {
  if (!currentChannelId) return;
  const response = document.querySelector(`.command-response[data-cmd="${command}"]`).value;
  await fetch(`/api/admin/channel/${currentChannelId}/command/${command}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response })
  });
  showNotification('✅ Kaydedildi!', 'success');
}

// ========== PLAYERS ==========
async function loadPlayers() {
  if (!currentChannelId) {
    document.getElementById('players-list').innerHTML = '<div class="empty-state">Kanal seçin</div>';
    return;
  }

  try {
    const res = await fetch(`/api/admin/channel/${currentChannelId}/players`);
    const players = await res.json();

    document.getElementById('players-list').innerHTML = players.length > 0 ? `
      <table><thead><tr><th>ID</th><th>Kullanıcı</th><th>Sınıf</th><th>Seviye</th><th>Altın</th><th>💎</th><th>İşlemler</th></tr></thead>
      <tbody>${players.map(p => `
        <tr>
          <td>${p.user_id}</td>
          <td>${esc(p.username)}</td>
          <td>${getClassEmoji(p.class)}</td>
          <td>Lv.${p.level}</td>
          <td>${p.gold}💰</td>
          <td>${p.doxigem || 0}</td>
          <td class="actions">
            <button class="btn btn-small" onclick="editPlayer(${p.user_id})">✏️</button>
            <button class="btn btn-small" onclick="giveGems(${p.user_id})">💎</button>
            <button class="btn btn-small btn-danger" onclick="deletePlayer(${p.user_id})">🗑️</button>
          </td>
        </tr>
      `).join('')}</tbody></table>
    ` : '<div class="empty-state">Oyuncu yok</div>';
  } catch (e) { console.error('Players error:', e); }
}

function editPlayer(userId) {
  openModal('Oyuncu Düzenle', `
    <div class="form-group"><label>Gold</label><input type="number" id="edit-gold" class="input" value="0"></div>
    <div class="form-group"><label>DoxiGem</label><input type="number" id="edit-gems" class="input" value="0"></div>
    <div class="form-group"><label>Level</label><input type="number" id="edit-level" class="input" value="1" max="99"></div>
    <button class="btn btn-primary" onclick="savePlayer(${userId})">💾 Kaydet</button>
  `);
}

async function savePlayer(userId) {
  await fetch(`/api/admin/channel/${currentChannelId}/player/${userId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gold: parseInt(document.getElementById('edit-gold').value),
      doxigem: parseInt(document.getElementById('edit-gems').value),
      level: parseInt(document.getElementById('edit-level').value)
    })
  });
  closeModal(); loadPlayers(); showNotification('✅ Güncellendi!', 'success');
}

function giveGems(userId) {
  openModal('DoxiGem Ver', `
    <div class="form-group"><label>Miktar 💎</label><input type="number" id="gems-amount" class="input" value="10"></div>
    <button class="btn btn-primary" onclick="sendGems(${userId})">💎 Ver</button>
  `);
}

async function sendGems(userId) {
  await fetch(`/api/admin/channel/${currentChannelId}/player/${userId}/give-gems`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: parseInt(document.getElementById('gems-amount').value) })
  });
  closeModal(); loadPlayers(); showNotification('✅ Verildi!', 'success');
}

async function deletePlayer(userId) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  await fetch(`/api/admin/channel/${currentChannelId}/player/${userId}`, { method: 'DELETE' });
  loadPlayers(); showNotification('✅ Silindi!', 'success');
}

// ========== LEADERBOARD ==========
async function loadLeaderboard() {
  if (!currentChannelId) {
    document.getElementById('leaderboard').innerHTML = '<div class="empty-state">Kanal seçin</div>';
    return;
  }

  const res = await fetch(`/api/channel/${currentChannelId}/leaderboard`);
  const lb = await res.json();
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  document.getElementById('leaderboard').innerHTML = lb.length > 0 ? lb.map((p, i) => `
    <div class="leaderboard-item">
      <div class="lb-rank">${medals[i]}</div>
      <div><div class="lb-name">${esc(p.username)}</div><div class="lb-class">${getClassEmoji(p.class)}</div></div>
      <div class="lb-level">Lv.${p.level}</div>
      <div class="lb-gold">${p.gold}💰</div>
      <div class="lb-gems">${p.doxigem || 0}💎</div>
    </div>
  `).join('') : '<div class="empty-state">Oyuncu yok</div>';
}

// ========== CHAT LOG ==========
async function loadChatLog() {
  if (!currentChannelId) {
    document.getElementById('chat-log').innerHTML = '<div class="empty-state">Kanal seçin</div>';
    return;
  }

  const res = await fetch(`/api/channel/${currentChannelId}/chat-log`);
  const chats = await res.json();

  document.getElementById('chat-log').innerHTML = chats.length > 0 ? chats.map(c => {
    const time = new Date(c.created_at * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return `<div class="chat-message">
      <div class="chat-meta"><span class="chat-user">${esc(c.username)}</span><span>${time}</span></div>
      <div class="chat-content">${esc(c.content)}</div>
      ${c.response ? `<div class="chat-response">${esc(c.response)}</div>` : ''}
    </div>`;
  }).join('') : '<div class="empty-state">Mesaj yok</div>';
}

// ========== CHANNELS (Super Admin) ==========
async function loadChannels() {
  try {
    const res = await fetch('/api/admin/channels');
    const channelsList = await res.json();

    document.getElementById('channels-list').innerHTML = channelsList.length > 0 ? `
      <table><thead><tr><th>ID</th><th>Kullanıcı</th><th>Durum</th><th>Kayıt</th><th>İşlemler</th></tr></thead>
      <tbody>${channelsList.map(c => `
        <tr>
          <td>${c.channel_id}</td>
          <td>${esc(c.owner_username)}</td>
          <td>${c.bot_enabled ? '✅ Aktif' : '❌ Kapalı'}</td>
          <td>${new Date(c.created_at * 1000).toLocaleDateString('tr-TR')}</td>
          <td class="actions">
            <button class="btn btn-small" onclick="selectChannel(${c.channel_id})">📺</button>
            <button class="btn btn-small ${c.bot_enabled ? 'btn-danger' : ''}" onclick="toggleChannelStatus(${c.channel_id}, ${!c.bot_enabled})">${c.bot_enabled ? '⏸️' : '▶️'}</button>
            <button class="btn btn-small btn-danger" onclick="deleteChannel(${c.channel_id})">🗑️</button>
          </td>
        </tr>
      `).join('')}</tbody></table>
    ` : '<div class="empty-state">Kayıtlı kanal yok</div>';
  } catch (e) { console.error('Channels error:', e); }
}

function selectChannel(channelId) {
  currentChannelId = channelId;
  document.getElementById('channel-select').value = channelId;
  const ch = channels.find(c => c.id === channelId);
  document.getElementById('current-channel').textContent = ch ? `📺 ${ch.username}` : '';
  navigateTo('dashboard');
  showNotification(`📺 ${ch?.username || 'Kanal'} seçildi`, 'success');
}

async function toggleChannelStatus(channelId, enabled) {
  await fetch(`/api/admin/channel/${channelId}/toggle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  loadChannels(); loadStatus();
  showNotification(enabled ? '✅ Aktifleştirildi' : '⏸️ Durduruldu', 'info');
}

async function deleteChannel(channelId) {
  if (!confirm('Kanalı ve tüm verilerini silmek istediğinize emin misiniz?')) return;
  await fetch(`/api/admin/channel/${channelId}`, { method: 'DELETE' });
  loadChannels(); loadStatus();
  showNotification('✅ Silindi', 'success');
}

// ========== TEST ==========
async function testCommand() {
  const content = document.getElementById('test-command').value;
  if (!content) return showNotification('Komut girin', 'error');

  const res = await fetch('/api/test-command', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelId: currentChannelId || 0,
      content,
      username: document.getElementById('test-username').value,
      userId: parseInt(document.getElementById('test-userid').value)
    })
  });
  const data = await res.json();
  document.getElementById('test-result').classList.remove('hidden');
  document.getElementById('test-response').textContent = data.response || 'Cevap yok';
}

function quickTest(cmd) { document.getElementById('test-command').value = cmd; testCommand(); }

// ========== UTILS ==========
function updateSetupUrls() {
  const base = window.location.origin;
  document.getElementById('redirect-uri').textContent = `${base}/auth/kick/callback`;
  document.getElementById('webhook-url').textContent = `${base}/webhook`;
}

function copyUrl(id) {
  navigator.clipboard.writeText(document.getElementById(id).textContent);
  showNotification('📋 Kopyalandı!', 'success');
}

function openModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function esc(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getClassEmoji(c) { return { warrior: '⚔️', mage: '🔮', archer: '🏹' }[c] || '⚔️'; }

function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.style.cssText = `position:fixed;bottom:20px;right:20px;padding:16px 24px;background:${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};color:white;border-radius:8px;font-weight:500;z-index:1000;animation:slideIn .3s ease;box-shadow:0 4px 20px rgba(0,0,0,.3)`;
  n.textContent = message;
  if (!document.querySelector('#notif-style')) {
    const s = document.createElement('style');
    s.id = 'notif-style';
    s.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(n);
  setTimeout(() => { n.style.animation = 'slideIn .3s ease reverse'; setTimeout(() => n.remove(), 300); }, 3000);
}
