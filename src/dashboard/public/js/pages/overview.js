// ── Guild overview page ──
async function renderOverview({ guildId }) {
  showSidebar(guildId);
  setPageLoading(true);

  try {
    const [guild, stats, config] = await Promise.all([
      API.get(`/api/guilds/${guildId}`),
      API.get(`/api/guilds/${guildId}/stats`),
      API.get(`/api/guilds/${guildId}/config`)
    ]);
    if (!guild) return;

    const enabledModules = [];
    if (config.automod?.enabled) enabledModules.push('Automod');
    if (config.antinuke?.enabled) enabledModules.push('Antinuke');
    if (config.leveling?.enabled) enabledModules.push('Leveling');
    if (config.welcome?.enabled) enabledModules.push('Welcome');
    if (config.starboard?.enabled) enabledModules.push('Starboard');
    if (config.stats?.enabled) enabledModules.push('Stats');

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${escapeHtml(guild.name)}</h1>
        <p class="page-subtitle">Server Overview</p>
      </div>

      <div class="grid grid-4" style="margin-bottom: 32px;">
        <div class="card card-3d stat-card">
          <span class="stat-label">Members</span>
          <span class="stat-value">${formatNumber(guild.memberCount)}</span>
        </div>
        <div class="card card-3d stat-card">
          <span class="stat-label">Messages (${stats.lookback || 14}d)</span>
          <span class="stat-value">${formatNumber(stats.totalMessages || 0)}</span>
        </div>
        <div class="card card-3d stat-card">
          <span class="stat-label">Voice Minutes</span>
          <span class="stat-value">${formatNumber(stats.totalVoiceMinutes || 0)}</span>
        </div>
        <div class="card card-3d stat-card">
          <span class="stat-label">Joins / Leaves</span>
          <span class="stat-value">${formatNumber(stats.totalJoins || 0)} / ${formatNumber(stats.totalLeaves || 0)}</span>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card card-3d">
          <div class="card-header">
            <span class="card-title"><span class="icon">📊</span> Server Info</span>
          </div>
          <table>
            <tr><td style="color:var(--text-dim); font-weight: 550;">Channels</td><td>${guild.channels}</td></tr>
            <tr><td style="color:var(--text-dim); font-weight: 550;">Roles</td><td>${guild.roles}</td></tr>
            <tr><td style="color:var(--text-dim); font-weight: 550;">Boost Level</td><td>Tier ${guild.boostLevel}</td></tr>
            <tr><td style="color:var(--text-dim); font-weight: 550;">Boosts</td><td>${guild.boostCount}</td></tr>
            <tr><td style="color:var(--text-dim); font-weight: 550;">Active Users</td><td>${stats.activeUsers || 0}</td></tr>
            <tr><td style="color:var(--text-dim); font-weight: 550;">Active Channels</td><td>${stats.activeChannels || 0}</td></tr>
          </table>
        </div>

        <div class="card card-3d">
          <div class="card-header">
            <span class="card-title"><span class="icon">⚡</span> Active Modules</span>
          </div>
          ${enabledModules.length
            ? `<div style="display: flex; flex-wrap: wrap; gap: 8px;">${enabledModules.map(m => `<span class="badge badge-accent">${m}</span>`).join('')}</div>`
            : '<p style="color:var(--text-dim); font-size: 0.86rem;">No modules enabled yet. Head to the config page to set them up.</p>'
          }
        </div>
      </div>
    `;
    init3DTilt('.card-3d');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}
