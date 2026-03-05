// ── Moderation page ──
async function renderModeration({ guildId }) {
  showSidebar(guildId);
  setPageLoading(true);

  try {
    const data = await API.get(`/api/guilds/${guildId}/moderation/cases?limit=20`);
    if (!data) return;

    let html = `
      <div class="page-header">
        <h1 class="page-title">Moderation</h1>
        <p class="page-subtitle">View cases and take moderation actions</p>
      </div>

      <!-- Quick actions -->
      <div class="card" style="margin-bottom: 24px; animation: fadeUp 0.4s ease-out">
        <div class="card-header">
          <span class="card-title"><span class="icon">⚡</span> Quick Actions</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-ghost btn-sm" onclick="showModModal('${guildId}', 'kick')">👢 Kick</button>
          <button class="btn btn-ghost btn-sm" onclick="showModModal('${guildId}', 'ban')">🔨 Ban</button>
          <button class="btn btn-ghost btn-sm" onclick="showModModal('${guildId}', 'unban')">🔓 Unban</button>
          <button class="btn btn-ghost btn-sm" onclick="showModModal('${guildId}', 'timeout')">🔇 Timeout</button>
        </div>
      </div>

      <!-- Cases table -->
      <div class="card" style="animation: fadeUp 0.4s ease-out 0.05s both">
        <div class="card-header">
          <span class="card-title"><span class="icon">📋</span> Recent Cases (${data.total})</span>
        </div>
        ${data.cases.length ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Action</th><th>User</th><th>Moderator</th><th>Reason</th><th>Date</th></tr>
              </thead>
              <tbody>
                ${data.cases.map(c => `
                  <tr>
                    <td style="font-family: var(--font-mono); color: var(--text-muted);">${c.caseNumber || '-'}</td>
                    <td><span class="badge ${actionBadge(c.type)}">${escapeHtml(c.type)}</span></td>
                    <td style="font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(c.userId)}</td>
                    <td>${escapeHtml(c.moderator?.username || 'System')}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(c.reason || '-')}</td>
                    <td style="font-size: 0.8rem; color: var(--text-dim);">${c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty-state"><div class="icon">✅</div><div class="title">No cases</div><div class="desc">Clean record!</div></div>`}
      </div>
    `;

    document.getElementById('page-content').innerHTML = html;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}

function actionBadge(type) {
  if (['ban', 'tempban'].includes(type)) return 'badge-danger';
  if (['kick', 'softban'].includes(type)) return 'badge-warning';
  if (['warn'].includes(type)) return 'badge-accent';
  if (['unban', 'unmute'].includes(type)) return 'badge-success';
  return 'badge-accent';
}

function showModModal(guildId, action) {
  // Remove existing modal
  document.querySelector('.mod-modal-overlay')?.remove();

  const labels = { kick: 'Kick Member', ban: 'Ban User', unban: 'Unban User', timeout: 'Timeout Member' };

  const overlay = document.createElement('div');
  overlay.className = 'mod-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="card" style="width: 420px; max-width: 90vw; animation: fadeUp 0.3s ease-out;">
      <div class="card-header">
        <span class="card-title">${labels[action] || action}</span>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.mod-modal-overlay').remove()">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">User ID</label>
        <input class="input" id="mod-userid" placeholder="Enter user ID" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">Reason</label>
        <input class="input" id="mod-reason" placeholder="Optional reason">
      </div>
      ${action === 'timeout' ? `
        <div class="form-group">
          <label class="form-label">Duration (minutes)</label>
          <input class="input" id="mod-duration" type="number" value="10" min="1" max="40320">
        </div>
      ` : ''}
      <button class="btn ${action === 'ban' ? 'btn-danger' : 'btn-primary'}" style="width:100%" onclick="execModAction('${guildId}', '${action}')">
        Confirm ${labels[action] || action}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('mod-userid').focus();
}

async function execModAction(guildId, action) {
  const userId = document.getElementById('mod-userid')?.value?.trim();
  const reason = document.getElementById('mod-reason')?.value?.trim();
  if (!userId) return toast('Enter a user ID', 'error');

  try {
    const body = { userId, reason };
    if (action === 'timeout') {
      const mins = parseInt(document.getElementById('mod-duration')?.value) || 10;
      body.duration = mins * 60 * 1000;
    }
    await API.post(`/api/guilds/${guildId}/moderation/${action}`, body);
    toast(`${action} successful`, 'success');
    document.querySelector('.mod-modal-overlay')?.remove();
    renderModeration({ guildId });
  } catch (err) {
    toast(err.message, 'error');
  }
}
