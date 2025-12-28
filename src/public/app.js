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
    dashboard: 'Dashboard', commands: '🎮 Oyun Komutları', players: '👥 Oyuncular',
    leaderboard: '🏆 Sıralama', chat: '📝 Chat Log', test: '🧪 Test',
    customcmds: '💬 Özel Komutlar', pools: '🎲 Havuzlar',
    items: '🎒 Eşyalar', monsters: '👹 Canavarlar', quests: '📋 Görevler',
    shop: '🏪 Dükkan', pshop: '💎 Premium Dükkan', settings: '⏱️ Oyun Ayarları',
    channels: '📺 Tüm Kanallar', setup: '⚙️ Kurulum'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  if (page === 'commands') loadCommands();
  if (page === 'players') loadPlayers();
  if (page === 'leaderboard') loadLeaderboard();
  if (page === 'chat') loadChatLog();
  if (page === 'channels') loadChannels();
  if (page === 'dashboard') loadDashboard();
  if (page === 'items') loadItems();
  if (page === 'monsters') loadMonsters();
  if (page === 'quests') loadQuests();
  if (page === 'shop') loadShop();
  if (page === 'pshop') loadPremiumShop();
  if (page === 'settings') loadSettings();
  if (page === 'customcmds') loadCustomCommands();
  if (page === 'pools') loadPools();
  if (page === 'suggestions') loadSuggestions();
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

    // Load game status
    loadGameStatus();
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

// ========== ITEMS ==========
let allItems = [];
let allQuests = [];

async function loadItems() {
  try {
    const res = await fetch('/api/admin/items');
    const data = await res.json();
    allItems = data.builtIn || [];

    filterItems();
  } catch (e) {
    document.getElementById('items-list').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

function filterItems() {
  const filter = document.getElementById('item-type-filter').value;
  const items = filter ? allItems.filter(i => i.type === filter) : allItems;

  const rarityColors = { common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };

  document.getElementById('items-list').innerHTML = items.length > 0 ? items.map(item => `
    <div class="item-card" onclick="editItem('${item.id}')" style="border-color: ${rarityColors[item.rarity] || '#9ca3af'}">
      <div class="item-icon">${item.emoji || '📦'}</div>
      <div class="item-name">${esc(item.name)}</div>
      <div class="item-type">${item.type}</div>
      <div class="item-stats">
        ${item.attack ? `⚔️${item.attack}` : ''}
        ${item.defense ? `🛡️${item.defense}` : ''}
        ${item.hp ? `❤️${item.hp}` : ''}
      </div>
      <div class="item-price">${item.price || 0}💰</div>
    </div>
  `).join('') : '<div class="empty-state">Eşya bulunamadı</div>';
}

function editItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;

  openModal('🎒 ' + item.name, `
    <div class="item-preview" style="text-align:center;font-size:3rem;margin-bottom:1rem">${item.emoji || '📦'}</div>
    <div class="form-row">
      <div class="form-group"><label>İsim</label><input type="text" id="edit-item-name" class="input" value="${esc(item.name)}"></div>
      <div class="form-group"><label>Emoji</label><input type="text" id="edit-item-emoji" class="input" value="${item.emoji || ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Tip</label>
        <select id="edit-item-type" class="input">
          <option value="weapon" ${item.type === 'weapon' ? 'selected' : ''}>Silah</option>
          <option value="armor" ${item.type === 'armor' ? 'selected' : ''}>Zırh</option>
          <option value="accessory" ${item.type === 'accessory' ? 'selected' : ''}>Aksesuar</option>
          <option value="consumable" ${item.type === 'consumable' ? 'selected' : ''}>Tüketilebilir</option>
          <option value="fishing" ${item.type === 'fishing' ? 'selected' : ''}>Balık</option>
          <option value="premium" ${item.type === 'premium' ? 'selected' : ''}>Premium</option>
        </select>
      </div>
      <div class="form-group"><label>Nadirlik</label>
        <select id="edit-item-rarity" class="input">
          <option value="common" ${item.rarity === 'common' ? 'selected' : ''}>Common</option>
          <option value="uncommon" ${item.rarity === 'uncommon' ? 'selected' : ''}>Uncommon</option>
          <option value="rare" ${item.rarity === 'rare' ? 'selected' : ''}>Rare</option>
          <option value="epic" ${item.rarity === 'epic' ? 'selected' : ''}>Epic</option>
          <option value="legendary" ${item.rarity === 'legendary' ? 'selected' : ''}>Legendary</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Saldırı</label><input type="number" id="edit-item-attack" class="input" value="${item.attack || 0}"></div>
      <div class="form-group"><label>Savunma</label><input type="number" id="edit-item-defense" class="input" value="${item.defense || 0}"></div>
      <div class="form-group"><label>HP</label><input type="number" id="edit-item-hp" class="input" value="${item.hp || 0}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Fiyat (Altın)</label><input type="number" id="edit-item-price" class="input" value="${item.price || 0}"></div>
      <div class="form-group"><label>Gem Fiyatı</label><input type="number" id="edit-item-gem" class="input" value="${item.gemPrice || 0}"></div>
    </div>
    <div class="form-group"><label>Açıklama</label><textarea id="edit-item-desc" class="input">${esc(item.description || '')}</textarea></div>
    <div class="form-row">
      <label class="checkbox"><input type="checkbox" id="edit-item-shop" ${item.shopItem ? 'checked' : ''}> Dükkanda Satışta</label>
      <label class="checkbox"><input type="checkbox" id="edit-item-pshop" ${item.premiumShop ? 'checked' : ''}> Premium Dükkanda</label>
    </div>
    <button class="btn btn-primary" onclick="saveItem('${itemId}')">💾 Kaydet</button>
  `);
}

async function saveItem(itemId) {
  const itemData = {
    id: itemId,
    name: document.getElementById('edit-item-name').value,
    emoji: document.getElementById('edit-item-emoji').value,
    type: document.getElementById('edit-item-type').value,
    rarity: document.getElementById('edit-item-rarity').value,
    attack: parseInt(document.getElementById('edit-item-attack').value) || 0,
    defense: parseInt(document.getElementById('edit-item-defense').value) || 0,
    hp: parseInt(document.getElementById('edit-item-hp').value) || 0,
    price: parseInt(document.getElementById('edit-item-price').value) || 0,
    gemPrice: parseInt(document.getElementById('edit-item-gem').value) || 0,
    description: document.getElementById('edit-item-desc').value,
    shopItem: document.getElementById('edit-item-shop').checked,
    premiumShop: document.getElementById('edit-item-pshop').checked
  };

  await fetch(`/api/admin/channel/${currentChannelId}/item/${itemId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });

  closeModal(); loadItems(); showNotification('✅ Kaydedildi!', 'success');
}

function openAddItemModal() {
  openModal('➕ Yeni Eşya', `
    <div class="form-row">
      <div class="form-group"><label>ID</label><input type="text" id="new-item-id" class="input" placeholder="sword_1"></div>
      <div class="form-group"><label>İsim</label><input type="text" id="new-item-name" class="input" placeholder="Kılıç"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Emoji</label><input type="text" id="new-item-emoji" class="input" value="⚔️"></div>
      <div class="form-group"><label>Tip</label>
        <select id="new-item-type" class="input">
          <option value="weapon">Silah</option>
          <option value="armor">Zırh</option>
          <option value="accessory">Aksesuar</option>
          <option value="consumable">Tüketilebilir</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Fiyat</label><input type="number" id="new-item-price" class="input" value="100"></div>
      <div class="form-group"><label>Saldırı</label><input type="number" id="new-item-attack" class="input" value="5"></div>
    </div>
    <button class="btn btn-primary" onclick="addNewItem()">➕ Ekle</button>
  `);
}

async function addNewItem() {
  const itemData = {
    id: document.getElementById('new-item-id').value,
    name: document.getElementById('new-item-name').value,
    emoji: document.getElementById('new-item-emoji').value,
    type: document.getElementById('new-item-type').value,
    price: parseInt(document.getElementById('new-item-price').value) || 0,
    attack: parseInt(document.getElementById('new-item-attack').value) || 0,
    rarity: 'common'
  };

  await fetch(`/api/admin/channel/${currentChannelId}/item/${itemData.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });

  closeModal(); loadItems(); showNotification('✅ Eklendi!', 'success');
}

// ========== QUESTS ==========
async function loadQuests() {
  try {
    const res = await fetch('/api/admin/quests');
    const data = await res.json();
    allQuests = data.builtIn || [];

    document.getElementById('quests-list').innerHTML = allQuests.length > 0 ? allQuests.map(q => `
      <div class="quest-card" onclick="editQuest('${q.id}')">
        <div class="quest-header">
          <span class="quest-icon">${q.emoji || '📋'}</span>
          <span class="quest-name">${esc(q.name)}</span>
        </div>
        <div class="quest-desc">${esc(q.description || '')}</div>
        <div class="quest-reward">Ödül: ${q.goldReward || 0}💰 ${q.xpReward || 0}⭐</div>
      </div>
    `).join('') : '<div class="empty-state">Görev bulunamadı</div>';
  } catch (e) {
    document.getElementById('quests-list').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

function editQuest(questId) {
  const q = allQuests.find(x => x.id === questId);
  if (!q) return;

  openModal('📋 ' + q.name, `
    <div class="form-row">
      <div class="form-group"><label>İsim</label><input type="text" id="edit-quest-name" class="input" value="${esc(q.name)}"></div>
      <div class="form-group"><label>Emoji</label><input type="text" id="edit-quest-emoji" class="input" value="${q.emoji || ''}"></div>
    </div>
    <div class="form-group"><label>Açıklama</label><textarea id="edit-quest-desc" class="input">${esc(q.description || '')}</textarea></div>
    <div class="form-group"><label>Hedef</label><input type="text" id="edit-quest-target" class="input" value="${q.target || ''}"></div>
    <div class="form-row">
      <div class="form-group"><label>Hedef Sayısı</label><input type="number" id="edit-quest-count" class="input" value="${q.targetCount || 1}"></div>
      <div class="form-group"><label>Altın Ödülü</label><input type="number" id="edit-quest-gold" class="input" value="${q.goldReward || 0}"></div>
      <div class="form-group"><label>XP Ödülü</label><input type="number" id="edit-quest-xp" class="input" value="${q.xpReward || 0}"></div>
    </div>
    <button class="btn btn-primary" onclick="saveQuest('${questId}')">💾 Kaydet</button>
  `);
}

async function saveQuest(questId) {
  const questData = {
    id: questId,
    name: document.getElementById('edit-quest-name').value,
    emoji: document.getElementById('edit-quest-emoji').value,
    description: document.getElementById('edit-quest-desc').value,
    target: document.getElementById('edit-quest-target').value,
    targetCount: parseInt(document.getElementById('edit-quest-count').value) || 1,
    goldReward: parseInt(document.getElementById('edit-quest-gold').value) || 0,
    xpReward: parseInt(document.getElementById('edit-quest-xp').value) || 0
  };

  await fetch(`/api/admin/channel/${currentChannelId}/quest/${questId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questData)
  });

  closeModal(); loadQuests(); showNotification('✅ Kaydedildi!', 'success');
}

function openAddQuestModal() {
  openModal('➕ Yeni Görev', `
    <div class="form-row">
      <div class="form-group"><label>ID</label><input type="text" id="new-quest-id" class="input" placeholder="quest_1"></div>
      <div class="form-group"><label>İsim</label><input type="text" id="new-quest-name" class="input" placeholder="Canavar Avcısı"></div>
    </div>
    <div class="form-group"><label>Açıklama</label><textarea id="new-quest-desc" class="input" placeholder="10 canavar öldür"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Altın</label><input type="number" id="new-quest-gold" class="input" value="100"></div>
      <div class="form-group"><label>XP</label><input type="number" id="new-quest-xp" class="input" value="50"></div>
    </div>
    <button class="btn btn-primary" onclick="addNewQuest()">➕ Ekle</button>
  `);
}

async function addNewQuest() {
  const questData = {
    id: document.getElementById('new-quest-id').value,
    name: document.getElementById('new-quest-name').value,
    description: document.getElementById('new-quest-desc').value,
    goldReward: parseInt(document.getElementById('new-quest-gold').value) || 0,
    xpReward: parseInt(document.getElementById('new-quest-xp').value) || 0,
    target: 'monster', targetCount: 10
  };

  await fetch(`/api/admin/channel/${currentChannelId}/quest/${questData.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questData)
  });

  closeModal(); loadQuests(); showNotification('✅ Eklendi!', 'success');
}

// ========== SHOP ==========
async function loadShop() {
  try {
    const res = await fetch('/api/admin/items');
    const data = await res.json();
    const shopItems = (data.builtIn || []).filter(i => i.shopItem || i.price > 0);

    document.getElementById('shop-items').innerHTML = shopItems.length > 0 ? shopItems.map(item => `
      <div class="shop-item" onclick="editShopItem('${item.id}')">
        <div class="shop-icon">${item.emoji || '📦'}</div>
        <div class="shop-info">
          <div class="shop-name">${esc(item.name)}</div>
          <div class="shop-stats">${item.attack ? `⚔️${item.attack}` : ''} ${item.defense ? `🛡️${item.defense}` : ''}</div>
        </div>
        <div class="shop-price">${item.price || 0}💰</div>
        <label class="toggle-switch" onclick="event.stopPropagation()">
          <input type="checkbox" ${item.shopItem ? 'checked' : ''} onchange="toggleShopItem('${item.id}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('') : '<div class="empty-state">Dükkanda satışta eşya yok</div>';
  } catch (e) {
    document.getElementById('shop-items').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

async function toggleShopItem(itemId, inShop) {
  await fetch(`/api/admin/channel/${currentChannelId}/item/${itemId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: itemId, shopItem: inShop })
  });
  showNotification(inShop ? '✅ Dükkana eklendi' : '❌ Dükkandn çıkarıldı', 'success');
}

function editShopItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) { loadItems().then(() => editItem(itemId)); return; }
  editItem(itemId);
}

// ========== PREMIUM SHOP ==========
async function loadPremiumShop() {
  try {
    const res = await fetch('/api/admin/items');
    const data = await res.json();
    const pshopItems = (data.builtIn || []).filter(i => i.premiumShop || i.gemPrice > 0);

    document.getElementById('pshop-items').innerHTML = pshopItems.length > 0 ? pshopItems.map(item => `
      <div class="shop-item premium" onclick="editItem('${item.id}')">
        <div class="shop-icon">${item.emoji || '💎'}</div>
        <div class="shop-info">
          <div class="shop-name">${esc(item.name)}</div>
          <div class="shop-stats">${item.attack ? `⚔️${item.attack}` : ''} ${item.defense ? `🛡️${item.defense}` : ''}</div>
        </div>
        <div class="shop-price gem">${item.gemPrice || 0}💎</div>
        <label class="toggle-switch" onclick="event.stopPropagation()">
          <input type="checkbox" ${item.premiumShop ? 'checked' : ''} onchange="togglePremiumItem('${item.id}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('') : '<div class="empty-state">Premium dükkanda eşya yok</div>';
  } catch (e) {
    document.getElementById('pshop-items').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

async function togglePremiumItem(itemId, inShop) {
  await fetch(`/api/admin/channel/${currentChannelId}/item/${itemId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: itemId, premiumShop: inShop })
  });
  showNotification(inShop ? '✅ Premium dükkana eklendi' : '❌ Premium dükkandn çıkarıldı', 'success');
}

// ========== MONSTERS ==========
let allMonsters = [];

async function loadMonsters() {
  try {
    const res = await fetch('/api/admin/monsters');
    const data = await res.json();
    allMonsters = data.builtIn || [];

    filterMonsters();
  } catch (e) {
    document.getElementById('monsters-list').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

function filterMonsters() {
  const filter = document.getElementById('monster-level-filter').value;
  let monsters = allMonsters;

  if (filter) {
    const minLevel = parseInt(filter);
    if (minLevel === 1) monsters = allMonsters.filter(m => m.minLevel >= 1 && m.minLevel < 10);
    else if (minLevel === 10) monsters = allMonsters.filter(m => m.minLevel >= 10 && m.minLevel < 30);
    else if (minLevel === 30) monsters = allMonsters.filter(m => m.minLevel >= 30 && m.minLevel < 50);
    else if (minLevel === 50) monsters = allMonsters.filter(m => m.minLevel >= 50);
  }

  document.getElementById('monsters-list').innerHTML = monsters.length > 0 ? monsters.map(m => `
    <div class="monster-card" onclick="editMonster('${m.id}')">
      <div class="monster-emoji">${m.emoji || '👹'}</div>
      <div class="monster-info">
        <div class="monster-name">${esc(m.name)}</div>
        <div class="monster-level">Lv.${m.minLevel}-${m.maxLevel || m.minLevel}</div>
      </div>
      <div class="monster-stats">
        <span>❤️${m.hp}</span>
        <span>⚔️${m.atk}</span>
        <span>🛡️${m.def}</span>
      </div>
      <div class="monster-rewards">
        <span>${m.gold?.[0] || 0}-${m.gold?.[1] || 0}💰</span>
        <span>${m.exp || 0}⭐</span>
      </div>
    </div>
  `).join('') : '<div class="empty-state">Canavar bulunamadı</div>';
}

function editMonster(monsterId) {
  const m = allMonsters.find(x => x.id === monsterId);
  if (!m) return;

  openModal('👹 ' + m.name, `
    <div class="monster-preview" style="text-align:center;font-size:4rem;margin-bottom:1rem">${m.emoji || '👹'}</div>
    <div class="form-row">
      <div class="form-group"><label>İsim</label><input type="text" id="edit-mon-name" class="input" value="${esc(m.name)}"></div>
      <div class="form-group"><label>Emoji</label><input type="text" id="edit-mon-emoji" class="input" value="${m.emoji || ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Min Level</label><input type="number" id="edit-mon-minlv" class="input" value="${m.minLevel || 1}"></div>
      <div class="form-group"><label>Max Level</label><input type="number" id="edit-mon-maxlv" class="input" value="${m.maxLevel || m.minLevel || 1}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>HP</label><input type="number" id="edit-mon-hp" class="input" value="${m.hp || 100}"></div>
      <div class="form-group"><label>Saldırı</label><input type="number" id="edit-mon-atk" class="input" value="${m.atk || 10}"></div>
      <div class="form-group"><label>Savunma</label><input type="number" id="edit-mon-def" class="input" value="${m.def || 5}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Min Altın</label><input type="number" id="edit-mon-goldmin" class="input" value="${m.gold?.[0] || 10}"></div>
      <div class="form-group"><label>Max Altın</label><input type="number" id="edit-mon-goldmax" class="input" value="${m.gold?.[1] || 20}"></div>
      <div class="form-group"><label>EXP</label><input type="number" id="edit-mon-exp" class="input" value="${m.exp || 20}"></div>
    </div>
    <div class="form-group"><label>Spawn Oranı (%)</label><input type="number" id="edit-mon-spawn" class="input" value="${m.spawnChance || 50}"></div>
    <button class="btn btn-primary" onclick="saveMonster('${monsterId}')">💾 Kaydet</button>
  `);
}

async function saveMonster(monsterId) {
  const monsterData = {
    id: monsterId,
    name: document.getElementById('edit-mon-name').value,
    emoji: document.getElementById('edit-mon-emoji').value,
    minLevel: parseInt(document.getElementById('edit-mon-minlv').value) || 1,
    maxLevel: parseInt(document.getElementById('edit-mon-maxlv').value) || 1,
    hp: parseInt(document.getElementById('edit-mon-hp').value) || 100,
    atk: parseInt(document.getElementById('edit-mon-atk').value) || 10,
    def: parseInt(document.getElementById('edit-mon-def').value) || 5,
    gold: [
      parseInt(document.getElementById('edit-mon-goldmin').value) || 10,
      parseInt(document.getElementById('edit-mon-goldmax').value) || 20
    ],
    exp: parseInt(document.getElementById('edit-mon-exp').value) || 20,
    spawnChance: parseInt(document.getElementById('edit-mon-spawn').value) || 50
  };

  await fetch(`/api/admin/channel/${currentChannelId}/monster/${monsterId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(monsterData)
  });

  closeModal(); loadMonsters(); showNotification('✅ Kaydedildi!', 'success');
}

function openAddMonsterModal() {
  openModal('➕ Yeni Canavar', `
    <div class="form-row">
      <div class="form-group"><label>ID</label><input type="text" id="new-mon-id" class="input" placeholder="goblin_1"></div>
      <div class="form-group"><label>İsim</label><input type="text" id="new-mon-name" class="input" placeholder="Goblin"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Emoji</label><input type="text" id="new-mon-emoji" class="input" value="👺"></div>
      <div class="form-group"><label>Min Level</label><input type="number" id="new-mon-level" class="input" value="1"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>HP</label><input type="number" id="new-mon-hp" class="input" value="100"></div>
      <div class="form-group"><label>ATK</label><input type="number" id="new-mon-atk" class="input" value="10"></div>
      <div class="form-group"><label>DEF</label><input type="number" id="new-mon-def" class="input" value="5"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>EXP</label><input type="number" id="new-mon-exp" class="input" value="20"></div>
      <div class="form-group"><label>Altın</label><input type="number" id="new-mon-gold" class="input" value="15"></div>
    </div>
    <button class="btn btn-primary" onclick="addNewMonster()">➕ Ekle</button>
  `);
}

async function addNewMonster() {
  const monsterData = {
    id: document.getElementById('new-mon-id').value,
    name: document.getElementById('new-mon-name').value,
    emoji: document.getElementById('new-mon-emoji').value,
    minLevel: parseInt(document.getElementById('new-mon-level').value) || 1,
    maxLevel: parseInt(document.getElementById('new-mon-level').value) || 1,
    hp: parseInt(document.getElementById('new-mon-hp').value) || 100,
    atk: parseInt(document.getElementById('new-mon-atk').value) || 10,
    def: parseInt(document.getElementById('new-mon-def').value) || 5,
    exp: parseInt(document.getElementById('new-mon-exp').value) || 20,
    gold: [parseInt(document.getElementById('new-mon-gold').value) || 15, parseInt(document.getElementById('new-mon-gold').value) * 2 || 30],
    spawnChance: 50
  };

  await fetch(`/api/admin/channel/${currentChannelId}/monster/${monsterData.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(monsterData)
  });

  closeModal(); loadMonsters(); showNotification('✅ Eklendi!', 'success');
}

// ========== SETTINGS ==========
async function loadSettings() {
  if (!currentChannelId) {
    showNotification('Önce kanal seçin', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/admin/channel/${currentChannelId}/settings`);
    const settings = await res.json();

    document.getElementById('set-hunt-cd').value = settings.huntCooldown || 30;
    document.getElementById('set-attack-cd').value = settings.attackCooldown || 5;
    document.getElementById('set-daily-cd').value = settings.dailyCooldown || 86400;
    document.getElementById('set-fish-dur').value = settings.fishingDuration || 1200;
  } catch (e) {
    console.error('Settings load error:', e);
  }
}

async function saveSettings() {
  if (!currentChannelId) {
    showNotification('Önce kanal seçin', 'error');
    return;
  }

  const settings = {
    huntCooldown: parseInt(document.getElementById('set-hunt-cd').value) || 30,
    attackCooldown: parseInt(document.getElementById('set-attack-cd').value) || 5,
    dailyCooldown: parseInt(document.getElementById('set-daily-cd').value) || 86400,
    fishingDuration: parseInt(document.getElementById('set-fish-dur').value) || 1200
  };

  await fetch(`/api/admin/channel/${currentChannelId}/settings`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });

  showNotification('✅ Ayarlar kaydedildi!', 'success');
}

// ========== CUSTOM COMMANDS ==========
let allCustomCommands = [];

async function loadCustomCommands() {
  if (!currentChannelId) {
    document.getElementById('custom-commands-list').innerHTML = '<div class="empty-state">Önce kanal seçin</div>';
    return;
  }

  try {
    const res = await fetch(`/api/admin/channel/${currentChannelId}/custom-commands`);
    allCustomCommands = await res.json();

    document.getElementById('custom-commands-list').innerHTML = allCustomCommands.length > 0 ? allCustomCommands.map(cmd => `
      <div class="custom-cmd-item ${cmd.enabled ? '' : 'disabled'}">
        <div class="cmd-header">
          <span class="cmd-name">!${esc(cmd.command)}</span>
          <div class="cmd-actions">
            <span class="cmd-uses">${cmd.use_count || 0}x</span>
            <button class="btn btn-small" onclick="editCustomCmd('${esc(cmd.command)}')">✏️ Düzenle</button>
            <button class="btn btn-small btn-danger" onclick="deleteCustomCmd('${esc(cmd.command)}')">🗑️</button>
          </div>
        </div>
        <div class="cmd-response">${esc(cmd.response.substring(0, 100))}${cmd.response.length > 100 ? '...' : ''}</div>
        <div class="cmd-meta">
          ${cmd.enabled ? '✅ Aktif' : '❌ Kapalı'}
          ${cmd.sub_response ? ' | 👑 Abone cevabı var' : ''}
          ${cmd.reply_to_user ? ' | ↩️ Cevap' : ''}
        </div>
      </div>
    `).join('') : '<div class="empty-state">Henüz özel komut yok. + Yeni Komut ile ekleyin!</div>';
  } catch (e) {
    document.getElementById('custom-commands-list').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

function openAddCustomCmdModal() {
  openModal('➕ Yeni Özel Komut', `
    <div class="form-group">
      <label>Komut</label>
      <input type="text" id="new-cmd-name" class="input" placeholder="!selam" value="!">
    </div>
    <div class="form-group">
      <label>Cevap</label>
      <textarea id="new-cmd-response" class="input" rows="3" placeholder="Merhaba {bahset}!"></textarea>
    </div>
    <div class="form-group">
      <label>👑 Abone/Mod Özel Cevabı (boş bırakılabilir)</label>
      <textarea id="new-cmd-sub-response" class="input" rows="2" placeholder=""></textarea>
    </div>
    <div class="form-row" style="margin:12px 0">
      <label class="checkbox"><input type="checkbox" id="new-cmd-reply" checked> ↩️ Kullanıcıya cevap ver</label>
      <label class="checkbox"><input type="checkbox" id="new-cmd-enabled" checked> ✅ Aktif</label>
    </div>
    <button class="btn btn-primary" onclick="saveNewCustomCmd()">💾 Kaydet</button>
  `);
}

async function saveNewCustomCmd() {
  let command = document.getElementById('new-cmd-name').value.trim().toLowerCase();
  if (command.startsWith('!')) command = command.slice(1);

  const response = document.getElementById('new-cmd-response').value;
  const sub_response = document.getElementById('new-cmd-sub-response').value || null;
  const reply_to_user = document.getElementById('new-cmd-reply').checked;
  const enabled = document.getElementById('new-cmd-enabled').checked;

  if (!command || !response) {
    showNotification('Komut ve cevap gerekli!', 'error');
    return;
  }

  await fetch(`/api/admin/channel/${currentChannelId}/custom-command`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, response, sub_response, reply_to_user, enabled })
  });

  closeModal(); loadCustomCommands(); showNotification('✅ Komut eklendi!', 'success');
}

function editCustomCmd(command) {
  const cmd = allCustomCommands.find(c => c.command === command);
  if (!cmd) return;

  openModal('✏️ Komutu Düzenle: !' + command, `
    <div class="form-group">
      <label>Cevap</label>
      <textarea id="edit-cmd-response" class="input" rows="3">${esc(cmd.response)}</textarea>
    </div>
    <div class="form-group">
      <label>👑 Abone/Mod Özel Cevabı</label>
      <textarea id="edit-cmd-sub-response" class="input" rows="2">${esc(cmd.sub_response || '')}</textarea>
    </div>
    <div class="form-row" style="margin:12px 0">
      <label class="checkbox"><input type="checkbox" id="edit-cmd-reply" ${cmd.reply_to_user ? 'checked' : ''}> ↩️ Kullanıcıya cevap ver</label>
      <label class="checkbox"><input type="checkbox" id="edit-cmd-enabled" ${cmd.enabled ? 'checked' : ''}> ✅ Aktif</label>
    </div>
    <button class="btn btn-primary" onclick="saveEditCustomCmd('${command}')">💾 Kaydet</button>
  `);
}

async function saveEditCustomCmd(command) {
  const response = document.getElementById('edit-cmd-response').value;
  const sub_response = document.getElementById('edit-cmd-sub-response').value || null;
  const reply_to_user = document.getElementById('edit-cmd-reply').checked;
  const enabled = document.getElementById('edit-cmd-enabled').checked;

  if (!response) {
    showNotification('Cevap gerekli!', 'error');
    return;
  }

  await fetch(`/api/admin/channel/${currentChannelId}/custom-command`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, response, sub_response, reply_to_user, enabled })
  });

  closeModal(); loadCustomCommands(); showNotification('✅ Kaydedildi!', 'success');
}

async function deleteCustomCmd(command) {
  if (!confirm(`"!${command}" komutunu silmek istediğinize emin misiniz?`)) return;
  await fetch(`/api/admin/channel/${currentChannelId}/custom-command/${command}`, { method: 'DELETE' });
  loadCustomCommands(); showNotification('✅ Silindi', 'success');
}

// ========== POOLS ==========
async function loadPools() {
  if (!currentChannelId) {
    document.getElementById('pools-list').innerHTML = '<div class="empty-state">Önce kanal seçin</div>';
    return;
  }

  try {
    const res = await fetch(`/api/admin/channel/${currentChannelId}/pools`);
    const pools = await res.json();

    document.getElementById('pools-list').innerHTML = pools.length > 0 ? pools.map(pool => `
      <div class="pool-item">
        <div class="pool-header">
          <span class="pool-name">{havuz[${esc(pool.pool_name)}]}</span>
          <button class="btn btn-small btn-danger" onclick="deletePool('${esc(pool.pool_name)}')">🗑️</button>
        </div>
        <div class="pool-values">${esc(pool.values)}</div>
      </div>
    `).join('') : '<div class="empty-state">Henüz havuz yok</div>';
  } catch (e) {
    document.getElementById('pools-list').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

function openAddPoolModal() {
  openModal('➕ Yeni Havuz', `
    <div class="form-group">
      <label>Havuz Adı</label>
      <input type="text" id="new-pool-name" class="input" placeholder="renk">
    </div>
    <div class="form-group">
      <label>Değerler (virgülle ayır)</label>
      <textarea id="new-pool-values" class="input" rows="3" placeholder="kirmizi, mavi, yesil, sari"></textarea>
    </div>
    <button class="btn btn-primary" onclick="saveNewPool()">💾 Kaydet</button>
  `);
}

async function saveNewPool() {
  const pool_name = document.getElementById('new-pool-name').value.trim().toLowerCase();
  const values = document.getElementById('new-pool-values').value;

  if (!pool_name || !values) {
    showNotification('Havuz adı ve değerler gerekli!', 'error');
    return;
  }

  await fetch(`/api/admin/channel/${currentChannelId}/pool`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pool_name, values })
  });

  closeModal(); loadPools(); showNotification('✅ Havuz eklendi!', 'success');
}

async function deletePool(poolName) {
  if (!confirm(`"${poolName}" havuzunu silmek istediğinize emin misiniz?`)) return;
  await fetch(`/api/admin/channel/${currentChannelId}/pool/${poolName}`, { method: 'DELETE' });
  loadPools(); showNotification('✅ Silindi', 'success');
}

// ========== GAME TOGGLE ==========
async function loadGameStatus() {
  if (!currentChannelId) return;

  try {
    const res = await fetch(`/api/admin/channel/${currentChannelId}/game-status`);
    const data = await res.json();

    document.getElementById('game-enabled-toggle').checked = data.game_enabled;
    document.getElementById('game-status-text').textContent = data.game_enabled ? 'Açık' : 'Kapalı';
  } catch (e) {
    console.error('Game status error:', e);
  }
}

async function toggleGame(enabled) {
  if (!currentChannelId) {
    showNotification('Önce kanal seçin', 'error');
    return;
  }

  await fetch(`/api/admin/channel/${currentChannelId}/game-toggle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });

  document.getElementById('game-status-text').textContent = enabled ? 'Açık' : 'Kapalı';
  showNotification(enabled ? '🎮 RPG Oyun açıldı!' : '⏸️ RPG Oyun kapatıldı', 'success');
}

// ========== SUGGESTIONS ==========
let suggestionsPage = 1;

async function loadSuggestions(page = 1) {
  suggestionsPage = page;

  if (!currentChannelId) {
    document.getElementById('suggestions-list').innerHTML = '<div class="empty-state">Önce kanal seçin</div>';
    document.getElementById('suggestions-pagination').innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`/api/admin/channel/${currentChannelId}/suggestions?page=${page}&limit=10`);
    const data = await res.json();

    const statusLabels = {
      pending: '⏳ Beklemede',
      reviewed: '👀 İncelendi',
      approved: '✅ Onaylandı',
      rejected: '❌ Reddedildi'
    };

    document.getElementById('suggestions-list').innerHTML = data.suggestions.length > 0 ? data.suggestions.map(s => `
      <div class="suggestion-item status-${s.status}">
        <div class="suggestion-header">
          <span class="suggestion-user">@${esc(s.username)}</span>
          <span class="suggestion-date">${new Date(s.created_at * 1000).toLocaleString('tr-TR')}</span>
        </div>
        <div class="suggestion-content">${esc(s.content)}</div>
        <div class="suggestion-actions">
          <span class="suggestion-status">${statusLabels[s.status] || s.status}</span>
          <select onchange="updateSuggestionStatus(${s.id}, this.value)">
            <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>⏳ Beklemede</option>
            <option value="reviewed" ${s.status === 'reviewed' ? 'selected' : ''}>👀 İncelendi</option>
            <option value="approved" ${s.status === 'approved' ? 'selected' : ''}>✅ Onaylandı</option>
            <option value="rejected" ${s.status === 'rejected' ? 'selected' : ''}>❌ Reddedildi</option>
          </select>
          <button class="btn btn-small btn-danger" onclick="deleteSuggestion(${s.id})">🗑️</button>
        </div>
      </div>
    `).join('') : '<div class="empty-state">Henüz öneri yok. Kullanıcılar !öneri komutu ile öneri gönderebilir.</div>';

    // Pagination
    let paginationHtml = '';
    if (data.totalPages > 1) {
      paginationHtml = '<div class="pagination-controls">';
      if (page > 1) {
        paginationHtml += `<button class="btn btn-small" onclick="loadSuggestions(${page - 1})">◀ Önceki</button>`;
      }
      paginationHtml += `<span class="page-info">Sayfa ${page} / ${data.totalPages} (${data.total} öneri)</span>`;
      if (page < data.totalPages) {
        paginationHtml += `<button class="btn btn-small" onclick="loadSuggestions(${page + 1})">Sonraki ▶</button>`;
      }
      paginationHtml += '</div>';
    }
    document.getElementById('suggestions-pagination').innerHTML = paginationHtml;
  } catch (e) {
    document.getElementById('suggestions-list').innerHTML = '<div class="empty-state">Yüklenemedi</div>';
  }
}

async function updateSuggestionStatus(suggestionId, status) {
  await fetch(`/api/admin/channel/${currentChannelId}/suggestion/${suggestionId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  showNotification('✅ Durum güncellendi', 'success');
  loadSuggestions(suggestionsPage);
}

async function deleteSuggestion(suggestionId) {
  if (!confirm('Bu öneriyi silmek istediğinize emin misiniz?')) return;
  await fetch(`/api/admin/channel/${currentChannelId}/suggestion/${suggestionId}`, { method: 'DELETE' });
  showNotification('✅ Silindi', 'success');
  loadSuggestions(suggestionsPage);
}
