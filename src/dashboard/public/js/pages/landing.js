// Landing page (unauthenticated)
let _landingCleanup = null;

function registerLandingCleanup(fn) {
  const prev = _landingCleanup;
  _landingCleanup = () => {
    try { fn(); } catch (_) { /* noop */ }
    if (prev) prev();
  };
}

function renderLanding() {
  if (_landingCleanup) {
    _landingCleanup();
    _landingCleanup = null;
  }

  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('content').style.marginLeft = '0';
  document.getElementById('content').style.padding = '0';

  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';
  const moduleNames = ['Moderation', 'Music', 'Leveling', 'Giveaways', 'Tickets', 'Anti-Nuke', 'Stats'];
  const moduleMarkup = moduleNames.map((m) => `<span>${m}</span>`).join('');

  document.getElementById('page-content').innerHTML = `
    <div class="lp" id="top">
      <canvas id="lp-canvas" aria-hidden="true"></canvas>
      <div class="lp-particles" id="lp-particles" aria-hidden="true"></div>
      <div class="lp-glow-cursor" id="lp-glow-cursor"></div>

      <section class="lp-hero" id="product">
        <div class="lp-shell">
          <div class="lp-frame" data-reveal="zoom">
            <div class="lp-stage">
              <canvas id="lp-dot-carpet" aria-hidden="true"></canvas>
              <div class="lp-stage-light lp-stage-light-a" aria-hidden="true"></div>
              <div class="lp-stage-light lp-stage-light-b" aria-hidden="true"></div>

              <div class="lp-aurora" aria-hidden="true">
                <span></span><span></span><span></span>
              </div>

              <header class="lp-stage-nav">
                <a href="#top" class="lp-stage-brand" aria-label="Ares home">
                  <img src="/assets/ares-mark.svg" alt="Ares logo" class="lp-stage-brand-logo">
                </a>

                <div class="lp-stage-menu-wrap">
                  <nav class="lp-stage-menu" aria-label="Primary navigation">
                    <a href="#top">Home</a>
                    <a href="#features">Features</a>
                    <a href="#metrics">Stats</a>
                    <a href="/docs" data-link="/docs">Docs</a>
                    <span class="lp-protection-pill">Modules <span>22</span></span>
                  </nav>
                </div>

                <div class="lp-stage-account-wrap">
                  <a href="/auth/login" class="lp-stage-account">Open Dashboard</a>
                  <button
                    class="lp-mobile-menu-btn"
                    type="button"
                    aria-label="Open navigation"
                    aria-expanded="false"
                    aria-controls="lp-mobile-drawer"
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                  </button>
                </div>
              </header>

              <nav id="lp-mobile-drawer" class="lp-mobile-drawer" aria-label="Mobile navigation">
                <a href="#top">Home</a>
                <a href="#features">Features</a>
                <a href="#metrics">Stats</a>
                <a href="/docs" data-link="/docs">Docs</a>
                <div class="lp-mobile-drawer-actions">
                  <a href="/auth/login" class="lp-mobile-primary">Open Dashboard</a>
                  <a href="${oauthUrl}" target="_blank" rel="noopener" class="lp-mobile-ghost">Add to Server</a>
                </div>
              </nav>

              <div class="lp-route lp-route-left-top" aria-hidden="true">
                <span class="lp-route-node"></span>
                <div>
                  <strong>Moderation</strong>
                  <span>75+ cmds</span>
                </div>
              </div>

              <div class="lp-route lp-route-left-bottom" aria-hidden="true">
                <span class="lp-route-node"></span>
                <div>
                  <strong>Leveling</strong>
                  <span>XP &amp; Ranks</span>
                </div>
              </div>

              <div class="lp-route lp-route-right-top" aria-hidden="true">
                <div>
                  <strong>Music</strong>
                  <span>Lavalink</span>
                </div>
                <span class="lp-route-node"></span>
              </div>

              <div class="lp-route lp-route-right-bottom" aria-hidden="true">
                <div>
                  <strong>Security</strong>
                  <span>Anti-Nuke</span>
                </div>
                <span class="lp-route-node"></span>
              </div>

              <span class="lp-play-chip" aria-hidden="true">&#9658;</span>

              <div class="lp-stage-content">
                <span class="lp-stage-badge" data-reveal="blur">200+ Commands · Free &amp; Open Source</span>
                <h1 class="lp-stage-title" data-reveal="rise">
                  The all-in-one <span>Discord bot</span>
                </h1>
                <p class="lp-stage-sub" data-reveal="blur">
                  Moderation, music, leveling, giveaways, tickets, anti-nuke and more — managed from one beautiful dashboard.
                </p>

                <div class="lp-stage-actions" data-reveal="zoom">
                  <a href="/auth/login" class="lp-action lp-action-dark">Open Dashboard</a>
                  <a href="${oauthUrl}" target="_blank" rel="noopener" class="lp-action lp-action-light">Add to Server</a>
                </div>
              </div>

              <div class="lp-stage-beams" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div class="lp-stage-footer">
                <div class="lp-scroll-indicator">
                  <span>&#8595;</span>
                  02/03 . Scroll down
                </div>
                <div class="lp-horizon-indicator">
                  <span>Explore modules</span>
                  <div class="lp-horizon-bars">
                    <i class="is-active"></i>
                    <i></i>
                    <i></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="lp-brand-row" data-reveal="blur">
              ${moduleMarkup}
            </div>
          </div>
        </div>
      </section>

      <section class="lp-section" id="features">
        <div class="lp-shell lp-mosaic">
          <div class="lp-mosaic-left">
            <article class="lp-card lp-control-card" data-reveal="left">
              <h2>Moderation Suite</h2>
              <p>75+ commands including ban, kick, mute, warn, detention, anti-nuke, anti-raid, and comprehensive mod logging.</p>

              <div class="lp-control-grid">
                <div class="lp-control-item">
                  <span>Mod commands</span>
                  <strong class="lp-metric-value" data-counter="75" data-suffix="+">0+</strong>
                </div>
                <div class="lp-control-item">
                  <span>Automod accuracy</span>
                  <strong class="lp-metric-value" data-counter="99" data-suffix="%">0%</strong>
                </div>
                <div class="lp-control-item">
                  <span>Log channels</span>
                  <strong class="lp-metric-value" data-counter="12" data-suffix="+">0+</strong>
                </div>
                <div class="lp-control-item">
                  <span>Response time</span>
                  <strong class="lp-metric-value" data-counter="128" data-suffix="ms">0ms</strong>
                </div>
              </div>

              <div class="lp-control-pills">
                <span>Anti-Nuke</span>
                <span>Anti-Raid</span>
                <span>Automod Filters</span>
              </div>
            </article>

            <article class="lp-card lp-wallet-card" data-reveal="left">
              <h2>Music &amp; Leveling</h2>
              <p>Lavalink-powered playback from YouTube, Spotify, and SoundCloud — plus a full XP leveling system with rank cards and role rewards.</p>

              <div class="lp-wallet-layout">
                <div class="lp-wallet-stat">
                  <span>Music sources supported</span>
                  <strong>4+</strong>
                </div>

                <div class="lp-wallet-ring" aria-hidden="true">
                  <div class="lp-wallet-ring-core">24/7</div>
                </div>
              </div>

              <div class="lp-wallet-list">
                <div>
                  <span>Playback</span>
                  <strong>HD Audio</strong>
                </div>
                <div>
                  <span>XP Modes</span>
                  <strong>Text + VC</strong>
                </div>
                <div>
                  <span>Rank Cards</span>
                  <strong>Custom</strong>
                </div>
              </div>
            </article>
          </div>

          <article class="lp-card lp-insight-card" data-reveal="right">
            <h2>Server Analytics</h2>
            <p>Track messages, voice activity, invites, and engagement with detailed leaderboards and time-period breakdowns.</p>

            <div class="lp-insight-grid">
              <div class="lp-insight-box lp-insight-box-main">
                <strong class="lp-metric-value" data-counter="22" data-suffix="+">0+</strong>
                <p>Tracking commands</p>
                <div class="lp-line-chart" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              <div class="lp-insight-box lp-insight-box-bars" aria-hidden="true">
                <span class="lp-bar lp-bar-a"></span>
                <span class="lp-bar lp-bar-b"></span>
                <span class="lp-bar lp-bar-c"></span>
                <span class="lp-bar lp-bar-d"></span>
                <span class="lp-bar lp-bar-e"></span>
              </div>

              <div class="lp-insight-box">
                <small>Engagement metrics</small>
                <strong>Daily / Weekly / Monthly</strong>
                <p>Competitive leaderboards for all tracked stats.</p>
              </div>

              <div class="lp-insight-box lp-insight-box-chart" aria-hidden="true">
                <div class="lp-mini-columns">
                  <span style="height:22%"></span>
                  <span style="height:40%"></span>
                  <span style="height:58%"></span>
                  <span style="height:32%"></span>
                  <span style="height:44%"></span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="lp-section lp-section-metrics" id="metrics">
        <div class="lp-shell">
          <div class="lp-section-head lp-center">
            <p class="lp-kicker" data-reveal="blur">Ares by the numbers</p>
            <h2 data-reveal="rise">Built for servers that take community seriously</h2>
          </div>

          <div class="lp-metric-row">
            <article class="lp-metric-box" data-reveal="rise">
              <strong class="lp-metric-value" data-counter="200" data-suffix="+">0+</strong>
              <span>Total commands</span>
            </article>
            <article class="lp-metric-box" data-reveal="rise">
              <strong class="lp-metric-value" data-counter="22" data-suffix="">0</strong>
              <span>Feature modules</span>
            </article>
            <article class="lp-metric-box" data-reveal="rise">
              <strong class="lp-metric-value" data-counter="128" data-suffix="ms">0ms</strong>
              <span>Avg response time</span>
            </article>
            <article class="lp-metric-box" data-reveal="rise">
              <strong class="lp-metric-value" data-counter="99.9" data-suffix="%">0%</strong>
              <span>Uptime target</span>
            </article>
          </div>

          <div class="lp-inline-cta" data-reveal="zoom">
            <a href="/auth/login" class="lp-btn lp-btn-solid">Open Dashboard</a>
            <a href="${oauthUrl}" target="_blank" rel="noopener" class="lp-btn lp-btn-outline">Add to Server</a>
            <a href="/docs" data-link="/docs" class="lp-btn lp-btn-muted">Read Docs</a>
          </div>
        </div>
      </section>

      <footer class="lp-footer">
        <div class="lp-shell lp-footer-inner">
          <a href="#top" class="lp-footer-brand" aria-label="Ares home">
            <img src="/assets/ares-logo.svg" alt="Ares logo" class="lp-footer-logo">
          </a>
          <div class="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#metrics">Stats</a>
            <a href="/docs" data-link="/docs">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  `;

  initNetworkCanvas();
  initDotCarpet();
  initHeroSpotlight();
  initScrollReveal();
  initSmoothScroll();
  initLandingSpaLinks();
  initMobileNavDrawer();
  initMetricCounters();
  initCardTilt();
  initMagneticButtons();
  initGlowCursor();
  initTextScramble();
  initScrollProgress();
  initFloatingParticles();
}

function initDotCarpet() {
  const canvas = document.getElementById('lp-dot-carpet');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let rafId = 0;
  const spacing = 30;
  const pointer = { x: -9999, y: -9999 };
  const radius = 160;
  const pushStrength = 14;

  // Each dot: { ox, oy, dx, dy } — origin + displacement
  let dots = [];

  function rebuild() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const stage = canvas.parentElement;
    width = stage.offsetWidth;
    height = stage.offsetHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(width / spacing) + 1;
    rows = Math.ceil(height / spacing) + 1;
    dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({ ox: c * spacing, oy: r * spacing, dx: 0, dy: 0 });
      }
    }
  }

  // Pre-compute alpha-to-color lookup (avoid string alloc per dot per frame)
  const colorCache = new Array(256);
  for (let i = 0; i < 256; i++) {
    const a = (i / 255).toFixed(3);
    colorCache[i] = `rgba(140,174,254,${a})`;
  }

  let isIdle = true;
  let idleFrames = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const pointerActive = pointer.x > -1000;
    let anyMoving = false;

    // Draw static dots in a single batch when idle
    if (isIdle && !pointerActive) {
      ctx.fillStyle = colorCache[46]; // 0.18 alpha
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        ctx.fillRect(dot.ox - 0.8, dot.oy - 0.8, 1.6, 1.6);
      }
      rafId = requestAnimationFrame(draw);
      return;
    }

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const mx = pointer.x - dot.ox;
      const my = pointer.y - dot.oy;
      const distSq = mx * mx + my * my;
      const radiusSq = radius * radius;

      if (distSq < radiusSq && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / radius);
        const angle = Math.atan2(my, mx);
        dot.dx = -Math.cos(angle) * force * pushStrength;
        dot.dy = -Math.sin(angle) * force * pushStrength;
        anyMoving = true;
      } else {
        dot.dx *= 0.88;
        dot.dy *= 0.88;
        if (Math.abs(dot.dx) > 0.05 || Math.abs(dot.dy) > 0.05) anyMoving = true;
      }

      const x = dot.ox + dot.dx;
      const y = dot.oy + dot.dy;
      const displacement = Math.abs(dot.dx) + Math.abs(dot.dy);
      const t = Math.min(displacement / pushStrength, 1);
      const alpha = 0.18 + t * 0.52;
      const size = 0.8 + t * 0.6;

      const ci = (alpha * 255 + 0.5) | 0;
      ctx.fillStyle = colorCache[ci];
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }

    if (!anyMoving && !pointerActive) {
      idleFrames++;
      if (idleFrames > 30) isIdle = true;
    } else {
      idleFrames = 0;
      isIdle = false;
    }

    rafId = requestAnimationFrame(draw);
  }

  const onResize = () => { rebuild(); isIdle = false; idleFrames = 0; };
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    isIdle = false;
    idleFrames = 0;
  };
  const onLeave = () => {
    pointer.x = -9999;
    pointer.y = -9999;
  };

  rebuild();
  rafId = requestAnimationFrame(draw);

  window.addEventListener('resize', onResize);
  canvas.parentElement.addEventListener('mousemove', onMove);
  canvas.parentElement.addEventListener('mouseleave', onLeave);

  registerLandingCleanup(() => {
    window.removeEventListener('resize', onResize);
    canvas.parentElement.removeEventListener('mousemove', onMove);
    canvas.parentElement.removeEventListener('mouseleave', onLeave);
    if (rafId) cancelAnimationFrame(rafId);
  });
}

function initNetworkCanvas() {
  const canvas = document.getElementById('lp-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let rafId = 0;
  const pointer = { x: -9999, y: -9999 };

  function seedNodes() {
    const density = Math.floor((width * height) / 26000);
    const count = Math.max(22, Math.min(60, density));
    nodes = [];

    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        radius: Math.random() * 1.6 + 0.8,
        phase: Math.random() * Math.PI * 2,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: (0.008 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1)
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, canvas.offsetWidth);
    height = Math.max(1, canvas.offsetHeight);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    seedNodes();
  }

  const PI2 = Math.PI * 2;
  const connectDist = 150;

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    const sinT = Math.sin(time * 0.001);

    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;

      if (node.x <= 0 || node.x >= width) node.vx *= -1;
      if (node.y <= 0 || node.y >= height) node.vy *= -1;

      const dx = pointer.x - node.x;
      const dy = pointer.y - node.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < 67600 && distSq > 0) { // 260²
        const dist = Math.sqrt(distSq);
        const influence = (260 - dist) / 260;
        node.orbitAngle += node.orbitSpeed * (1 + influence * 3);

        const targetDist = 60 + (1 - influence) * 160;
        const targetX = pointer.x + Math.cos(node.orbitAngle) * targetDist;
        const targetY = pointer.y + Math.sin(node.orbitAngle) * targetDist;

        node.vx += (targetX - node.x) * 0.008 * influence;
        node.vy += (targetY - node.y) * 0.008 * influence;

        node.vx *= 0.96;
        node.vy *= 0.96;
      }

      const glow = 0.22 + ((sinT * Math.cos(node.phase) + 1) * 0.5) * 0.3;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, PI2);
      ctx.fillStyle = `rgba(140,174,254,${glow.toFixed(3)})`;
      ctx.fill();
    }

    // Batch lines with a single path + stroke
    ctx.lineWidth = 0.8;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const ddx = a.x - b.x;
        const ddy = a.y - b.y;
        const distSq = ddx * ddx + ddy * ddy;

        if (distSq < 22500) { // 150²
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / connectDist) * 0.1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(140,174,254,${alpha.toFixed(3)})`;
          ctx.stroke();
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  const onResize = () => resize();
  const onMove = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY + window.scrollY;
  };
  const onLeave = () => {
    pointer.x = -9999;
    pointer.y = -9999;
  };

  resize();
  rafId = requestAnimationFrame(draw);

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

function initHeroSpotlight() {
  const stage = document.querySelector('.lp-stage');
  if (!stage) return;

  const lightA = stage.querySelector('.lp-stage-light-a');
  const lightB = stage.querySelector('.lp-stage-light-b');
  if (!lightA || !lightB) return;

  let rafId = 0;
  let x = 0;
  let y = 0;
  let tx = 0;
  let ty = 0;

  const animate = () => {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;

    lightA.style.transform = `translate3d(${x * 24}px, ${y * 16}px, 0)`;
    lightB.style.transform = `translate3d(${x * -18}px, ${y * -12}px, 0)`;

    rafId = requestAnimationFrame(animate);
  };

  const onMove = (event) => {
    const rect = stage.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    tx = (px - 0.5) * 2;
    ty = (py - 0.5) * 2;
  };

  const onLeave = () => {
    tx = 0;
    ty = 0;
  };

  stage.addEventListener('mousemove', onMove);
  stage.addEventListener('mouseleave', onLeave);
  rafId = requestAnimationFrame(animate);

  registerLandingCleanup(() => {
    stage.removeEventListener('mousemove', onMove);
    stage.removeEventListener('mouseleave', onLeave);
    if (rafId) cancelAnimationFrame(rafId);
  });
}

function initScrollReveal() {
  const elements = Array.from(document.querySelectorAll('.lp [data-reveal]'));
  if (!elements.length) return;

  elements.forEach((el, index) => {
    el.style.setProperty('--reveal-delay', `${(index % 7) * 68}ms`);
    el.classList.add('unrevealed');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio > 0.24) {
        entry.target.classList.add('revealed');
        entry.target.classList.remove('unrevealed');
      } else if (entry.intersectionRatio < 0.1) {
        entry.target.classList.remove('revealed');
        entry.target.classList.add('unrevealed');
      }
    });
  }, {
    threshold: [0, 0.1, 0.24, 0.45],
    rootMargin: '0px 0px -8% 0px'
  });

  elements.forEach((el) => observer.observe(el));
  registerLandingCleanup(() => observer.disconnect());
}

function initSmoothScroll() {
  const anchors = Array.from(document.querySelectorAll('.lp a[href^="#"]'));
  const handlers = [];

  anchors.forEach((anchor) => {
    const handler = (event) => {
      event.preventDefault();

      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;

      const nav = document.querySelector('.lp-stage-nav');
      const navHeight = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    };

    anchor.addEventListener('click', handler);
    handlers.push([anchor, handler]);
  });

  registerLandingCleanup(() => {
    handlers.forEach(([anchor, handler]) => anchor.removeEventListener('click', handler));
  });
}

function initLandingSpaLinks() {
  const links = Array.from(document.querySelectorAll('.lp [data-link]'));
  const handlers = [];

  links.forEach((link) => {
    const handler = (event) => {
      event.preventDefault();
      const destination = link.getAttribute('data-link');

      window.history.pushState({}, '', destination);
      window.dispatchEvent(new PopStateEvent('popstate'));
    };

    link.addEventListener('click', handler);
    handlers.push([link, handler]);
  });

  registerLandingCleanup(() => {
    handlers.forEach(([link, handler]) => link.removeEventListener('click', handler));
  });
}

function initMobileNavDrawer() {
  const button = document.querySelector('.lp-mobile-menu-btn');
  const drawer = document.getElementById('lp-mobile-drawer');
  if (!button || !drawer) return;

  const links = Array.from(drawer.querySelectorAll('a'));
  let isOpen = false;

  const setOpen = (next) => {
    isOpen = Boolean(next);
    drawer.classList.toggle('open', isOpen);
    button.classList.toggle('is-open', isOpen);
    button.setAttribute('aria-expanded', String(isOpen));
  };

  const onToggle = (event) => {
    event.preventDefault();
    setOpen(!isOpen);
  };

  const onDocumentClick = (event) => {
    if (!isOpen) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('.lp-mobile-menu-btn') || target.closest('.lp-mobile-drawer')) {
      return;
    }

    setOpen(false);
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const onResize = () => {
    if (window.innerWidth > 760) {
      setOpen(false);
    }
  };

  const onLinkClick = () => setOpen(false);

  button.addEventListener('click', onToggle);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
  links.forEach((link) => link.addEventListener('click', onLinkClick));

  registerLandingCleanup(() => {
    button.removeEventListener('click', onToggle);
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
    links.forEach((link) => link.removeEventListener('click', onLinkClick));
    setOpen(false);
  });
}

function initMetricCounters() {
  const metrics = Array.from(document.querySelectorAll('.lp .lp-metric-value[data-counter]'));
  if (!metrics.length) return;

  const started = new WeakSet();
  const rafMap = new Map();

  function animate(el) {
    if (started.has(el)) return;
    started.add(el);

    const targetRaw = el.getAttribute('data-counter') || '0';
    const target = Number(targetRaw);
    if (!Number.isFinite(target)) return;

    const decimals = (targetRaw.split('.')[1] || '').length;
    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const duration = 1180;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      el.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;

      if (progress < 1) {
        rafMap.set(el, requestAnimationFrame(tick));
      }
    };

    rafMap.set(el, requestAnimationFrame(tick));
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.45 });

  metrics.forEach((metric) => observer.observe(metric));

  registerLandingCleanup(() => {
    observer.disconnect();
    for (const rafId of rafMap.values()) {
      cancelAnimationFrame(rafId);
    }
  });
}

function initCardTilt() {
  const cards = Array.from(document.querySelectorAll('.lp-card'));
  if (!cards.length || !matchMedia('(hover: hover)').matches) return;

  const handlers = [];

  cards.forEach((card) => {
    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const tiltX = (y - 0.5) * -8;
      const tiltY = (x - 0.5) * 8;
      card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`;
      card.style.setProperty('--mouse-x', `${x * 100}%`);
      card.style.setProperty('--mouse-y', `${y * 100}%`);
    };

    const onLeave = () => {
      card.style.transform = '';
    };

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    handlers.push([card, onMove, onLeave]);
  });

  registerLandingCleanup(() => {
    handlers.forEach(([el, move, leave]) => {
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
      el.style.transform = '';
    });
  });
}

function initMagneticButtons() {
  const btns = Array.from(document.querySelectorAll('.lp-action, .lp-btn'));
  if (!btns.length || !matchMedia('(hover: hover)').matches) return;

  const handlers = [];

  btns.forEach((btn) => {
    const onMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
    };

    const onLeave = () => {
      btn.style.transform = '';
    };

    btn.addEventListener('mousemove', onMove);
    btn.addEventListener('mouseleave', onLeave);
    handlers.push([btn, onMove, onLeave]);
  });

  registerLandingCleanup(() => {
    handlers.forEach(([el, move, leave]) => {
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
      el.style.transform = '';
    });
  });
}

function initGlowCursor() {
  const glow = document.getElementById('lp-glow-cursor');
  if (!glow || !matchMedia('(hover: hover)').matches) return;

  let rafId = 0;
  let cx = -500;
  let cy = -500;
  let tx = -500;
  let ty = -500;

  const onMove = (e) => {
    tx = e.clientX;
    ty = e.clientY;
    glow.classList.add('is-visible');
  };

  const onLeave = () => {
    glow.classList.remove('is-visible');
  };

  const tick = () => {
    cx += (tx - cx) * 0.14;
    cy += (ty - cy) * 0.14;
    glow.style.transform = `translate3d(${cx - 250}px, ${cy - 250}px, 0)`;
    rafId = requestAnimationFrame(tick);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseleave', onLeave);
  rafId = requestAnimationFrame(tick);

  registerLandingCleanup(() => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseleave', onLeave);
    if (rafId) cancelAnimationFrame(rafId);
    if (glow.parentNode) glow.remove();
  });
}

function initTextScramble() {
  const title = document.querySelector('.lp-stage-title');
  if (!title) return;

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

  function collectTextNodes(el) {
    const result = [];
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
        result.push({ node: child, original: child.textContent });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        result.push(...collectTextNodes(child));
      }
    }
    return result;
  }

  const nodes = collectTextNodes(title);
  if (!nodes.length) return;

  const totalLen = nodes.reduce((s, n) => s + n.original.length, 0);

  nodes.forEach((n) => {
    n.node.textContent = n.original.split('').map((c) =>
      c === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  });

  let iteration = 0;
  const maxIterations = Math.ceil(totalLen * 0.8);

  const interval = setInterval(() => {
    nodes.forEach((n) => {
      const revealed = Math.floor((iteration / maxIterations) * n.original.length);
      n.node.textContent = n.original.split('').map((c, i) => {
        if (i < revealed || c === ' ') return c;
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');
    });

    iteration++;
    if (iteration > maxIterations) {
      nodes.forEach((n) => { n.node.textContent = n.original; });
      clearInterval(interval);
    }
  }, 22);

  registerLandingCleanup(() => clearInterval(interval));
}

function initScrollProgress() {
  const bars = Array.from(document.querySelectorAll('.lp-horizon-bars i'));
  if (bars.length < 3) return;

  const sections = [
    document.getElementById('top'),
    document.getElementById('features'),
    document.getElementById('metrics')
  ].filter(Boolean);

  if (sections.length < 3) return;

  const onScroll = () => {
    const scrollY = window.scrollY + window.innerHeight / 2;
    let active = 0;
    for (let i = sections.length - 1; i >= 0; i--) {
      if (scrollY >= sections[i].offsetTop) {
        active = i;
        break;
      }
    }
    bars.forEach((bar, i) => {
      bar.classList.toggle('is-active', i <= active);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  registerLandingCleanup(() => window.removeEventListener('scroll', onScroll));
}

function initFloatingParticles() {
  const container = document.getElementById('lp-particles');
  if (!container) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const count = matchMedia('(max-width: 760px)').matches ? 10 : 22;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'lp-particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = (60 + Math.random() * 40) + '%';
    p.style.setProperty('--dur', (10 + Math.random() * 14) + 's');
    p.style.animationDelay = -(Math.random() * 24) + 's';
    const size = (1 + Math.random() * 2);
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    container.appendChild(p);
  }

  registerLandingCleanup(() => { container.innerHTML = ''; });
}
