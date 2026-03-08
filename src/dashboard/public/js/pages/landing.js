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
  const partnerBrands = ['Vercel', 'loom', 'Cash App', 'Loops', 'zapier', 'ramp', 'Raycast'];
  const partnerMarkup = partnerBrands.map((brand) => `<span>${brand}</span>`).join('');

  document.getElementById('page-content').innerHTML = `
    <div class="lp" id="top">
      <canvas id="lp-canvas" aria-hidden="true"></canvas>

      <section class="lp-hero" id="product">
        <div class="lp-shell">
          <div class="lp-frame" data-reveal="zoom">
            <div class="lp-stage">
              <div class="lp-stage-light lp-stage-light-a" aria-hidden="true"></div>
              <div class="lp-stage-light lp-stage-light-b" aria-hidden="true"></div>

              <header class="lp-stage-nav">
                <a href="#top" class="lp-stage-brand" aria-label="Ares home">
                  <img src="/assets/ares-mark.svg" alt="Ares logo" class="lp-stage-brand-logo">
                </a>

                <div class="lp-stage-menu-wrap">
                  <nav class="lp-stage-menu" aria-label="Primary navigation">
                    <a href="#top">Home</a>
                    <a href="#features">DeFi App</a>
                    <a href="#features">Assets</a>
                    <a href="#features">Features</a>
                    <a href="#metrics">Pricing</a>
                    <a href="/docs" data-link="/docs">FAQ</a>
                    <span class="lp-protection-pill">Protection <span>7</span></span>
                  </nav>
                </div>

                <div class="lp-stage-account-wrap">
                  <a href="/auth/login" class="lp-stage-account">Create Account</a>
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
                <a href="#features">DeFi App</a>
                <a href="#features">Assets</a>
                <a href="#features">Features</a>
                <a href="#metrics">Pricing</a>
                <a href="/docs" data-link="/docs">FAQ</a>
                <div class="lp-mobile-drawer-actions">
                  <a href="/auth/login" class="lp-mobile-primary">Open Dashboard</a>
                  <a href="${oauthUrl}" target="_blank" rel="noopener" class="lp-mobile-ghost">Add to Server</a>
                </div>
              </nav>

              <div class="lp-route lp-route-left-top" aria-hidden="true">
                <span class="lp-route-node"></span>
                <div>
                  <strong>Cortex</strong>
                  <span>20.945</span>
                </div>
              </div>

              <div class="lp-route lp-route-left-bottom" aria-hidden="true">
                <span class="lp-route-node"></span>
                <div>
                  <strong>Aelf</strong>
                  <span>18.346</span>
                </div>
              </div>

              <div class="lp-route lp-route-right-top" aria-hidden="true">
                <div>
                  <strong>Quant</strong>
                  <span>2.945</span>
                </div>
                <span class="lp-route-node"></span>
              </div>

              <div class="lp-route lp-route-right-bottom" aria-hidden="true">
                <div>
                  <strong>Meeton</strong>
                  <span>440</span>
                </div>
                <span class="lp-route-node"></span>
              </div>

              <span class="lp-play-chip" aria-hidden="true">&#9658;</span>

              <div class="lp-stage-content">
                <span class="lp-stage-badge" data-reveal="blur">Unlock Your Assets Spark</span>
                <h1 class="lp-stage-title" data-reveal="rise">
                  One-click for Asset <span>Defense</span>
                </h1>
                <p class="lp-stage-sub" data-reveal="blur">
                  Dive into the art assets, where innovative blockchain technology meets financial expertise.
                </p>

                <div class="lp-stage-actions" data-reveal="zoom">
                  <a href="/auth/login" class="lp-action lp-action-dark">Open App</a>
                  <a href="#features" class="lp-action lp-action-light">Discover More</a>
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
                  <span>DeFi horizons</span>
                  <div class="lp-horizon-bars">
                    <i class="is-active"></i>
                    <i></i>
                    <i></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="lp-brand-row" data-reveal="blur">
              ${partnerMarkup}
            </div>
          </div>
        </div>
      </section>

      <section class="lp-section" id="features">
        <div class="lp-shell lp-mosaic">
          <div class="lp-mosaic-left">
            <article class="lp-card lp-control-card" data-reveal="left">
              <h2>Command Snapshot</h2>
              <p>Mission control for moderation pressure, engagement surges, and policy drift in one compact board.</p>

              <div class="lp-control-grid">
                <div class="lp-control-item">
                  <span>Success transactions</span>
                  <strong class="lp-metric-value" data-counter="98.2" data-suffix="%">0%</strong>
                </div>
                <div class="lp-control-item">
                  <span>Liquidity depth</span>
                  <strong class="lp-metric-value" data-counter="92" data-suffix="%">0%</strong>
                </div>
                <div class="lp-control-item">
                  <span>Growth index</span>
                  <strong class="lp-metric-value" data-counter="19.2" data-suffix="">0</strong>
                </div>
                <div class="lp-control-item">
                  <span>Volume trend</span>
                  <strong class="lp-metric-value" data-counter="24.6" data-suffix="">0</strong>
                </div>
              </div>

              <div class="lp-control-pills">
                <span>Open for policy only</span>
                <span>Assign issue reports</span>
                <span>Auto-priority routing</span>
              </div>
            </article>

            <article class="lp-card lp-wallet-card" data-reveal="left">
              <h2>DeFi Wallet</h2>
              <p>Exploratory mission with DeFi horizon and low-friction workflows through the vast possibilities.</p>

              <div class="lp-wallet-layout">
                <div class="lp-wallet-stat">
                  <span>DeFi wallet system</span>
                  <strong>+A3.7</strong>
                </div>

                <div class="lp-wallet-ring" aria-hidden="true">
                  <div class="lp-wallet-ring-core">Step 01</div>
                </div>
              </div>

              <div class="lp-wallet-list">
                <div>
                  <span>Sent</span>
                  <strong>0.00019662</strong>
                </div>
                <div>
                  <span>Received</span>
                  <strong>1.030</strong>
                </div>
                <div>
                  <span>Pending</span>
                  <strong>4.94K</strong>
                </div>
              </div>
            </article>
          </div>

          <article class="lp-card lp-insight-card" data-reveal="right">
            <h2>Meet Marvellous Insights</h2>
            <p>Save your team's precious time. Config replaces the lengthy process of manual BPM work.</p>

            <div class="lp-insight-grid">
              <div class="lp-insight-box lp-insight-box-main">
                <strong class="lp-metric-value" data-counter="98.2" data-suffix="%">0%</strong>
                <p>Spots worldwide</p>
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
                <small>Financial growth</small>
                <strong class="lp-metric-value" data-counter="19.2" data-prefix="$" data-suffix="M">$0M</strong>
                <p>Your palette financial opportunities.</p>
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
            <p class="lp-kicker" data-reveal="blur">Operational Scorecard</p>
            <h2 data-reveal="rise">Measure every moderation decision like market data</h2>
          </div>

          <div class="lp-metric-row">
            <article class="lp-metric-box" data-reveal="rise">
              <strong class="lp-metric-value" data-counter="200" data-suffix="+">0+</strong>
              <span>Automatable commands</span>
            </article>
            <article class="lp-metric-box" data-reveal="rise">
              <strong class="lp-metric-value" data-counter="32" data-suffix="K">0K</strong>
              <span>Policy checks per minute</span>
            </article>
            <article class="lp-metric-box" data-reveal="rise">
              <strong class="lp-metric-value" data-counter="128" data-suffix="ms">0ms</strong>
              <span>Median command latency</span>
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
            <a href="#features">Assets</a>
            <a href="#metrics">Pricing</a>
            <a href="/docs" data-link="/docs">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  `;

  initNetworkCanvas();
  initHeroSpotlight();
  initScrollReveal();
  initSmoothScroll();
  initLandingSpaLinks();
  initMobileNavDrawer();
  initMetricCounters();
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
    const density = Math.floor((width * height) / 36000);
    const count = Math.max(16, Math.min(40, density));
    nodes = [];

    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.2 + 0.8,
        phase: Math.random() * Math.PI * 2
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

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;

      if (node.x <= 0 || node.x >= width) node.vx *= -1;
      if (node.y <= 0 || node.y >= height) node.vy *= -1;

      const dx = pointer.x - node.x;
      const dy = pointer.y - node.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 160 && dist > 0) {
        const force = (160 - dist) / 160;
        node.x -= (dx / dist) * force * 0.42;
        node.y -= (dy / dist) * force * 0.42;
      }

      const glow = 0.2 + ((Math.sin(time * 0.001 + node.phase) + 1) * 0.5) * 0.24;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(148, 163, 184, ${glow})`;
      ctx.fill();
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);

        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.08;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.lineWidth = 0.7;
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
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;

    lightA.style.transform = `translate(${x * 24}px, ${y * 16}px)`;
    lightB.style.transform = `translate(${x * -18}px, ${y * -12}px)`;

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
