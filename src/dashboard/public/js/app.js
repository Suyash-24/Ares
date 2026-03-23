// ── Main app bootstrap ──
(async function init() {
  // Check auth
  let me = null;
  try {
    me = await API.get('/auth/me');
  } catch {
    // Not authenticated
  }

  if (!me?.user) {
    // Public routes
    if (window.location.pathname.startsWith('/docs')) {
      renderDocs();
    } else {
      renderLanding();
    }
    // Listen for SPA nav on public pages
    window.addEventListener('popstate', function publicNav(e) {
      if (window.location.pathname.startsWith('/docs')) { renderDocs(e.state?.scrollTarget); }
      else { renderLanding(); }
    });
    return;
  }

  // Set up user in topbar
  const avatar = discordAvatar(me.user.id, me.user.avatar, 64);
  document.getElementById('topbar-user').innerHTML = `
    <div class="text-right">
      <p class="text-xs font-bold text-on-surface leading-tight font-headline">${escapeHtml(me.user.globalName || me.user.username)}</p>
      <p class="text-[10px] text-on-surface-variant leading-tight hover:text-error cursor-pointer font-label tracking-wider" onclick="logout()" title="Click to logout">LOGOUT</p>
    </div>
    <img src="${avatar}" alt="" class="w-9 h-9 rounded-lg ghost-border">
  `;

  // Register routes
  router
    .on('/', () => renderGuilds())
    .on('/guilds/:guildId/overview', renderOverview)
    .on('/guilds/:guildId/config', renderConfig)
    .on('/guilds/:guildId/moderation', renderModeration)
    .on('/guilds/:guildId/music', renderMusic)
    .on('/guilds/:guildId/stats', renderStats);

  // Handle link clicks for SPA navigation
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (link) {
      e.preventDefault();
      clearMusicPoll();
      router.navigate(link.getAttribute('data-link'));
    }
  });

  // Resolve current route
  router.resolve();
})();

// ── Sidebar rendering ──
function showSidebar(guildId) {
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  const content = document.getElementById('content');
  
  sidebar.style.display = 'flex';
  topbar.style.display = 'flex';
  content.classList.add('ml-64', 'pt-24', 'pb-16', 'px-12');

  const nav = document.getElementById('sidebar-nav');

  const activeClasses = 'text-primary bg-primary/8 border-l-2 border-primary rounded-r-lg';
  const inactiveClasses = 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50 border-l-2 border-transparent';
  const itemBaseClasses = 'flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-300 text-sm';

  if (!guildId) {
    nav.innerHTML = `
      <div class="text-[9px] text-outline px-4 mb-3 uppercase tracking-[0.15em] font-label font-bold">Navigation</div>
      <div class="${itemBaseClasses} ${activeClasses}" data-link="/">
        <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">home</span>
        <span class="font-medium">All Servers</span>
      </div>
    `;
    return;
  }

  const path = window.location.pathname;
  const getCls = (p) => path.includes(p) ? activeClasses : inactiveClasses;
  const getFill = (p) => path.includes(p) ? "font-variation-settings: 'FILL' 1;" : "";

  nav.innerHTML = `
    <div class="${itemBaseClasses} ${inactiveClasses} mb-2" data-link="/">
      <span class="material-symbols-outlined text-xl">arrow_back</span>
      <span class="font-medium">All Servers</span>
    </div>
    
    <div class="h-px bg-outline-variant/10 mx-4 my-4"></div>
    
    <div class="text-[9px] text-outline px-4 mb-3 uppercase tracking-[0.15em] font-label font-bold">Server Area</div>
    
    <div class="${itemBaseClasses} ${getCls('overview')}" data-link="/guilds/${guildId}/overview">
      <span class="material-symbols-outlined text-xl" style="${getFill('overview')}">insights</span>
      <span class="font-medium">Overview</span>
    </div>
    
    <div class="${itemBaseClasses} ${getCls('/config')}" data-link="/guilds/${guildId}/config">
      <span class="material-symbols-outlined text-xl" style="${getFill('/config')}">tune</span>
      <span class="font-medium">Configuration</span>
    </div>
    
    <div class="${itemBaseClasses} ${getCls('moderation')}" data-link="/guilds/${guildId}/moderation">
      <span class="material-symbols-outlined text-xl" style="${getFill('moderation')}">security</span>
      <span class="font-medium">Moderation</span>
    </div>
    
    <div class="${itemBaseClasses} ${getCls('music')}" data-link="/guilds/${guildId}/music">
      <span class="material-symbols-outlined text-xl" style="${getFill('music')}">graphic_eq</span>
      <span class="font-medium">Music</span>
    </div>
    
    <div class="${itemBaseClasses} ${getCls('stats')}" data-link="/guilds/${guildId}/stats">
      <span class="material-symbols-outlined text-xl" style="${getFill('stats')}">monitoring</span>
      <span class="font-medium">Statistics</span>
    </div>
  `;
}

function setPageLoading(show) {
  const el = document.getElementById('page-loading');
  if (show) {
    el.classList.remove('hidden');
    el.classList.add('flex');
    document.getElementById('page-content').innerHTML = '';
  } else {
    el.classList.add('hidden');
    el.classList.remove('flex');
  }
}

async function logout() {
  await API.post('/auth/logout');
  window.location.href = '/';
}

// ── 3D Card Tilt Effect ──
function init3DTilt(selector) {
  const cards = document.querySelectorAll(selector || '.card-3d');
  cards.forEach(card => {
    // Skip if already initialized
    if (card._tiltInit) return;
    card._tiltInit = true;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}
