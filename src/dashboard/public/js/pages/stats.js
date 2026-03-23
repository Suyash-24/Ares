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
      <!-- Header -->
      <div class="flex justify-between items-end mb-12">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 mb-4">
            <span class="material-symbols-outlined text-primary text-sm">monitoring</span>
            <span class="text-[10px] font-label text-primary uppercase tracking-[0.15em] font-bold">Telemetry Center</span>
          </div>
          <h2 class="text-4xl font-headline font-extrabold tracking-tighter text-on-surface mb-2">Analytics & Insights</h2>
          <p class="text-on-surface-variant font-body max-w-xl">Deep-space telemetry from your server. Monitoring growth, activity, and distribution.</p>
        </div>
        <div class="flex gap-3">
          <button class="px-5 py-2.5 rounded-full bg-surface-container-high ghost-border text-on-surface text-sm font-label font-medium hover:bg-surface-container-highest transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">calendar_today</span>
            Last ${stats?.lookback || 14} Days
          </button>
        </div>
      </div>

      <!-- Stats Overview -->
      <section class="grid grid-cols-1 md:grid-cols-4 gap-5 mb-12">
        <div class="cosmic-card p-7 rounded-xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-24 h-24 bg-primary/8 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-primary/15 transition-all duration-500"></div>
          <p class="text-primary font-label text-[10px] tracking-widest uppercase mb-2 font-bold">Messages</p>
          <h3 class="text-4xl font-headline font-extrabold text-on-surface">${formatNumber(stats?.totalMessages || 0)}</h3>
          <p class="text-on-surface-variant text-xs mt-2 font-label">Last ${stats?.lookback || 14} days</p>
        </div>
        <div class="cosmic-card p-7 rounded-xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-24 h-24 bg-secondary/8 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-secondary/15 transition-all duration-500"></div>
          <p class="text-secondary font-label text-[10px] tracking-widest uppercase mb-2 font-bold">Voice Minutes</p>
          <h3 class="text-4xl font-headline font-extrabold text-on-surface">${formatNumber(stats?.totalVoiceMinutes || 0)}</h3>
        </div>
        <div class="cosmic-card p-7 rounded-xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-24 h-24 bg-tertiary-container/8 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-tertiary-container/15 transition-all duration-500"></div>
          <p class="text-tertiary font-label text-[10px] tracking-widest uppercase mb-2 font-bold">Joins</p>
          <h3 class="text-4xl font-headline font-extrabold text-on-surface">${formatNumber(stats?.totalJoins || 0)}</h3>
        </div>
        <div class="cosmic-card p-7 rounded-xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-24 h-24 bg-error/8 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-error/15 transition-all duration-500"></div>
          <p class="text-error font-label text-[10px] tracking-widest uppercase mb-2 font-bold">Leaves</p>
          <h3 class="text-4xl font-headline font-extrabold text-on-surface">${formatNumber(stats?.totalLeaves || 0)}</h3>
        </div>
      </section>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Top Chatters -->
        <div class="cosmic-card p-8 rounded-xl">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 rounded-xl bg-primary/10">
              <span class="material-symbols-outlined text-primary text-xl">leaderboard</span>
            </div>
            <h4 class="text-lg font-headline font-bold text-on-surface">Top Chatters</h4>
          </div>
          <p class="text-sm text-on-surface-variant mb-6">Most active members</p>
          ${topUsers && topUsers.length ? topUsers.map((u, i) => `
            <div class="flex items-center gap-4 py-3" style="${i < topUsers.length - 1 ? 'border-bottom: 1px solid rgba(73,68,84,0.08);' : ''}">
              <span class="w-8 text-center font-headline font-extrabold text-sm ${i === 0 ? 'text-primary' : i === 1 ? 'text-secondary' : i === 2 ? 'text-tertiary' : 'text-on-surface-variant'}">${i + 1}</span>
              <img class="w-8 h-8 rounded-xl ghost-border" src="${u.avatar || 'https://cdn.discordapp.com/embed/avatars/' + (i % 5) + '.png'}" alt="">
              <span class="flex-1 text-sm text-on-surface truncate">${escapeHtml(u.username)}</span>
              <span class="text-sm font-headline font-bold text-on-surface">${formatNumber(u.messages)}</span>
            </div>
          `).join('') : '<p class="text-on-surface-variant text-sm">No data yet</p>'}
        </div>

        <!-- Daily chart (2/3 width) -->
        <div class="lg:col-span-2 cosmic-card p-8 rounded-xl neon-glow-primary">
          <div class="flex justify-between items-center mb-10">
            <div>
              <h4 class="text-lg font-headline font-bold text-on-surface">Daily Activity</h4>
              <p class="text-sm text-on-surface-variant">Real-time engagement velocity</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/15 animate-cosmic-pulse"></span>
              <span class="text-[10px] font-label text-on-surface-variant uppercase tracking-wider">Live</span>
            </div>
          </div>
          ${renderDailyChart(daily)}
        </div>
      </div>

      ${leaderboard?.enabled ? `
        <div class="cosmic-card p-8 rounded-xl mt-8">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2 rounded-xl bg-tertiary-container/10">
              <span class="material-symbols-outlined text-tertiary text-xl">emoji_events</span>
            </div>
            <h3 class="text-lg font-headline font-bold text-on-surface">XP Leaderboard</h3>
          </div>
          ${leaderboard.entries.length ? leaderboard.entries.map((e, i) => `
            <div class="flex items-center gap-4 py-3" style="${i < leaderboard.entries.length - 1 ? 'border-bottom: 1px solid rgba(73,68,84,0.08);' : ''}">
              <span class="w-8 text-center font-headline font-extrabold text-sm ${i === 0 ? 'text-primary' : i === 1 ? 'text-secondary' : i === 2 ? 'text-tertiary' : 'text-on-surface-variant'}">${i + 1}</span>
              <img class="w-8 h-8 rounded-xl ghost-border" src="${e.avatar || 'https://cdn.discordapp.com/embed/avatars/' + (i % 5) + '.png'}" alt="">
              <span class="flex-1 text-sm text-on-surface truncate">${escapeHtml(e.username)} <span class="text-on-surface-variant text-xs ml-2 font-label">Lv. ${e.level || 0}</span></span>
              <span class="text-sm font-headline font-bold text-on-surface">${formatNumber(e.totalXp || 0)} XP</span>
            </div>
          `).join('') : '<p class="text-on-surface-variant text-sm">No XP data yet</p>'}
        </div>
      ` : ''}
    `;

    document.getElementById('page-content').innerHTML = html;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}

function renderDailyChart(daily) {
  if (!daily || !Object.keys(daily).length) {
    return '<p class="text-on-surface-variant text-sm">No daily data available</p>';
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

  let bars = '<div style="display:flex;align-items:flex-end;gap:6px;height:140px;">';
  days.forEach((d, i) => {
    const h = Math.max(2, (values[i] / max) * 100);
    const label = d.slice(5);
    bars += `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;" title="${label}: ${values[i]} messages">
        <div style="width:100%;height:${h}%;background:linear-gradient(180deg, #d0bcff, #7f65c1);border-radius:8px 8px 3px 3px;min-height:2px;transition:height 0.6s cubic-bezier(0.22, 1, 0.36, 1);box-shadow:0 4px 12px rgba(208,188,255,0.15);"></div>
      </div>
    `;
  });
  bars += '</div>';
  bars += '<div style="display:flex;gap:6px;margin-top:10px;">';
  days.forEach((d, i) => {
    if (i % 3 === 0 || i === days.length - 1) {
      bars += `<div style="flex:1;text-align:center;font-size:0.58rem;color:#958ea0;font-family:'Space Grotesk',sans-serif;font-weight:600;letter-spacing:0.04em;">${d.slice(5)}</div>`;
    } else {
      bars += `<div style="flex:1;"></div>`;
    }
  });
  bars += '</div>';
  return bars;
}
