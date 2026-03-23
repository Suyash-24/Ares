// ── Guild list page ──

function renderTopAppBarHTML(user) {
  let navItems = `
    <a class="text-cyan-400 drop-shadow-[0_0_8px_rgba(75,215,246,0.6)] font-headline tracking-tight text-sm uppercase font-bold" data-link="/" href="/">Bridge</a>
    <a class="text-slate-400 hover:text-white transition-colors font-headline tracking-tight text-sm uppercase font-bold" data-link="/docs" href="/docs">Docs</a>
  `;
  
  let userHtml = ``;
  if (user) {
    const avatar = discordAvatar(user.id, user.avatar, 64);
    userHtml = `
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <p class="text-[10px] font-bold text-on-surface uppercase tracking-wider">${escapeHtml(user.globalName || user.username)}</p>
          <button class="text-[9px] text-error hover:text-error-container uppercase tracking-widest font-bold font-label" onclick="logout()">Logout</button>
        </div>
        <button class="w-9 h-9 rounded-full overflow-hidden border border-white/10 hover:border-primary/50 transition-colors" onclick="logout()">
          <img src="${avatar}" alt="" class="w-full h-full object-cover">
        </button>
      </div>
    `;
  } else {
    userHtml = `
      <button class="p-2 text-purple-300 hover:bg-white/5 rounded-full transition-all duration-300">
        <span class="material-symbols-outlined" data-icon="account_circle">account_circle</span>
      </button>
    `;
  }

  return `
    <header class="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] z-50">
      <nav class="bg-slate-950/40 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl shadow-purple-900/20 tonal-shift flex justify-between items-center px-8 py-3 max-w-7xl mx-auto">
        <div class="flex items-center gap-8">
          <span class="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent cursor-pointer" onclick="router.navigate('/')">THE COMMAND BRIDGE</span>
          <div class="hidden md:flex gap-6 items-center">
            ${navItems}
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="relative group hidden sm:block">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <span class="material-symbols-outlined text-slate-400 text-sm">search</span>
            </div>
            <input class="bg-white/5 border-none rounded-full py-1.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-secondary w-48 transition-all duration-300" placeholder="Scan Frequencies..." type="text"/>
          </div>
          <button class="p-2 text-purple-300 hover:bg-white/5 rounded-full transition-all duration-300">
            <span class="material-symbols-outlined" data-icon="notifications">notifications</span>
          </button>
          ${userHtml}
        </div>
      </nav>
    </header>
  `;
}

async function renderGuilds() {
  setPageLoading(true);

  try {
    const guilds = await API.get('/api/guilds');
    if (!guilds) return;

    const botGuilds = guilds.filter(g => g.botPresent);
    const otherGuilds = guilds.filter(g => !g.botPresent);

    let activeServersHtml = '';
    botGuilds.forEach((g) => {
      const iconUrl = guildIcon(g.id, g.icon);
      const iconContent = iconUrl
        ? `<img alt="${escapeHtml(g.name)}" class="w-full h-full object-cover" src="${escapeHtml(iconUrl)}"/>`
        : `<div class="w-full h-full font-headline font-bold text-3xl flex items-center justify-center bg-surface-container-high text-primary">${escapeHtml(g.name.charAt(0))}</div>`;

      activeServersHtml += `
      <!-- Active Server -->
      <div class="w-full md:w-[360px] group relative cursor-pointer" onclick="router.navigate('/guilds/${escapeHtml(g.id)}/overview')">
        <div class="absolute -inset-0.5 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-500"></div>
        <div class="relative glass-card rounded-2xl p-6 hover:translate-y-[-8px] transition-all duration-500 flex items-center gap-6">
          <div class="shrink-0 w-20 h-20 rounded-full border-4 border-surface-container p-1 pointer-events-none cyan-pulse overflow-hidden bg-surface-container-highest">
            ${iconContent}
          </div>
          <div class="flex-1 pointer-events-none">
            <h3 class="font-headline font-bold text-xl text-white mb-1 truncate">${escapeHtml(g.name)}</h3>
            <p class="font-body text-xs text-outline mb-4">${g.memberCount ? formatNumber(g.memberCount) + ' Members • ' : ''}Active</p>
            <div class="flex gap-4">
              <span class="text-[10px] font-label text-secondary font-bold uppercase tracking-tighter">Sync Active</span>
            </div>
          </div>
        </div>
      </div>
      `;
    });

    let inactiveServersHtml = '';
    otherGuilds.forEach((g) => {
      const iconUrl = guildIcon(g.id, g.icon);
      const iconContent = iconUrl
        ? `<img alt="${escapeHtml(g.name)}" class="w-full h-full object-cover rounded-xl" src="${escapeHtml(iconUrl)}"/>`
        : `<span class="material-symbols-outlined">layers</span>`;

      inactiveServersHtml += `
      <!-- Inactive Card -->
      <div class="group surface-container-low rounded-2xl p-5 border border-white/5 hover:bg-surface-container-high transition-all duration-300">
        <div class="flex items-center justify-between mb-4">
          <div class="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-outline-variant group-hover:text-primary transition-colors overflow-hidden text-2xl font-bold font-headline select-none">
            ${iconContent}
          </div>
          <button class="text-xs font-label font-bold text-outline-variant hover:text-primary transition-colors">INVITE</button>
        </div>
        <h4 class="font-headline font-semibold text-on-surface truncate" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</h4>
      </div>
      `;
    });

    document.getElementById('page-content').innerHTML = `
      <!-- Ambient Decorative Elements -->
      <div class="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      ${renderTopAppBarHTML(window.currentUser)}

      <main class="pt-32 pb-40 px-6 max-w-7xl mx-auto min-h-screen relative z-10 w-full">
        <!-- Hero Title Section -->
        <section class="mb-20 text-center relative">
          <h1 class="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 text-on-surface">
            Select Your <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Sector</span>
          </h1>
          <p class="font-body text-outline max-w-2xl mx-auto text-lg">
            Choose a neural cluster to begin commanding your Discord ecosystem. Active Ares modules are highlighted in ion-cyan.
          </p>
        </section>

        <!-- Your Servers Section -->
        ${botGuilds.length ? `
        <section class="mb-24">
          <div class="flex items-center justify-between mb-12">
            <h2 class="font-label text-sm font-bold uppercase tracking-[0.3em] text-secondary flex items-center gap-3">
              <span class="w-8 h-px bg-secondary"></span>
              Your Servers
            </h2>
            <span class="font-label text-xs text-outline bg-surface-container px-3 py-1 rounded-full">${botGuilds.length} ACTIVE NODES</span>
          </div>
          <div class="flex flex-wrap gap-8 justify-center items-start">
            ${activeServersHtml}
          </div>
        </section>
        ` : ''}

        <!-- Expand Territory Section -->
        ${otherGuilds.length ? `
        <section>
          <div class="flex items-center gap-6 mb-12">
            <h2 class="font-label text-sm font-bold uppercase tracking-[0.3em] text-outline flex items-center gap-3">
              <span class="w-8 h-px bg-outline/30"></span>
              Expand Territory
            </h2>
            <p class="font-body text-xs text-outline/50">Servers without Ares installed</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${inactiveServersHtml}
          </div>
        </section>
        ` : ''}

        ${(!botGuilds.length && !otherGuilds.length) ? `
          <div class="flex flex-col items-center justify-center py-24 text-center">
            <span class="material-symbols-outlined text-6xl text-outline mb-4">home</span>
            <h3 class="text-xl font-headline font-bold text-on-surface mb-2">No servers found</h3>
            <p class="text-on-surface-variant text-sm">You need Manage Server permission to see guilds here.</p>
          </div>
        ` : ''}

      </main>
    `;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setPageLoading(false);
  }
}
