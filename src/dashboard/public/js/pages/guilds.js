// ── Guild list page ──
async function renderGuilds() {
  showSidebar(null);
  setPageLoading(true);

  try {
    const guilds = await API.get('/api/guilds');
    if (!guilds) return;

    const botGuilds = guilds.filter(g => g.botPresent);
    const otherGuilds = guilds.filter(g => !g.botPresent);

    let html = `
      <div class="page-header">
        <h1 class="page-title">Your Servers</h1>
        <p class="page-subtitle">Select a server to manage</p>
      </div>
    `;

    if (botGuilds.length) {
      html += `<div class="grid grid-3" style="margin-bottom: 28px;">`;
      botGuilds.forEach((g, i) => {
        const iconUrl = guildIcon(g.id, g.icon);
        html += `
          <div class="card guild-card" style="animation-delay: ${i * 0.04}s" onclick="router.navigate('/guilds/${escapeHtml(g.id)}/overview')">
            <div class="guild-icon">
              ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="">` : escapeHtml(g.name.charAt(0))}
            </div>
            <div class="guild-info">
              <div class="guild-name">${escapeHtml(g.name)}</div>
              <div class="guild-meta">${g.memberCount ? formatNumber(g.memberCount) + ' members' : ''}</div>
            </div>
            <div class="guild-status"><span class="badge badge-success">Active</span></div>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (otherGuilds.length) {
      html += `<p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;">Servers without Ares</p>`;
      html += `<div class="grid grid-3">`;
      otherGuilds.forEach((g, i) => {
        const iconUrl = guildIcon(g.id, g.icon);
        html += `
          <div class="card guild-card" style="opacity: 0.5; animation-delay: ${i * 0.04}s; cursor: default;">
            <div class="guild-icon">
              ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="">` : escapeHtml(g.name.charAt(0))}
            </div>
            <div class="guild-info">
              <div class="guild-name">${escapeHtml(g.name)}</div>
            </div>
            <div class="guild-status"><span class="badge badge-warning">Invite Bot</span></div>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (!botGuilds.length && !otherGuilds.length) {
      html += `<div class="empty-state"><div class="icon">🏚️</div><div class="title">No servers found</div><div class="desc">You need Manage Server permission to see guilds here.</div></div>`;
    }

    document.getElementById('page-content').innerHTML = html;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}
