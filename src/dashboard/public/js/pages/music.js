// ── Music page ──
let musicPollInterval = null;

async function renderMusic({ guildId }) {
  showSidebar(guildId);
  clearMusicPoll();
  setPageLoading(true);

  try {
    await updateMusicUI(guildId);
    // Poll every 5 seconds for live updates
    musicPollInterval = setInterval(() => updateMusicUI(guildId, true), 5000);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}

function clearMusicPoll() {
  if (musicPollInterval) { clearInterval(musicPollInterval); musicPollInterval = null; }
}

async function updateMusicUI(guildId, silent = false) {
  try {
    const data = await API.get(`/api/guilds/${guildId}/music`);
    if (!data) return;

    let html = `
      <div class="mb-12">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tertiary-container/10 mb-4">
          <span class="material-symbols-outlined text-tertiary text-sm">graphic_eq</span>
          <span class="text-[10px] font-label text-tertiary uppercase tracking-[0.15em] font-bold">Audio Stream</span>
        </div>
        <h2 class="text-4xl font-headline font-extrabold tracking-tighter text-on-surface mb-2">Music</h2>
        <p class="text-on-surface-variant font-body">Control the music player for your server.</p>
      </div>
    `;

    if (!data.active) {
      html += `
        <div class="cosmic-card p-12 rounded-2xl">
          <div class="flex flex-col items-center py-12 text-center">
            <div class="w-24 h-24 rounded-3xl bg-tertiary-container/10 flex items-center justify-center mb-6 animate-float">
              <span class="material-symbols-outlined text-5xl text-tertiary">music_note</span>
            </div>
            <h3 class="text-2xl font-headline font-extrabold text-on-surface mb-3">No active player</h3>
            <p class="text-on-surface-variant text-sm max-w-md">Play music using bot commands in your Discord server to control it from here.</p>
          </div>
        </div>
      `;
    } else {
      const current = data.current;
      html += `
        <!-- Now Playing -->
        <div class="cosmic-card p-8 rounded-2xl mb-8 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-64 h-64 bg-tertiary-container/5 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
          <div class="absolute bottom-0 left-0 w-48 h-48 bg-primary-dim/5 rounded-full -ml-24 -mb-24 blur-[60px]"></div>
          <div class="relative z-10 flex items-center gap-8">
            <div class="w-28 h-28 rounded-2xl overflow-hidden ghost-border flex-shrink-0 bg-surface-container flex items-center justify-center">
              ${current?.artwork ? `<img src="${escapeHtml(current.artwork)}" alt="" class="w-full h-full object-cover">` : '<span class="material-symbols-outlined text-5xl text-tertiary animate-cosmic-pulse">music_note</span>'}
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-[10px] font-label text-tertiary uppercase tracking-[0.15em] font-bold mb-1 block">Now Playing</span>
              <h3 class="text-2xl font-headline font-extrabold text-on-surface truncate mb-1">${current ? escapeHtml(current.title) : 'Nothing playing'}</h3>
              <p class="text-on-surface-variant text-sm">${current ? escapeHtml(current.author || 'Unknown Artist') : ''}</p>
              ${current?.duration ? `<p class="text-xs text-on-surface-variant mt-3 font-label tracking-wider">${formatDuration(current.duration)}</p>` : ''}
            </div>
            <div class="flex items-center gap-3">
              <button class="w-14 h-14 rounded-2xl ${data.paused ? 'bg-gradient-to-br from-primary-dim to-primary-container signature-glow' : 'bg-surface-container ghost-border'} flex items-center justify-center hover:scale-105 active:scale-95 transition-all" onclick="musicAction('${guildId}', '${data.paused ? 'resume' : 'pause'}')">
                <span class="material-symbols-outlined text-white text-2xl" style="font-variation-settings: 'FILL' 1;">${data.paused ? 'play_arrow' : 'pause'}</span>
              </button>
              <button class="w-14 h-14 rounded-2xl bg-surface-container ghost-border flex items-center justify-center hover:scale-105 active:scale-95 transition-all hover:bg-surface-container-high" onclick="musicAction('${guildId}', 'skip')">
                <span class="material-symbols-outlined text-on-surface text-2xl">skip_next</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Queue -->
        <div class="cosmic-card p-8 rounded-2xl">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2 rounded-xl bg-secondary/10">
              <span class="material-symbols-outlined text-secondary text-xl">queue_music</span>
            </div>
            <h3 class="text-lg font-headline font-bold text-on-surface">Queue</h3>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-wider bg-secondary/10 text-secondary">${data.queueSize} tracks</span>
          </div>
          ${data.queue.length ? `
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-on-surface-variant text-[10px] font-label uppercase tracking-wider" style="border-bottom: 1px solid rgba(73,68,84,0.12);">
                    <th class="py-3 px-4 font-bold">#</th><th class="py-3 px-4 font-bold">Title</th><th class="py-3 px-4 font-bold">Author</th><th class="py-3 px-4 font-bold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.queue.map((t, i) => `
                    <tr class="hover:bg-surface-container-highest/30 transition-colors" style="${i < data.queue.length - 1 ? 'border-bottom: 1px solid rgba(73,68,84,0.06);' : ''}">
                      <td class="py-3.5 px-4 text-on-surface-variant font-label">${i + 1}</td>
                      <td class="py-3.5 px-4 font-medium text-on-surface">${escapeHtml(t.title || 'Unknown')}</td>
                      <td class="py-3.5 px-4 text-on-surface-variant">${escapeHtml(t.author || '')}</td>
                      <td class="py-3.5 px-4 font-label text-xs text-on-surface-variant">${formatDuration(t.duration)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p class="text-on-surface-variant text-sm">Queue is empty — add tracks via Discord commands.</p>'}
        </div>
      `;
    }

    document.getElementById('page-content').innerHTML = html;
  } catch (err) {
    if (!silent) toast(err.message, 'error');
  }
}

async function musicAction(guildId, action) {
  try {
    await API.post(`/api/guilds/${guildId}/music/${action}`);
    await updateMusicUI(guildId);
  } catch (err) {
    toast(err.message, 'error');
  }
}
