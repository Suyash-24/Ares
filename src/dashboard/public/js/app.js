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

  // Set up user in sidebar
  const avatar = discordAvatar(me.user.id, me.user.avatar, 64);
  document.getElementById('sidebar-user').innerHTML = `
    <img src="${avatar}" alt="">
    <div class="sidebar-user-info">
      <div class="sidebar-user-name">${escapeHtml(me.user.globalName || me.user.username)}</div>
      <div class="sidebar-user-tag">${escapeHtml(me.user.username)}</div>
    </div>
    <button class="sidebar-user-logout" onclick="logout()" title="Logout">⏻</button>
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
  sidebar.style.display = 'flex';
  document.getElementById('content').style.marginLeft = '';
  document.getElementById('content').style.padding = '';

  const nav = document.getElementById('sidebar-nav');

  if (!guildId) {
    nav.innerHTML = `
      <div class="nav-section">
        <div class="nav-label">Navigation</div>
        <div class="nav-item active" data-link="/">
          <span class="nav-icon">🏠</span> Servers
        </div>
      </div>
    `;
    return;
  }

  const path = window.location.pathname;
  const isActive = (p) => path.includes(p) ? 'active' : '';

  nav.innerHTML = `
    <div class="nav-section">
      <div class="nav-label">Navigation</div>
      <div class="nav-item" data-link="/">
        <span class="nav-icon">←</span> All Servers
      </div>
    </div>
    <div class="nav-section">
      <div class="nav-label">Server</div>
      <div class="nav-item ${isActive('overview')}" data-link="/guilds/${guildId}/overview">
        <span class="nav-icon">📊</span> Overview
      </div>
      <div class="nav-item ${isActive('/config')}" data-link="/guilds/${guildId}/config">
        <span class="nav-icon">⚙️</span> Configuration
      </div>
      <div class="nav-item ${isActive('moderation')}" data-link="/guilds/${guildId}/moderation">
        <span class="nav-icon">🛡️</span> Moderation
      </div>
      <div class="nav-item ${isActive('music')}" data-link="/guilds/${guildId}/music">
        <span class="nav-icon">🎵</span> Music
      </div>
      <div class="nav-item ${isActive('stats')}" data-link="/guilds/${guildId}/stats">
        <span class="nav-icon">📈</span> Statistics
      </div>
    </div>
  `;
}

function setPageLoading(show) {
  const el = document.getElementById('page-loading');
  if (show) {
    el.classList.add('show');
    document.getElementById('page-content').innerHTML = '';
  } else {
    el.classList.remove('show');
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
