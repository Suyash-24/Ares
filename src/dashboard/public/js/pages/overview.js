// ── Guild overview page ──
async function renderOverview({ guildId }) {
  setPageLoading(true);

  try {
    const [guild, stats, config] = await Promise.all([
      API.get(`/api/guilds/${guildId}`),
      API.get(`/api/guilds/${guildId}/stats`),
      API.get(`/api/guilds/${guildId}/config`)
    ]);
    if (!guild) return;

    let userAvatar = '';
    let userHtml = '';
    const user = window.currentUser;
    if (user) {
      userAvatar = discordAvatar(user.id, user.avatar, 64);
      userHtml = `
        <button class="w-9 h-9 rounded-full overflow-hidden border border-white/10 hover:border-primary/50 transition-colors" onclick="logout()">
          <img src="${escapeHtml(userAvatar)}" alt="" class="w-full h-full object-cover">
        </button>
      `;
    } else {
      userHtml = `
        <button class="p-2 rounded-full hover:bg-white/5 transition-all duration-300 text-purple-300 dark:text-purple-200" onclick="logout()">
          <span class="material-symbols-outlined" data-icon="account_circle">account_circle</span>
        </button>
      `;
    }

    const html = `
      <!-- TopAppBar -->
      <header class="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl z-50 shadow-2xl shadow-purple-900/20 tonal-shift shadow-[0_0_20px_rgba(132,85,239,0.15)]">
        <div class="flex justify-between items-center px-8 py-3 max-w-7xl mx-auto">
          <div class="flex items-center gap-6">
            <span class="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent uppercase cursor-pointer" onclick="router.navigate('/')">THE COMMAND BRIDGE</span>
            <nav class="hidden md:flex items-center gap-8 ml-8">
              <a class="font-['Plus_Jakarta_Sans'] tracking-tight text-sm uppercase font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(75,215,246,0.6)]" data-link="/" href="/">Bridge</a>
              <a class="font-['Plus_Jakarta_Sans'] tracking-tight text-sm uppercase font-bold text-slate-400 hover:text-white transition-colors" data-link="/docs" href="/docs">Docs</a>
            </nav>
          </div>
          <div class="flex items-center gap-4">
            <div class="relative hidden sm:block">
              <input class="bg-white/5 border-none rounded-full py-1.5 px-4 text-xs font-label tracking-widest focus:ring-1 focus:ring-secondary w-48 text-on-surface-variant placeholder:text-slate-600" placeholder="QUERY SYSTEM..." type="text"/>
            </div>
            <div class="flex gap-2">
              <button class="p-2 rounded-full hover:bg-white/5 transition-all duration-300 text-purple-300 dark:text-purple-200">
                <span class="material-symbols-outlined" data-icon="notifications">notifications</span>
              </button>
              ${userHtml}
            </div>
          </div>
        </div>
      </header>

      <main class="pt-32 pb-40 px-6 max-w-7xl mx-auto relative z-10 w-full">
        <!-- Hero Header -->
        <section class="mb-16 relative">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span class="font-label text-secondary text-sm font-bold tracking-[0.3em] uppercase mb-4 block">${escapeHtml(guild.name)} | Active Connection</span>
              <h1 class="font-headline text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-none">
                ARES <span class="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">DASHBOARD</span>
              </h1>
            </div>
            <div class="flex items-center gap-4 glass-panel px-6 py-4 rounded-2xl">
              <div class="w-3 h-3 bg-secondary rounded-full animate-pulse shadow-[0_0_12px_#4bd7f6]"></div>
              <div>
                <p class="font-label text-[10px] text-slate-400 tracking-widest uppercase">System Latency</p>
                <p class="font-headline text-xl font-bold text-white">12.4ms</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Bento Grid Stats -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <!-- Large Focus Card -->
          <div class="md:col-span-8 glass-panel rounded-3xl p-8 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full nebula-glow -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors"></div>
            <div class="relative z-10">
              <div class="flex justify-between items-start mb-12">
                <div>
                  <h2 class="font-headline text-2xl font-bold text-white mb-2">NEBULA TRAFFIC</h2>
                  <p class="text-on-surface-variant text-sm max-w-xs">Real-time engagement telemetry across all active cosmic nodes.</p>
                </div>
                <span class="font-label text-xs font-bold text-secondary-fixed-dim bg-secondary/10 px-3 py-1 rounded-full">LIVE FEED</span>
              </div>
              <div class="h-64 flex items-end gap-2 px-2">
                <!-- Mock Chart -->
                <div class="flex-1 bg-surface-container-high rounded-t-lg transition-all duration-500 hover:bg-secondary/40" style="height: 40%"></div>
                <div class="flex-1 bg-surface-container-high rounded-t-lg transition-all duration-500 hover:bg-secondary/40" style="height: 65%"></div>
                <div class="flex-1 bg-surface-container-high rounded-t-lg transition-all duration-500 hover:bg-secondary/40" style="height: 45%"></div>
                <div class="flex-1 bg-secondary rounded-t-lg shadow-[0_0_20px_rgba(75,215,246,0.3)]" style="height: 85%"></div>
                <div class="flex-1 bg-surface-container-high rounded-t-lg transition-all duration-500 hover:bg-secondary/40" style="height: 60%"></div>
                <div class="flex-1 bg-surface-container-high rounded-t-lg transition-all duration-500 hover:bg-secondary/40" style="height: 70%"></div>
                <div class="flex-1 bg-surface-container-high rounded-t-lg transition-all duration-500 hover:bg-secondary/40" style="height: 55%"></div>
                <div class="flex-1 bg-primary rounded-t-lg shadow-[0_0_20px_rgba(208,188,255,0.3)]" style="height: 95%"></div>
                <div class="flex-1 bg-surface-container-high rounded-t-lg transition-all duration-500 hover:bg-secondary/40" style="height: 40%"></div>
                <div class="flex-1 bg-surface-container-high rounded-t-lg transition-all duration-500 hover:bg-secondary/40" style="height: 30%"></div>
              </div>
            </div>
          </div>

          <!-- Vertical Stat Cluster -->
          <div class="md:col-span-4 grid grid-cols-1 gap-6">
            <div class="glass-panel rounded-3xl p-6 border-l-2 border-l-primary shadow-xl shadow-purple-900/10">
              <span class="material-symbols-outlined text-primary mb-4" data-icon="rocket_launch">rocket_launch</span>
              <p class="font-label text-xs text-slate-400 tracking-widest uppercase mb-1">Total Signals (Members)</p>
              <h3 class="font-headline text-3xl font-bold text-white">${formatNumber(guild.memberCount)}</h3>
            </div>
            <div class="glass-panel rounded-3xl p-6 border-l-2 border-l-secondary shadow-xl shadow-cyan-900/10">
              <span class="material-symbols-outlined text-secondary mb-4" data-icon="sensors">sensors</span>
              <p class="font-label text-xs text-slate-400 tracking-widest uppercase mb-1">Signals Processed (Msgs)</p>
              <h3 class="font-headline text-3xl font-bold text-white">${formatNumber(stats.totalMessages || 0)}</h3>
            </div>
          </div>

          <!-- Asymmetric Content Row -->
          <div class="md:col-span-5 glass-panel rounded-3xl overflow-hidden relative">
            <img alt="Satellite view of earth" class="w-full h-48 object-cover opacity-50" data-alt="abstract view of planet earth from space with glowing data networks and bright atmospheric lights in deep indigo and purple" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCT0nkW_Z5lqB24KXuMPi9zmGHZ8AAYVGjCHspLBoyu1_wQtvWMdV-kjvMPkJ5XREjhe07VLjTIlEL5uowAL4ZCKuAXY67DF-MwDBH6xnn9tMCpOHaG4KdT1WHnsIIsI4bexufIsRTjrBDsqFFKJCJTfXJN-5c0N0cys0FnSYlHHeFsO4QLpg5k-bZvee-XWkrRWabDVhifgI4hSoEf8fXdt7iBjwOXIwJF01YqQmthyRsAt17qGR81bgVjN-cGDthtL8YvY7SXo0w"/>
            <div class="p-8">
              <h3 class="font-headline text-xl font-bold text-white mb-4">Command Protocols</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-white/5 cursor-pointer" onclick="router.navigate('/guilds/${guildId}/config')">
                  <span class="text-sm text-on-surface-variant font-medium">Configure ${escapeHtml(guild.name)} Modules</span>
                  <div class="w-10 h-5 bg-primary/20 rounded-full relative p-1">
                    <div class="w-3 h-3 bg-primary rounded-full ml-auto shadow-[0_0_8px_rgba(208,188,255,0.8)]"></div>
                  </div>
                </div>
                <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-white/5 cursor-pointer" onclick="router.navigate('/guilds/${guildId}/stats')">
                  <span class="text-sm text-on-surface-variant font-medium">View Detailed Statistics</span>
                  <div class="w-10 h-5 bg-white/10 rounded-full relative p-1">
                    <div class="w-3 h-3 bg-secondary rounded-full ml-auto shadow-[0_0_8px_rgba(75,215,246,0.8)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="md:col-span-7 grid grid-cols-2 gap-6">
            <!-- Status Modules -->
            <div class="glass-panel rounded-3xl p-6 flex flex-col justify-between hover:bg-white/5 transition-all">
              <div>
                <div class="flex items-center gap-2 mb-4">
                  <span class="material-symbols-outlined text-purple-400 text-sm" data-icon="grid_view">grid_view</span>
                  <span class="font-label text-[10px] text-slate-500 tracking-widest uppercase">Grid Status</span>
                </div>
                <h4 class="font-headline text-lg font-bold text-white">Active Channels</h4>
              </div>
              <div class="mt-8">
                <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div class="bg-primary h-full w-[88%]"></div>
                </div>
                <div class="flex justify-between mt-2">
                  <span class="text-[10px] text-slate-500">OPTIMAL</span>
                  <span class="text-[10px] text-primary">${guild.channels} CHANNELS</span>
                </div>
              </div>
            </div>

            <div class="glass-panel rounded-3xl p-6 flex flex-col justify-between hover:bg-white/5 transition-all">
              <div>
                <div class="flex items-center gap-2 mb-4">
                  <span class="material-symbols-outlined text-cyan-400 text-sm" data-icon="auto_awesome">auto_awesome</span>
                  <span class="font-label text-[10px] text-slate-500 tracking-widest uppercase">AI Synthesis</span>
                </div>
                <h4 class="font-headline text-lg font-bold text-white">Server Boost Structure</h4>
              </div>
              <div class="mt-8">
                <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div class="bg-secondary h-full w-[92%]"></div>
                </div>
                <div class="flex justify-between mt-2">
                  <span class="text-[10px] text-slate-500">TIER ${guild.boostLevel}</span>
                  <span class="text-[10px] text-secondary">${guild.boostCount} BOOSTS</span>
                </div>
              </div>
            </div>

            <!-- Wide Module Info -->
            <div class="col-span-2 glass-panel rounded-3xl p-6 flex items-center gap-6">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-tertiary-container to-surface-container-highest flex items-center justify-center">
                <span class="material-symbols-outlined text-white" data-icon="layers">layers</span>
              </div>
              <div>
                <h4 class="font-headline text-lg font-bold text-white">Security Modules</h4>
                <p class="text-sm text-slate-400">Automod: ${config.automod?.enabled ? 'Active' : 'Offline'} • AntiNuke: ${config.antinuke?.enabled ? 'Active' : 'Offline'}</p>
              </div>
              <button class="ml-auto bg-white/5 hover:bg-white/10 text-white font-label text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all" onclick="router.navigate('/guilds/${guildId}/config')">
                Configure
              </button>
            </div>
          </div>
        </div>
      </main>

      <!-- BottomNavBar -->
      <nav class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-8 py-4 px-10 bg-slate-900/60 backdrop-blur-2xl rounded-full border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] shadow-2xl shadow-cyan-900/20 md:hidden">
        <a class="flex flex-col items-center justify-center text-cyan-400 relative after:content-[''] after:absolute after:-bottom-2 after:w-1 after:h-1 after:bg-cyan-400 after:rounded-full after:shadow-[0_0_12px_#4bd7f6] hover:scale-110 transition-transform duration-300" data-link="/" href="/">
          <span class="material-symbols-outlined" data-icon="grid_view">grid_view</span>
          <span class="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-widest mt-1">Bridge</span>
        </a>
      </nav>

      <!-- Floating Decor -->
      <div class="fixed top-[15%] left-[-5%] w-32 h-32 bg-secondary/20 rounded-full blur-3xl opacity-30 select-none pointer-events-none"></div>
      <div class="fixed bottom-[20%] right-[-5%] w-48 h-48 bg-primary/20 rounded-full blur-3xl opacity-30 select-none pointer-events-none"></div>
    `;

    document.getElementById('page-content').innerHTML = html;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}
