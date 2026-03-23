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
      <!-- Welcome Banner -->
      <section class="mb-16 relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-dim p-12">
        <div class="relative z-10 flex justify-between items-center">
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 mb-6">
              <span class="w-1.5 h-1.5 rounded-full bg-primary animate-cosmic-pulse"></span>
              <span class="text-[10px] font-label text-primary uppercase tracking-[0.15em] font-bold">System Online</span>
            </div>
            <h2 class="text-4xl font-headline font-extrabold text-on-surface mb-4 tracking-tight">Welcome back, <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">${escapeHtml(guild.name)}</span></h2>
            <p class="text-on-surface-variant font-body leading-relaxed">Ares is managing your server. Check your stats, enable modules, and configure settings from this dashboard.</p>
            <div class="mt-8 flex gap-4">
              <button class="px-6 py-3 bg-gradient-to-r from-primary-dim to-primary-container rounded-xl font-bold text-on-primary-container font-headline text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all signature-glow" data-link="/guilds/${guildId}/config">
                Configure Modules
              </button>
              <button class="px-6 py-3 ghost-border rounded-xl font-bold text-on-surface font-headline text-sm hover:bg-surface-container-highest/50 transition-all" data-link="/guilds/${guildId}/stats">
                View Statistics
              </button>
            </div>
          </div>
          <div class="hidden lg:block w-48 h-48 opacity-15">
            <span class="material-symbols-outlined !text-[180px] text-primary rotate-12 animate-float">auto_awesome</span>
          </div>
        </div>
        <div class="absolute top-0 right-0 w-full h-full pointer-events-none">
          <div class="absolute -top-24 -right-24 w-96 h-96 bg-primary-dim/8 rounded-full blur-[100px]"></div>
          <div class="absolute bottom-0 left-0 w-72 h-72 bg-secondary/5 rounded-full blur-[80px]"></div>
        </div>
      </section>

      <!-- Stats Grid -->
      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
        <div class="cosmic-card p-8 rounded-xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/12 transition-colors duration-500"></div>
          <div class="relative z-10">
            <div class="flex justify-between items-start mb-6">
              <div class="p-3 bg-primary/10 rounded-xl text-primary">
                <span class="material-symbols-outlined">group</span>
              </div>
            </div>
            <p class="text-4xl font-headline font-extrabold text-on-surface tracking-tighter">${formatNumber(guild.memberCount)}</p>
            <p class="text-xs font-label uppercase tracking-widest text-primary mt-2">Members</p>
          </div>
        </div>
        <div class="cosmic-card p-8 rounded-xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-secondary/12 transition-colors duration-500"></div>
          <div class="relative z-10">
            <div class="flex justify-between items-start mb-6">
              <div class="p-3 bg-secondary/10 rounded-xl text-secondary">
                <span class="material-symbols-outlined">chat</span>
              </div>
              <span class="text-xs text-on-surface-variant font-label">${stats.lookback || 14}d</span>
            </div>
            <p class="text-4xl font-headline font-extrabold text-on-surface tracking-tighter">${formatNumber(stats.totalMessages || 0)}</p>
            <p class="text-xs font-label uppercase tracking-widest text-secondary mt-2">Messages</p>
          </div>
        </div>
        <div class="cosmic-card p-8 rounded-xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-tertiary-container/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-tertiary-container/12 transition-colors duration-500"></div>
          <div class="relative z-10">
            <div class="flex justify-between items-start mb-6">
              <div class="p-3 bg-tertiary-container/10 rounded-xl text-tertiary">
                <span class="material-symbols-outlined">mic</span>
              </div>
            </div>
            <p class="text-4xl font-headline font-extrabold text-on-surface tracking-tighter">${formatNumber(stats.totalVoiceMinutes || 0)}</p>
            <p class="text-xs font-label uppercase tracking-widest text-tertiary mt-2">Voice Minutes</p>
          </div>
        </div>
        <div class="cosmic-card p-8 rounded-xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/12 transition-colors duration-500"></div>
          <div class="relative z-10">
            <div class="flex justify-between items-start mb-6">
              <div class="p-3 bg-primary/10 rounded-xl text-primary">
                <span class="material-symbols-outlined">swap_vert</span>
              </div>
            </div>
            <p class="text-4xl font-headline font-extrabold text-on-surface tracking-tighter">${formatNumber(stats.totalJoins || 0)} / ${formatNumber(stats.totalLeaves || 0)}</p>
            <p class="text-xs font-label uppercase tracking-widest text-primary mt-2">Joins / Leaves</p>
          </div>
        </div>
      </section>

      <!-- Main Layout Split -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <!-- Left Column: Server Info -->
        <div class="lg:col-span-2">
          <div class="flex justify-between items-end mb-8">
            <div>
              <h3 class="text-2xl font-headline font-extrabold text-on-surface">Server Details</h3>
              <p class="text-on-surface-variant text-sm mt-1">Infrastructure and activity overview.</p>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between p-5 cosmic-card rounded-xl group hover:border-primary/20 transition-all">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center"><span class="material-symbols-outlined text-primary text-xl">tag</span></div>
                <div><h4 class="font-bold text-on-surface font-headline">Channels</h4><p class="text-xs text-on-surface-variant">${guild.channels} channels configured</p></div>
              </div>
              <span class="text-3xl font-headline font-extrabold text-on-surface">${guild.channels}</span>
            </div>
            <div class="flex items-center justify-between p-5 cosmic-card rounded-xl group hover:border-secondary/20 transition-all">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-secondary/8 flex items-center justify-center"><span class="material-symbols-outlined text-secondary text-xl">shield_person</span></div>
                <div><h4 class="font-bold text-on-surface font-headline">Roles</h4><p class="text-xs text-on-surface-variant">${guild.roles} roles in hierarchy</p></div>
              </div>
              <span class="text-3xl font-headline font-extrabold text-on-surface">${guild.roles}</span>
            </div>
            <div class="flex items-center justify-between p-5 cosmic-card rounded-xl group hover:border-tertiary-container/20 transition-all">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-tertiary-container/8 flex items-center justify-center"><span class="material-symbols-outlined text-tertiary text-xl">diamond</span></div>
                <div><h4 class="font-bold text-on-surface font-headline">Boost Level</h4><p class="text-xs text-on-surface-variant">Tier ${guild.boostLevel} • <span class="text-secondary">${guild.boostCount} boosts</span></p></div>
              </div>
              <span class="text-3xl font-headline font-extrabold text-on-surface">${guild.boostLevel}</span>
            </div>
            <div class="flex items-center justify-between p-5 cosmic-card rounded-xl group hover:border-primary/20 transition-all">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center"><span class="material-symbols-outlined text-primary text-xl">group</span></div>
                <div><h4 class="font-bold text-on-surface font-headline">Active Users</h4><p class="text-xs text-on-surface-variant">${stats.activeUsers || 0} active in last 14 days</p></div>
              </div>
              <span class="text-3xl font-headline font-extrabold text-on-surface">${stats.activeUsers || 0}</span>
            </div>
          </div>
        </div>
        <!-- Right Column: Quick Actions & Modules -->
        <div class="space-y-8">
          <div>
            <h3 class="text-xl font-headline font-extrabold text-on-surface mb-6">Quick Navigation</h3>
            <div class="grid grid-cols-2 gap-3">
              <button class="flex flex-col items-center justify-center p-6 cosmic-card rounded-xl hover:bg-primary/8 transition-all group" data-link="/guilds/${guildId}/config">
                <span class="material-symbols-outlined text-primary mb-3 text-3xl transition-transform group-hover:scale-110" style="font-variation-settings: 'FILL' 1;">tune</span>
                <span class="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface">Config</span>
              </button>
              <button class="flex flex-col items-center justify-center p-6 cosmic-card rounded-xl hover:bg-secondary/8 transition-all group" data-link="/guilds/${guildId}/moderation">
                <span class="material-symbols-outlined text-secondary mb-3 text-3xl transition-transform group-hover:scale-110" style="font-variation-settings: 'FILL' 1;">security</span>
                <span class="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface">Moderation</span>
              </button>
              <button class="flex flex-col items-center justify-center p-6 cosmic-card rounded-xl hover:bg-tertiary-container/8 transition-all group" data-link="/guilds/${guildId}/music">
                <span class="material-symbols-outlined text-tertiary mb-3 text-3xl transition-transform group-hover:scale-110" style="font-variation-settings: 'FILL' 1;">graphic_eq</span>
                <span class="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface">Music</span>
              </button>
              <button class="flex flex-col items-center justify-center p-6 cosmic-card rounded-xl hover:bg-primary/8 transition-all group" data-link="/guilds/${guildId}/stats">
                <span class="material-symbols-outlined text-primary mb-3 text-3xl transition-transform group-hover:scale-110" style="font-variation-settings: 'FILL' 1;">monitoring</span>
                <span class="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface">Stats</span>
              </button>
            </div>
          </div>
          <div class="p-6 bg-gradient-to-br from-surface-container-high to-surface-container rounded-xl relative overflow-hidden ghost-border">
            <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/8 blur-[50px] rounded-full"></div>
            <h3 class="text-lg font-headline font-extrabold text-on-surface mb-4">Active Modules</h3>
            ${enabledModules.length
              ? '<div class="flex flex-wrap gap-2">' + enabledModules.map(m => '<span class="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-label font-bold uppercase tracking-widest">' + m + '</span>').join('') + '</div>'
              : '<p class="text-sm text-on-surface-variant leading-relaxed">No modules enabled. Head to Configuration to set them up.</p>'
            }
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}
