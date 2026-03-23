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

    const activeCount = Object.keys(config).filter(k => config[k]?.enabled).length;

    let html = `
      <!-- Header -->
      <div class="flex justify-between items-end mb-12">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 mb-4">
            <span class="material-symbols-outlined text-primary text-sm">tune</span>
            <span class="text-[10px] font-label text-primary uppercase tracking-[0.15em] font-bold">System Configuration</span>
          </div>
          <h2 class="text-4xl font-headline font-extrabold tracking-tighter text-on-surface mb-2">Configuration</h2>
          <p class="text-on-surface-variant font-body max-w-lg">Configure and toggle Ares' celestial powers across your server ecosystem.</p>
        </div>
        <div class="flex gap-4">
          <div class="cosmic-card rounded-xl p-6 min-w-[180px] gradient-edge-top">
            <span class="text-[10px] font-label uppercase tracking-widest text-primary block mb-2">Active Modules</span>
            <span class="text-3xl font-headline font-extrabold text-on-surface">${activeCount}</span>
            <span class="text-xs text-on-surface-variant font-label">/ ${CONFIG_MODULES.length}</span>
          </div>
        </div>
      </div>

      <!-- Module Grid -->
      <div class="space-y-6">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary">extension</span>
            <h3 class="text-xl font-headline font-bold text-on-surface">Bot Modules</h3>
          </div>
          <div class="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent"></div>
          <span class="text-xs font-label text-on-surface-variant">${CONFIG_MODULES.length} Modules</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;

    const moduleIcons = {
      automod: 'shield', antinuke: 'security', welcome: 'waving_hand',
      leveling: 'trending_up', starboard: 'star', logging: 'description',
      stats: 'monitoring', antiraid: 'crisis_alert', tickets: 'confirmation_number',
      birthday: 'cake'
    };

    CONFIG_MODULES.forEach((mod) => {
      const modConfig = config[mod.key] || {};
      const isEnabled = !!modConfig.enabled;
      const icon = moduleIcons[mod.key] || 'extension';
      const toggleBg = isEnabled ? 'bg-gradient-to-r from-primary-dim to-primary-container signature-glow' : 'bg-surface-container-highest';
      const toggleDot = isEnabled ? 'translate-x-6' : 'translate-x-1';
      const statusColor = isEnabled ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant bg-surface-container-highest';

      html += `
        <div class="cosmic-card p-6 rounded-xl group">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-start gap-4">
              <div class="p-2.5 rounded-xl bg-${isEnabled ? 'primary' : 'outline-variant'}/10 text-${isEnabled ? 'primary' : 'outline'}">
                <span class="material-symbols-outlined text-xl" ${isEnabled ? "style=\"font-variation-settings: 'FILL' 1;\"" : ''}>${icon}</span>
              </div>
              <div>
                <h4 class="font-headline font-bold text-base text-on-surface">${mod.name}</h4>
                <p class="text-xs text-on-surface-variant mt-1 leading-relaxed">${mod.desc}</p>
              </div>
            </div>
            <button class="relative inline-flex h-7 w-12 items-center rounded-full ${toggleBg} transition-all duration-300 flex-shrink-0 mt-1" onclick="toggleModule('${guildId}', '${mod.key}', ${!isEnabled})">
              <span class="inline-block h-5 w-5 ${toggleDot} transform rounded-full bg-white transition-transform duration-300 shadow-sm"></span>
            </button>
          </div>
          <div class="flex gap-2">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-wider ${statusColor}">${isEnabled ? 'ENABLED' : 'DISABLED'}</span>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
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
