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

  // Store user globally so page renders can inject it into their own TopAppBars
  window.currentUser = me.user;

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

// ── Navigation rendering (New Structure) ──
function showSidebar(guildId) {
  // Navigation elements are now rendered per-page following the new Stitch layouts
  // This function is kept to avoid breaking existing calls but does nothing globally
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
