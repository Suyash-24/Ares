// ── Landing page (unauthenticated) ──
let _landingCleanup = null;

function registerLandingCleanup(fn) {
  const prev = _landingCleanup;
  _landingCleanup = () => {
    try { fn(); } catch (_) { /* noop */ }
    if (prev) prev();
  };
}

function renderLanding() {
  if (_landingCleanup) { _landingCleanup(); _landingCleanup = null; }

  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('content').style.marginLeft = '0';
  document.getElementById('content').style.padding = '0';

  // Floating icon symbols for the particle field
  const icons = ['⚡','🛡️','🎵','📊','⚙️','🎉','🎫','🔒','🎧','💬','⭐','🔔','🏆','📝','🔥','💎','🚀','🎯','👑','💡'];
  const modules = [
    { icon: '🛡️', label: 'Anti-Nuke' },
    { icon: '⚙️', label: 'Automod' },
    { icon: '🎵', label: 'Music' },
    { icon: '🎫', label: 'Tickets' },
    { icon: '📊', label: 'Analytics' },
    { icon: '🎉', label: 'Giveaways' },
    { icon: '⭐', label: 'Leveling' },
    { icon: '🔔', label: 'Logging' },
    { icon: '💬', label: 'Triggers' },
    { icon: '🚀', label: 'Fast API' }
  ];

  const moduleChips = (arr) => arr
    .map(item => `<span class="lp-marquee-chip"><span class="lp-marquee-chip-icon">${item.icon}</span><span class="lp-marquee-chip-label">${item.label}</span></span>`)
    .join('');

  document.getElementById('page-content').innerHTML = `
    <div class="lp">
      <!-- Floating icons canvas -->
      <canvas id="lp-canvas"></canvas>

      <!-- Navbar -->
      <header class="lp-nav">
        <div class="lp-nav-inner">
          <div class="lp-nav-brand">
            <span class="lp-nav-logo">⚡</span>
            <span class="lp-nav-wordmark">Ares</span>
          </div>
          <nav class="lp-nav-links">
            <a href="#features">Features</a>
            <a href="https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands" target="_blank" rel="noopener">Invite</a>
            <a href="#stats">Stats</a>
          </nav>
          <a href="/auth/login" class="lp-nav-cta">Dashboard <span class="lp-arrow">↗</span></a>
        </div>
      </header>

      <!-- Hero -->
      <section class="lp-hero">
        <div class="lp-hero-inner">
          <div class="lp-hero-pill">
            <span class="lp-pill-dot"></span>
            Available for free
          </div>
          <h1 class="lp-hero-h1">
            The next-generation<br><span class="lp-gradient-text">Discord bot</span>
          </h1>
          <p class="lp-hero-sub">
            Moderation, automod, music, leveling, giveaways, tickets, anti-nuke 
            and more — all managed from one beautiful dashboard.
          </p>
          <div class="lp-hero-btns">
            <a href="/auth/login" class="lp-btn-cta">
              <span class="lp-discord-mark" aria-hidden="true">
                <svg class="lp-discord-svg" width="18" height="18" viewBox="0 0 24 24" role="img" aria-label="Discord logo">
                  <path class="lp-discord-shape" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.107 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.094.246-.194.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  <circle class="lp-discord-eye" cx="9.35" cy="12.15" r="1.25" />
                  <circle class="lp-discord-eye" cx="14.65" cy="12.15" r="1.25" />
                </svg>
              </span>
              Login with Discord
            </a>
            <a href="https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands" target="_blank" rel="noopener" class="lp-btn-ghost">
              Add to Server
            </a>
          </div>
        </div>
      </section>

      <!-- Scrolling module marquee -->
      <div class="lp-marquee-wrap">
        <div class="lp-marquee-orb" aria-hidden="true"></div>
        <div class="lp-marquee-row lp-marquee-row-a">
          <div class="lp-marquee-track">
            ${moduleChips(modules)}
            ${moduleChips(modules)}
          </div>
        </div>
        <div class="lp-marquee-core">Ares Modules</div>
        <div class="lp-marquee-row lp-marquee-row-b">
          <div class="lp-marquee-track">
            ${moduleChips([...modules].reverse())}
            ${moduleChips([...modules].reverse())}
          </div>
        </div>
      </div>

      <!-- Features -->
      <section class="lp-section" id="features">
        <div class="lp-section-inner">
          <div class="lp-section-label" data-reveal="blur">Features</div>
          <h2 class="lp-section-h2" data-reveal="rise">Everything your server needs</h2>
          <p class="lp-section-sub" data-reveal="blur">One bot to replace them all — powerful, beautiful, and free.</p>
          <div class="lp-feat-grid">
            <div class="lp-feat" data-reveal="left">
              <div class="lp-feat-icon-wrap"><span>🛡️</span></div>
              <h3>Moderation</h3>
              <p>Ban, kick, warn, mute, detain — plus anti-nuke and anti-raid protection that keeps your server safe.</p>
            </div>
            <div class="lp-feat" data-reveal="zoom">
              <div class="lp-feat-icon-wrap"><span>🎵</span></div>
              <h3>Music</h3>
              <p>Lavalink-powered playback with queue management, volume, filters, and live dashboard controls.</p>
            </div>
            <div class="lp-feat" data-reveal="right">
              <div class="lp-feat-icon-wrap"><span>📊</span></div>
              <h3>Leveling & Stats</h3>
              <p>XP, rank cards, voice tracking, leaderboards, and detailed analytics for your community.</p>
            </div>
            <div class="lp-feat" data-reveal="left">
              <div class="lp-feat-icon-wrap"><span>⚙️</span></div>
              <h3>Automod</h3>
              <p>Intelligent filters for spam, invites, links, caps, and mass mentions — all configurable.</p>
            </div>
            <div class="lp-feat" data-reveal="zoom">
              <div class="lp-feat-icon-wrap"><span>🎉</span></div>
              <h3>Giveaways</h3>
              <p>Create, manage, and reroll giveaways from Discord or the web dashboard.</p>
            </div>
            <div class="lp-feat" data-reveal="right">
              <div class="lp-feat-icon-wrap"><span>🎫</span></div>
              <h3>Tickets</h3>
              <p>Panel-based ticket system with transcripts, auto-close, categories, and staff tools.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats / Social proof -->
      <section class="lp-section lp-section-dark" id="stats">
        <div class="lp-section-inner">
          <div class="lp-stats-row">
            <div class="lp-stat" data-reveal="rise">
              <div class="lp-stat-num">200+</div>
              <div class="lp-stat-label">Commands</div>
            </div>
            <div class="lp-stat" data-reveal="rise">
              <div class="lp-stat-num">12+</div>
              <div class="lp-stat-label">Servers</div>
            </div>
            <div class="lp-stat" data-reveal="rise">
              <div class="lp-stat-num">2.4K+</div>
              <div class="lp-stat-label">Users</div>
            </div>
            <div class="lp-stat" data-reveal="rise">
              <div class="lp-stat-num">99.9%</div>
              <div class="lp-stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA bottom -->
      <section class="lp-section lp-cta-section">
        <div class="lp-section-inner" style="text-align:center">
          <h2 class="lp-section-h2" data-reveal="blur">Ready to elevate your server?</h2>
          <p class="lp-section-sub" style="margin-bottom:36px" data-reveal="blur">Add Ares in seconds — no credit card, no hassle.</p>
          <div class="lp-hero-btns" style="justify-content:center" data-reveal="zoom">
            <a href="/auth/login" class="lp-btn-cta">Open Dashboard</a>
            <a href="https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands" target="_blank" rel="noopener" class="lp-btn-ghost">Add to Server</a>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="lp-footer">
        <div class="lp-footer-inner">
          <div class="lp-footer-brand">
            <span>⚡</span> <span class="lp-gradient-text" style="font-weight:800">Ares</span>
          </div>
          <p>Built with ❤️ for Discord communities</p>
        </div>
      </footer>
    </div>
  `;

  initFloatingIcons();
  initScrollReveal();
  initSmoothScroll();
}

// ── Floating icons canvas (Antigravity-style scattered items that react to cursor) ──
function initFloatingIcons() {
  const canvas = document.getElementById('lp-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const icons = ['⚡','🛡️','🎵','📊','⚙️','🎉','🎫','🔒','🎧','💬','⭐','🔔','🏆','📝','🔥','💎','🚀','🎯','👑','💡'];
  let w, h, items = [], mouse = { x: -9999, y: -9999 };
  const COUNT = 50;
  const MOUSE_R = 180;
  let rafId = 0;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }

  function spawn() {
    items = [];
    for (let i = 0; i < COUNT; i++) {
      items.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        ox: 0, oy: 0,                   // offset from mouse push
        icon: icons[i % icons.length],
        size: Math.random() * 14 + 12,   // 12-26px
        opacity: Math.random() * 0.25 + 0.08,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 0.4
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (const p of items) {
      // Mouse push
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_R && dist > 0) {
        const force = (MOUSE_R - dist) / MOUSE_R;
        p.ox += (dx / dist) * force * 3;
        p.oy += (dy / dist) * force * 3;
      }

      // Spring back
      p.ox *= 0.92;
      p.oy *= 0.92;

      // Drift
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;

      // Wrap
      if (p.x < -30) p.x = w + 30;
      if (p.x > w + 30) p.x = -30;
      if (p.y < -30) p.y = h + 30;
      if (p.y > h + 30) p.y = -30;

      const drawX = p.x + p.ox;
      const drawY = p.y + p.oy;

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = p.opacity;
      ctx.font = p.size + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, 0, 0);
      ctx.restore();
    }

    // Connection lines (sparse, between nearby icons)
    ctx.globalAlpha = 1;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        const cx = (a.x + a.ox) - (b.x + b.ox);
        const cy = (a.y + a.oy) - (b.y + b.oy);
        const cd = Math.sqrt(cx * cx + cy * cy);
        if (cd < 160) {
          const alpha = (1 - cd / 160) * 0.06;
          ctx.beginPath();
          ctx.moveTo(a.x + a.ox, a.y + a.oy);
          ctx.lineTo(b.x + b.ox, b.y + b.oy);
          ctx.strokeStyle = 'rgba(129,140,248,' + alpha + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  resize();
  spawn();
  draw();

  const onResize = () => { resize(); spawn(); };
  const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY + window.scrollY; };
  const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMove);
  document.addEventListener('mouseleave', onLeave);

  registerLandingCleanup(() => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseleave', onLeave);
    if (rafId) cancelAnimationFrame(rafId);
  });
}

// ── Scroll reveal ──
function initScrollReveal() {
  const els = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!els.length) return;

  els.forEach((el, idx) => {
    // Keep delay predictable per row-like group for repeated reveal/unreveal.
    el.style.setProperty('--reveal-delay', `${(idx % 6) * 70}ms`);
    el.classList.add('unrevealed');
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.intersectionRatio > 0.2) {
        e.target.classList.add('revealed');
        e.target.classList.remove('unrevealed');
      } else if (e.intersectionRatio < 0.07) {
        e.target.classList.remove('revealed');
        e.target.classList.add('unrevealed');
      }
    });
  }, { threshold: [0, 0.07, 0.2, 0.45], rootMargin: '0px 0px -7% 0px' });

  els.forEach(el => io.observe(el));
  registerLandingCleanup(() => io.disconnect());
}

// ── Smooth scroll for anchor links ──
function initSmoothScroll() {
  const anchors = Array.from(document.querySelectorAll('.lp a[href^="#"]'));
  const handlers = [];

  anchors.forEach(a => {
    const handler = (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      const nav = document.querySelector('.lp-nav');
      const navH = nav ? nav.offsetHeight : 0;
      const y = target.getBoundingClientRect().top + window.scrollY - navH - 10;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    };

    a.addEventListener('click', handler);
    handlers.push([a, handler]);
  });

  registerLandingCleanup(() => {
    handlers.forEach(([a, handler]) => a.removeEventListener('click', handler));
  });
}
