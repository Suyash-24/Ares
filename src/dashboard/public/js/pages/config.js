// ── Config page ──
const CONFIG_MODULES = [
  { key: 'automod',   name: 'Automod',   icon: '🛡️', desc: 'Anti-invite, anti-spam, bad words and more' },
  { key: 'antinuke',  name: 'Antinuke',  icon: '☢️', desc: 'Protect against mass bans, kicks, channel deletions' },
  { key: 'welcome',   name: 'Welcome',   icon: '👋', desc: 'Welcome messages with embeds and placeholders' },
  { key: 'leveling',  name: 'Leveling',  icon: '📈', desc: 'XP system with role rewards and leaderboard' },
  { key: 'starboard', name: 'Starboard', icon: '⭐', desc: 'Pin popular messages to a starboard channel' },
  { key: 'logging',   name: 'Logging',   icon: '📋', desc: 'Comprehensive server event logging' },
  { key: 'stats',     name: 'Stats',     icon: '📊', desc: 'Track message, voice and join activity' },
  { key: 'antiraid',  name: 'Anti-Raid', icon: '🚨', desc: 'Join-rate based raid protection' },
  { key: 'tickets',   name: 'Tickets',   icon: '🎫', desc: 'Support ticket system with transcripts' },
  { key: 'birthday',  name: 'Birthday',  icon: '🎂', desc: 'Birthday announcements and role assignment' },
];

async function renderConfig({ guildId }) {
  showSidebar(guildId);
  setPageLoading(true);

  try {
    const config = await API.get(`/api/guilds/${guildId}/config`);
    if (!config) return;

    let html = `
      <div class="page-header">
        <h1 class="page-title">Configuration</h1>
        <p class="page-subtitle">Toggle and configure bot modules</p>
      </div>
      <div class="grid grid-2">
    `;

    CONFIG_MODULES.forEach((mod, i) => {
      const modConfig = config[mod.key] || {};
      const isEnabled = !!modConfig.enabled;

      html += `
        <div class="card module-card" style="animation-delay: ${i * 0.04}s">
          <div class="module-card-head">
            <span class="module-name"><span>${mod.icon}</span> ${mod.name}</span>
            <label class="toggle">
              <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleModule('${guildId}', '${mod.key}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p class="module-desc">${mod.desc}</p>
        </div>
      `;
    });

    html += `</div>`;
    document.getElementById('page-content').innerHTML = html;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}

async function toggleModule(guildId, mod, enabled) {
  try {
    await API.patch(`/api/guilds/${guildId}/config/${mod}`, { enabled });
    toast(`${mod.charAt(0).toUpperCase() + mod.slice(1)} ${enabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}
