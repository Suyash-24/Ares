// ── Stats page ──
async function renderStats({ guildId }) {
  showSidebar(guildId);
  setPageLoading(true);

  try {
    const [stats, topUsers, daily, leaderboard] = await Promise.all([
      API.get(`/api/guilds/${guildId}/stats`),
      API.get(`/api/guilds/${guildId}/stats/top-users?limit=10`),
      API.get(`/api/guilds/${guildId}/stats/daily`),
      API.get(`/api/guilds/${guildId}/stats/leaderboard?limit=15`)
    ]);

    let html = `
      <div class="page-header">
        <h1 class="page-title">Statistics</h1>
        <p class="page-subtitle">Server activity and leveling leaderboard</p>
      </div>

      <div class="grid grid-4" style="margin-bottom: 32px;">
        <div class="card card-3d stat-card">
          <span class="stat-label">Messages</span>
          <span class="stat-value">${formatNumber(stats?.totalMessages || 0)}</span>
          <span class="stat-sub">Last ${stats?.lookback || 14} days</span>
        </div>
        <div class="card card-3d stat-card">
          <span class="stat-label">Voice</span>
          <span class="stat-value">${formatNumber(stats?.totalVoiceMinutes || 0)}</span>
          <span class="stat-sub">Minutes</span>
        </div>
        <div class="card card-3d stat-card">
          <span class="stat-label">Joins</span>
          <span class="stat-value">${formatNumber(stats?.totalJoins || 0)}</span>
        </div>
        <div class="card card-3d stat-card">
          <span class="stat-label">Leaves</span>
          <span class="stat-value">${formatNumber(stats?.totalLeaves || 0)}</span>
        </div>
      </div>

      <div class="grid grid-2">
        <!-- Top message users -->
        <div class="card card-3d" style="animation: card3DIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.06s both;">
          <div class="card-header">
            <span class="card-title"><span class="icon">💬</span> Top Chatters</span>
          </div>
          ${topUsers && topUsers.length ? topUsers.map((u, i) => `
            <div class="lb-row">
              <span class="lb-rank ${i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : ''}">${i + 1}</span>
              <img class="lb-avatar" src="${u.avatar || `https://cdn.discordapp.com/embed/avatars/${i % 5}.png`}" alt="">
              <span class="lb-name">${escapeHtml(u.username)}</span>
              <span class="lb-value">${formatNumber(u.messages)}</span>
            </div>
          `).join('') : '<p style="color:var(--text-dim); font-size: 0.86rem;">No data yet</p>'}
        </div>

        <!-- Daily chart -->
        <div class="card card-3d" style="animation: card3DIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;">
          <div class="card-header">
            <span class="card-title"><span class="icon">📅</span> Daily Activity</span>
          </div>
          ${renderDailyChart(daily)}
        </div>
      </div>

      ${leaderboard?.enabled ? `
        <div class="card card-3d" style="margin-top: 24px; animation: card3DIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both;">
          <div class="card-header">
            <span class="card-title"><span class="icon">🏆</span> XP Leaderboard</span>
          </div>
          ${leaderboard.entries.length ? leaderboard.entries.map((e, i) => `
            <div class="lb-row">
              <span class="lb-rank ${i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : ''}">${i + 1}</span>
              <img class="lb-avatar" src="${e.avatar || `https://cdn.discordapp.com/embed/avatars/${i % 5}.png`}" alt="">
              <span class="lb-name">${escapeHtml(e.username)}<span style="color:var(--text-muted);font-size:0.75rem;margin-left:8px;">Lv. ${e.level || 0}</span></span>
              <span class="lb-value">${formatNumber(e.totalXp || 0)} XP</span>
            </div>
          `).join('') : '<p style="color:var(--text-dim);">No XP data yet</p>'}
        </div>
      ` : ''}
    `;

    document.getElementById('page-content').innerHTML = html;
    init3DTilt('.card-3d');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}

function renderDailyChart(daily) {
  if (!daily || !Object.keys(daily).length) {
    return '<p style="color:var(--text-dim); font-size: 0.86rem;">No daily data available</p>';
  }

  // Get last 14 days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const values = days.map(d => daily[d]?.messages || 0);
  const max = Math.max(...values, 1);

  let bars = '<div style="display:flex;align-items:flex-end;gap:5px;height:130px;">';
  days.forEach((d, i) => {
    const h = Math.max(2, (values[i] / max) * 100);
    const label = d.slice(5);
    bars += `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;" title="${label}: ${values[i]} messages">
        <div style="width:100%;height:${h}%;background:linear-gradient(180deg, #818cf8, #6366f1);border-radius:6px 6px 2px 2px;min-height:2px;transition:height 0.6s cubic-bezier(0.22, 1, 0.36, 1);box-shadow:0 2px 8px rgba(129,140,248,0.2);"></div>
      </div>
    `;
  });
  bars += '</div>';
  bars += '<div style="display:flex;gap:5px;margin-top:8px;">';
  days.forEach((d, i) => {
    if (i % 3 === 0 || i === days.length - 1) {
      bars += `<div style="flex:1;text-align:center;font-size:0.58rem;color:var(--text-muted);font-family:var(--font-display);font-weight:600;letter-spacing:0.02em;">${d.slice(5)}</div>`;
    } else {
      bars += `<div style="flex:1;"></div>`;
    }
  });
  bars += '</div>';
  return bars;
}
