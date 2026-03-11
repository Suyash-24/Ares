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
      <div class="page-header">
        <h1 class="page-title">Music</h1>
        <p class="page-subtitle">Control the music player</p>
      </div>
    `;

    if (!data.active) {
      html += `
        <div class="card card-3d">
          <div class="empty-state">
            <div class="icon">🎵</div>
            <div class="title">No active player</div>
            <div class="desc">Play music using bot commands in your Discord server to control it here.</div>
          </div>
        </div>
      `;
    } else {
      const current = data.current;
      html += `
        <div class="card card-3d player-card" style="margin-bottom: 24px; animation: card3DIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);">
          <div class="player-art">
            ${current?.artwork ? `<img src="${escapeHtml(current.artwork)}" alt="">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;">🎵</div>'}
          </div>
          <div class="player-info">
            <div class="player-title">${current ? escapeHtml(current.title) : 'Nothing playing'}</div>
            <div class="player-author">${current ? escapeHtml(current.author || 'Unknown') : ''}</div>
            ${current?.duration ? `<div style="font-size:0.76rem;color:var(--text-muted);margin-top:4px;font-family:var(--font-mono);">${formatDuration(current.duration)}</div>` : ''}
          </div>
          <div class="player-controls">
            <button class="player-btn ${data.paused ? '' : 'active'}" onclick="musicAction('${guildId}', '${data.paused ? 'resume' : 'pause'}')">
              ${data.paused ? '▶' : '⏸'}
            </button>
            <button class="player-btn" onclick="musicAction('${guildId}', 'skip')">⏭</button>
          </div>
        </div>

        <!-- Queue -->
        <div class="card card-3d" style="animation: card3DIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.06s both;">
          <div class="card-header">
            <span class="card-title"><span class="icon">📜</span> Queue (${data.queueSize})</span>
          </div>
          ${data.queue.length ? `
            <div class="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Title</th><th>Author</th><th>Duration</th></tr></thead>
                <tbody>
                  ${data.queue.map((t, i) => `
                    <tr>
                      <td style="color:var(--text-muted)">${i + 1}</td>
                      <td>${escapeHtml(t.title || 'Unknown')}</td>
                      <td style="color:var(--text-dim)">${escapeHtml(t.author || '')}</td>
                      <td style="font-family:var(--font-mono);font-size:0.82rem;">${formatDuration(t.duration)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color:var(--text-dim); font-size: 0.86rem; padding: 8px 0;">Queue is empty</p>'}
        </div>
      `;
    }

    document.getElementById('page-content').innerHTML = html;
    init3DTilt('.card-3d');
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
