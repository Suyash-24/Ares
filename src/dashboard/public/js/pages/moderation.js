// ── Moderation page ──
async function renderModeration({ guildId }) {
  showSidebar(guildId);
  setPageLoading(true);

  try {
    const data = await API.get(`/api/guilds/${guildId}/moderation/cases?limit=20`);
    if (!data) return;

    let html = `
      <!-- Header -->
      <div class="flex justify-between items-end mb-12">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-error/8 mb-4">
            <span class="material-symbols-outlined text-error text-sm">security</span>
            <span class="text-[10px] font-label text-error uppercase tracking-[0.15em] font-bold">Enforcement Center</span>
          </div>
          <h2 class="text-4xl font-headline font-extrabold tracking-tighter text-on-surface mb-2">Moderation</h2>
          <p class="text-on-surface-variant font-body max-w-lg">View cases and take moderation actions in real-time.</p>
        </div>
        <div class="flex gap-4">
          <div class="cosmic-card rounded-xl p-6 min-w-[180px]" style="border-top: 2px solid rgba(255, 180, 171, 0.2);">
            <span class="text-[10px] font-label uppercase tracking-widest text-error block mb-2">Total Cases</span>
            <span class="text-3xl font-headline font-extrabold text-on-surface">${data.total}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-12">
        <div class="flex items-center gap-4 mb-6">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-error">gavel</span>
            <h3 class="text-xl font-headline font-bold text-on-surface">Quick Actions</h3>
          </div>
          <div class="h-px flex-1 bg-gradient-to-r from-error/20 to-transparent"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button class="cosmic-card p-6 rounded-xl transition-all group text-left hover:border-error/20" onclick="showModModal('${guildId}', 'kick')">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h4 class="font-headline font-bold text-base text-on-surface">Kick</h4>
                <p class="text-xs text-on-surface-variant mt-1">Remove a member from the server.</p>
              </div>
              <div class="p-2 rounded-xl bg-error/10"><span class="material-symbols-outlined text-error text-xl">person_remove</span></div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-wider bg-error/10 text-error">MOD_ACTION</span>
          </button>
          <button class="cosmic-card p-6 rounded-xl transition-all group text-left hover:border-error/20" onclick="showModModal('${guildId}', 'ban')">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h4 class="font-headline font-bold text-base text-on-surface">Ban</h4>
                <p class="text-xs text-on-surface-variant mt-1">Permanently ban a user.</p>
              </div>
              <div class="p-2 rounded-xl bg-error/10"><span class="material-symbols-outlined text-error text-xl">gavel</span></div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-wider bg-error/10 text-error">ADMIN_ONLY</span>
          </button>
          <button class="cosmic-card p-6 rounded-xl transition-all group text-left hover:border-secondary/20" onclick="showModModal('${guildId}', 'unban')">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h4 class="font-headline font-bold text-base text-on-surface">Unban</h4>
                <p class="text-xs text-on-surface-variant mt-1">Revoke a user's ban.</p>
              </div>
              <div class="p-2 rounded-xl bg-secondary/10"><span class="material-symbols-outlined text-secondary text-xl">lock_open</span></div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-wider bg-secondary/10 text-secondary">MOD_ONLY</span>
          </button>
          <button class="cosmic-card p-6 rounded-xl transition-all group text-left hover:border-primary/20" onclick="showModModal('${guildId}', 'timeout')">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h4 class="font-headline font-bold text-base text-on-surface">Timeout</h4>
                <p class="text-xs text-on-surface-variant mt-1">Temporarily restrict user.</p>
              </div>
              <div class="p-2 rounded-xl bg-primary/10"><span class="material-symbols-outlined text-primary text-xl">timer</span></div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-wider bg-primary/10 text-primary">MOD_ONLY</span>
          </button>
        </div>
      </div>

      <!-- Cases Table -->
      <div class="cosmic-card rounded-xl overflow-hidden">
        <div class="px-8 py-6 flex justify-between items-center" style="border-bottom: 1px solid rgba(73,68,84,0.12);">
          <h4 class="text-lg font-headline font-bold text-on-surface">Recent Cases</h4>
          <span class="flex items-center gap-2 text-primary text-[10px] font-label uppercase tracking-widest">
            <span class="w-2 h-2 rounded-full bg-primary animate-cosmic-pulse"></span>
            ${data.total} Total
          </span>
        </div>
        ${data.cases.length ? `
          <div>
            ${data.cases.map((c, i) => `
              <div class="px-8 py-4 flex items-center justify-between hover:bg-surface-container-highest/30 transition-colors ${i < data.cases.length - 1 ? '' : ''}" style="${i < data.cases.length - 1 ? 'border-bottom: 1px solid rgba(73,68,84,0.08);' : ''}">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-${['ban','tempban'].includes(c.type) ? 'error' : ['kick','softban'].includes(c.type) ? 'tertiary-container' : 'primary'}/10 flex items-center justify-center">
                    <span class="material-symbols-outlined text-${['ban','tempban'].includes(c.type) ? 'error' : ['kick','softban'].includes(c.type) ? 'tertiary' : 'primary'} text-xl">${c.type === 'ban' ? 'gavel' : c.type === 'kick' ? 'person_remove' : c.type === 'unban' ? 'lock_open' : 'timer'}</span>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-on-surface font-headline">#${c.caseNumber || '-'} ${escapeHtml(c.type.toUpperCase())}</p>
                    <p class="text-xs text-on-surface-variant">User: ${escapeHtml(c.userId)} • By: ${escapeHtml(c.moderator?.username || 'System')}</p>
                  </div>
                </div>
                <span class="text-xs text-on-surface-variant font-label">${c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '-'}</span>
              </div>
            `).join('')}
          </div>
        ` : '<div class="px-8 py-16 text-center text-on-surface-variant text-sm">No moderation cases yet.</div>'}
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

function actionBadgeTw(type) {
  if (['ban', 'tempban'].includes(type)) return 'bg-error/10 text-error';
  if (['kick', 'softban'].includes(type)) return 'bg-tertiary-container/10 text-tertiary';
  if (['warn'].includes(type)) return 'bg-primary/10 text-primary';
  if (['unban', 'unmute'].includes(type)) return 'bg-secondary/10 text-secondary';
  return 'bg-primary/10 text-primary';
}

function showModModal(guildId, action) {
  document.querySelector('.mod-modal-overlay')?.remove();

  const labels = { kick: 'Kick Member', ban: 'Ban User', unban: 'Unban User', timeout: 'Timeout Member' };

  const overlay = document.createElement('div');
  overlay.className = 'mod-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(16px);z-index:1000;display:flex;align-items:center;justify-content:center;';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="bg-surface-container-high rounded-2xl ghost-border ambient-shadow p-8 w-[440px] max-w-[90vw]" style="box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(132,85,239,0.08);">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-headline font-extrabold text-on-surface">${labels[action] || action}</h3>
        <button class="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container-highest" onclick="this.closest('.mod-modal-overlay').remove()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="text-[10px] font-label text-on-surface-variant uppercase tracking-wider block mb-2 font-bold">User ID</label>
          <input class="w-full bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 outline-none ghost-border focus:bg-surface-container transition-all" id="mod-userid" placeholder="Enter user ID" autocomplete="off">
        </div>
        <div>
          <label class="text-[10px] font-label text-on-surface-variant uppercase tracking-wider block mb-2 font-bold">Reason</label>
          <input class="w-full bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 outline-none ghost-border focus:bg-surface-container transition-all" id="mod-reason" placeholder="Optional reason">
        </div>
        ${action === 'timeout' ? `
          <div>
            <label class="text-[10px] font-label text-on-surface-variant uppercase tracking-wider block mb-2 font-bold">Duration (minutes)</label>
            <input class="w-full bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 outline-none ghost-border focus:bg-surface-container transition-all" id="mod-duration" type="number" value="10" min="1" max="40320">
          </div>
        ` : ''}
        <button class="w-full mt-2 px-6 py-3.5 ${action === 'ban' ? 'bg-gradient-to-r from-error-dim to-error' : 'bg-gradient-to-r from-primary-dim to-primary-container'} text-white rounded-xl font-headline font-bold hover:scale-[1.02] active:scale-[0.98] transition-all text-sm" onclick="execModAction('${guildId}', '${action}')">
          Confirm ${labels[action] || action}
        </button>
      </div>
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
