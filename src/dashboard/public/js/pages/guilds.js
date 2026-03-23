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
      <div class="mb-16">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 mb-6">
          <span class="w-2 h-2 rounded-full bg-primary animate-cosmic-pulse"></span>
          <span class="text-[10px] font-label text-primary uppercase tracking-[0.15em] font-bold">${guilds.length} Servers Available</span>
        </div>
        <h2 class="text-5xl font-headline font-extrabold tracking-tighter text-on-surface mb-3">Your Servers</h2>
        <p class="text-on-surface-variant font-body text-base max-w-lg">Select a server to manage with Ares. Servers with the bot active are ready for configuration.</p>
      </div>
    `;

    if (botGuilds.length) {
      html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">`;
      botGuilds.forEach((g) => {
        const iconUrl = guildIcon(g.id, g.icon);
        html += `
          <div class="cosmic-card p-6 rounded-xl cursor-pointer group" onclick="router.navigate('/guilds/${escapeHtml(g.id)}/overview')">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl overflow-hidden ghost-border group-hover:border-primary/30 transition-all flex items-center justify-center bg-surface-container text-2xl font-headline font-bold text-primary flex-shrink-0">
                ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="" class="w-full h-full object-cover">` : escapeHtml(g.name.charAt(0))}
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-on-surface truncate font-headline">${escapeHtml(g.name)}</h4>
                <p class="text-xs text-on-surface-variant font-label mt-0.5">${g.memberCount ? formatNumber(g.memberCount) + ' Members' : ''}</p>
              </div>
              <span class="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-[10px] font-label font-bold uppercase tracking-wider flex-shrink-0">Active</span>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (otherGuilds.length) {
      html += `
        <div class="h-px bg-outline-variant/10 mb-8"></div>
        <p class="text-[10px] text-outline uppercase tracking-[0.15em] font-label font-bold mb-5">Servers without Ares</p>
      `;
      html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">`;
      otherGuilds.forEach((g) => {
        const iconUrl = guildIcon(g.id, g.icon);
        html += `
          <div class="cosmic-card p-6 rounded-xl opacity-40 cursor-default">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl overflow-hidden ghost-border flex items-center justify-center bg-surface-container-low text-2xl font-headline font-bold text-outline flex-shrink-0">
                ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="" class="w-full h-full object-cover">` : escapeHtml(g.name.charAt(0))}
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-on-surface truncate font-headline">${escapeHtml(g.name)}</h4>
              </div>
              <span class="px-3 py-1 bg-error/10 text-error rounded-full text-[10px] font-label font-bold uppercase tracking-wider flex-shrink-0">Invite</span>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (!botGuilds.length && !otherGuilds.length) {
      html += `<div class="flex flex-col items-center justify-center py-24 text-center">
        <span class="material-symbols-outlined text-6xl text-outline mb-4">home</span>
        <h3 class="text-xl font-headline font-bold text-on-surface mb-2">No servers found</h3>
        <p class="text-on-surface-variant text-sm">You need Manage Server permission to see guilds here.</p>
      </div>`;
    }

    document.getElementById('page-content').innerHTML = html;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}
