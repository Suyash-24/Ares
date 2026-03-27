import re

# 1. Update landing.js
with open('src/dashboard/public/js/pages/landing.js', 'r', encoding='utf-8') as f:
    landing_js = f.read()

new_landing_js = '''// Landing page (unauthenticated)
function renderLanding() {
  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';

  document.getElementById('page-content').innerHTML = \\
    <div class="bot-landing-page">
      <div class="bot-ambient-glow bot-glow-left"></div>
      <div class="bot-ambient-glow bot-glow-right"></div>
      
      <nav class="bot-navbar">
        <div class="bot-nav-container">
          <a class="bot-brand" href="/" data-link="/">
            <img src="https://cdn.discordapp.com/avatars/1434107390856401049/default.png" alt="Ares" class="bot-logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span style="display:none; font-weight:800; font-size:1.2rem; letter-spacing:-0.05em;">ARES</span>
          </a>
          <div class="bot-nav-links">
            <a href="/docs" data-link="/docs">Documentation</a>
            <a href="#features">Features</a>
            <a href="#pro">Premium</a>
          </div>
          <div class="bot-nav-actions">
            <a href="/auth/login" class="bot-btn-nav">Login</a>
          </div>
        </div>
      </nav>

      <main class="bot-main">
        <header class="bot-hero">
          <div class="bot-pill">
            <span class="bot-pill-dot"></span>
            Ares v2.0 is Live - Unrivaled Performance
          </div>
          <h1 class="bot-hero-title">
            The next generation of<br>
            <span class="bot-gradient-text">community management.</span>
          </h1>
          <p class="bot-hero-subtitle">
            Ares unifies anti-nuke, automod, ticketing, music, and progression into one frictionless ecosystem capable of securing millions of users in real-time.
          </p>
          <div class="bot-hero-buttons">
            <a href="\\" target="_blank" rel="noopener" class="bot-btn-primary">Add to Discord <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="bot-icon-arrow"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
            <a href="/docs" data-link="/docs" class="bot-btn-secondary">Explore Commands</a>
          </div>
        </header>

        <section class="bot-stats-bar">
          <div class="bot-stat"><span class="bot-stat-val">0ms</span><span class="bot-stat-label">Latency Drops</span></div>
          <div class="bot-stat-divider"></div>
          <div class="bot-stat"><span class="bot-stat-val">5K+</span><span class="bot-stat-label">Communities Secured</span></div>
          <div class="bot-stat-divider"></div>
          <div class="bot-stat"><span class="bot-stat-val">99.9%</span><span class="bot-stat-label">System Uptime</span></div>
        </section>

        <section class="bot-mockup-wrapper">
          <div class="bot-mockup-glass">
            <div class="bot-mockup-topbar">
              <div class="bot-mockup-dots"><i></i><i></i><i></i></div>
              <div class="bot-mockup-title">Ares Command Center</div>
            </div>
            <div class="bot-mockup-content">
              <div class="bot-mockup-sidebar">
                <div class="bot-mockup-item active"></div>
                <div class="bot-mockup-item"></div>
                <div class="bot-mockup-item"></div>
                <div class="bot-mockup-item"></div>
              </div>
              <div class="bot-mockup-main">
                <div class="bot-mockup-header-block"></div>
                <div class="bot-mockup-grid">
                  <div class="bot-mockup-card graph">
                    <div class="bot-mockup-graph-lines"></div>
                  </div>
                  <div class="bot-mockup-card list">
                    <i></i><i></i><i></i><i></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" class="bot-bento-section">
          <div class="bot-section-heading">
            <h2>Everything you need. <span class="bot-text-muted">Nothing you don't.</span></h2>
            <p>Ditch the clutter of ten different bots. Ares replaces them all with perfectly tuned, deeply integrated systems.</p>
          </div>
          
          <div class="bot-bento-grid">
            
            <div class="bot-bento-card col-span-2 hover-glow">
              <div class="bot-bento-content">
                <div class="bot-bento-icon shield-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h3>Atomic Anti-Nuke</h3>
                <p>Proactive algorithms detect mass bans, role deletions, and channel wipes in milliseconds, immediately neutralizing malicious admins or compromised accounts.</p>
              </div>
              <div class="bot-bento-visual viz-shield">
                <div class="viz-shield-ring ring-1"></div>
                <div class="viz-shield-ring ring-2"></div>
                <div class="viz-shield-ring ring-3"></div>
              </div>
            </div>

            <div class="bot-bento-card col-span-1 hover-glow">
              <div class="bot-bento-content">
                <div class="bot-bento-icon filter-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h3>Smart Automod</h3>
                <p>Regex-based spam filtering, invite suppression, and instant penalty escalation.</p>
              </div>
            </div>

            <div class="bot-bento-card col-span-1 hover-glow">
              <div class="bot-bento-content">
                <div class="bot-bento-icon ticket-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 5.88V3c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2v-2.88m4.9 2.78-7-7a.99.99 0 0 1 0-1.4l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h3>Support Pipeline</h3>
                <p>Clean multi-tier ticket routing and full cloud transcript logging.</p>
              </div>
            </div>

            <div class="bot-bento-card col-span-2 hover-glow">
              <div class="bot-bento-content">
                <div class="bot-bento-icon level-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 20V10m0 10l-4-4m4 4l4-4M12 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h3>Progression & Community</h3>
                <p>Reward activity with our stunning Voice and Text leveling systems. Giveaways, custom profiles, and deep economy integrations keep servers alive.</p>
              </div>
              <div class="bot-bento-visual viz-levels">
                <div class="viz-bar-wrapper"><div class="viz-bar b1"></div></div>
                <div class="viz-bar-wrapper"><div class="viz-bar b2"></div></div>
                <div class="viz-bar-wrapper"><div class="viz-bar b3"></div></div>
              </div>
            </div>

          </div>
        </section>

        <section class="bot-cta-section">
          <div class="bot-cta-glow"></div>
          <h2>Ready to revolutionize your server?</h2>
          <p>Join thousands of communities running at peak efficiency.</p>
          <a href="\\" target="_blank" rel="noopener" class="bot-btn-primary large">Integrate Ares Now</a>
        </section>

      </main>

      <footer class="bot-footer">
        <div class="bot-footer-top">
          <div class="bot-footer-brand">
            <strong>ARES</strong>
            <p>Elevating communities with uncompromising performance and design.</p>
          </div>
          <div class="bot-footer-links">
            <div class="bot-footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="/docs" data-link="/docs">Documentation</a>
              <a href="#">Premium</a>
            </div>
            <div class="bot-footer-col">
              <h4>Legal</h4>
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div class="bot-footer-bottom">
          <span>© 2026 Ares. All rights reserved.</span>
          <span>Designed for modern communities.</span>
        </div>
      </footer>
    </div>
  \\;
}
'''

new_landing_js = new_landing_js.replace('\\\\$', '$')

with open('src/dashboard/public/js/pages/landing.js', 'w', encoding='utf-8') as f:
    f.write(new_landing_js)

# 2. Update style.css 
# We'll remove .landing-v3 references by doing a regex replacement to chop it out entirely.
with open('src/dashboard/public/css/style.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

# Instead of complex regex for removing, we can just find the start of landing-v3 and chop to the end of where we want to cut.
# However, to be safe, let's keep things clean: I will just append the new styles to the end. The old classes will be unused.
# If you want to replace, I will append the NEW CSS block at the bottom of style.css.

modern_css = '''
/* ═══════════════════════════════════════════
   ARES V4 MODERN LANDING (BLEED/NOCTALY INSPIRED)
   ═══════════════════════════════════════════ */
.bot-landing-page {
  --b-bg: #030303;
  --b-text: #f0f0f0;
  --b-muted: #888888;
  --b-border: rgba(255, 255, 255, 0.08);
  --b-border-hover: rgba(255, 255, 255, 0.15);
  --b-accent: #3b82f6; 
  --b-accent-glow: rgba(59, 130, 246, 0.4);
  --b-card-bg: #0a0a0a;
  --b-glass: rgba(15, 15, 15, 0.7);

  background-color: var(--b-bg);
  color: var(--b-text);
  font-family: 'Inter', 'Manrope', system-ui, sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* Ambient Background Glows */
.bot-ambient-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(140px);
  z-index: 0;
  pointer-events: none;
  opacity: 0.15;
}
.bot-glow-left {
  background: var(--b-accent);
  top: -200px;
  left: -200px;
}
.bot-glow-right {
  background: #8b5cf6;
  top: 300px;
  right: -200px;
  width: 500px;
  height: 500px;
  opacity: 0.12;
}

/* Navbar */
.bot-navbar {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 50;
  background: rgba(3, 3, 3, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--b-border);
}
.bot-nav-container {
  max-width: 1200px;
  margin: 0 auto;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.bot-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #fff;
}
.bot-logo-img {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}
.bot-nav-links {
  display: flex;
  gap: 32px;
}
.bot-nav-links a {
  color: var(--b-muted);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 500;
  transition: color 0.2s ease;
}
.bot-nav-links a:hover {
  color: #fff;
}
.bot-btn-nav {
  color: #fff;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 99px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--b-border);
  transition: all 0.2s;
}
.bot-btn-nav:hover {
  background: rgba(255,255,255,0.1);
}

/* Main Content constraints */
.bot-main {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  padding-top: 140px;
}

/* Hero Section */
.bot-hero {
  text-align: center;
  padding: 40px 0 60px;
  max-width: 800px;
  margin: 0 auto;
}
.bot-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--b-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: #d4d4d8;
  margin-bottom: 24px;
}
.bot-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}
.bot-hero-title {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0 0 24px;
  color: #ffffff;
}
.bot-gradient-text {
  background: linear-gradient(to right, #fff, #9ca3af);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.bot-hero-subtitle {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--b-muted);
  margin: 0 auto 40px;
  max-width: 640px;
}
.bot-hero-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

/* Buttons */
.bot-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  color: #000000;
  padding: 12px 28px;
  border-radius: 99px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  box-shadow: 0 0 20px rgba(255,255,255,0.15);
}
.bot-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 24px rgba(255,255,255,0.25);
}
.bot-btn-primary.large {
  font-size: 1.05rem;
  padding: 16px 36px;
}
.bot-icon-arrow {
  transition: transform 0.2s;
}
.bot-btn-primary:hover .bot-icon-arrow {
  transform: translateX(4px);
}
.bot-btn-secondary {
  display: inline-flex;
  align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--b-border);
  color: #fff;
  padding: 12px 28px;
  border-radius: 99px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.bot-btn-secondary:hover {
  background: rgba(255,255,255,0.06);
  border-color: var(--b-border-hover);
}

/* Quick Stats Bar */
.bot-stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  margin-bottom: 80px;
}
.bot-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.bot-stat-val {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}
.bot-stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--b-muted);
  margin-top: 4px;
}
.bot-stat-divider {
  width: 1px;
  height: 24px;
  background: var(--b-border);
}

/* Glass Mockup Frame */
.bot-mockup-wrapper {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto 120px;
  perspective: 1000px;
}
.bot-mockup-wrapper::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.0) 100%);
  z-index: 0;
  filter: blur(2px);
}
.bot-mockup-glass {
  position: relative;
  z-index: 1;
  background: var(--b-glass);
  border: 1px solid var(--b-border);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
  transform: rotateX(2deg);
  transition: transform 0.5s ease;
}
.bot-mockup-glass:hover {
  transform: rotateX(0deg);
}
.bot-mockup-topbar {
  height: 40px;
  border-bottom: 1px solid var(--b-border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: rgba(0,0,0,0.4);
}
.bot-mockup-dots {
  display: flex;
  gap: 6px;
}
.bot-mockup-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3f3f46;
}
.bot-mockup-dots i:nth-child(1) { background: #ef4444; }
.bot-mockup-dots i:nth-child(2) { background: #eab308; }
.bot-mockup-dots i:nth-child(3) { background: #22c55e; }
.bot-mockup-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: var(--b-muted);
  font-weight: 500;
  letter-spacing: 0.05em;
}

/* Fake Mockup Insides */
.bot-mockup-content {
  display: flex;
  height: 400px;
}
.bot-mockup-sidebar {
  width: 200px;
  border-right: 1px solid var(--b-border);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0,0,0,0.2);
}
.bot-mockup-item {
  height: 28px;
  border-radius: 6px;
  background: rgba(255,255,255,0.03);
  border: 1px solid transparent;
}
.bot-mockup-item.active {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.1);
}
.bot-mockup-main {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bot-mockup-header-block {
  height: 60px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--b-border);
  border-radius: 8px;
}
.bot-mockup-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  flex: 1;
}
.bot-mockup-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--b-border);
  border-radius: 8px;
}
.bot-mockup-card.graph {
  display: flex;
  align-items: flex-end;
  padding: 16px;
}
.bot-mockup-graph-lines {
  width: 100%;
  height: 60%;
  background: linear-gradient(0deg, var(--b-accent-glow) 0%, transparent 100%);
  border-bottom: 2px solid var(--b-accent);
  border-radius: 4px;
}
.bot-mockup-card.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}
.bot-mockup-card.list i {
  height: 12px;
  border-radius: 4px;
  background: rgba(255,255,255,0.05);
}
.bot-mockup-card.list i:nth-child(1) { width: 80%; }
.bot-mockup-card.list i:nth-child(2) { width: 60%; }
.bot-mockup-card.list i:nth-child(3) { width: 90%; }
.bot-mockup-card.list i:nth-child(4) { width: 50%; }


/* Bento Grid Features */
.bot-bento-section {
  padding: 60px 0;
  margin-bottom: 100px;
}
.bot-section-heading {
  text-align: center;
  margin-bottom: 60px;
}
.bot-section-heading h2 {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  color: #fff;
}
.bot-text-muted {
  color: var(--b-muted);
}
.bot-section-heading p {
  color: #a1a1aa;
  font-size: 1.1rem;
  max-width: 500px;
  margin: 0 auto;
}

.bot-bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.bot-bento-card {
  background: var(--b-card-bg);
  border: 1px solid var(--b-border);
  border-radius: 20px;
  padding: 32px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 280px;
  transition: border-color 0.3s ease, background 0.3s ease;
}
.col-span-2 {
  grid-column: span 2;
}
.col-span-1 {
  grid-column: span 1;
}

.hover-glow:hover {
  border-color: rgba(255,255,255,0.18);
  background: #0d0d0d;
}

.bot-bento-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  border: 1px solid var(--b-border);
  background: rgba(255,255,255,0.02);
  color: #fff;
}
.shield-icon { color: #60a5fa; box-shadow: 0 0 20px rgba(96,165,250,0.1); }
.filter-icon { color: #f472b6; box-shadow: 0 0 20px rgba(244,114,182,0.1); }
.ticket-icon { color: #34d399; box-shadow: 0 0 20px rgba(52,211,153,0.1); }
.level-icon  { color: #fbbf24; box-shadow: 0 0 20px rgba(251,191,36,0.1); }

.bot-bento-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: #fff;
}
.bot-bento-content p {
  color: #a1a1aa;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
  max-width: 90%;
}

/* Custom Visuals for Bento Cards */
.bot-bento-visual {
  position: absolute;
  right: 20px;
  bottom: 20px;
  opacity: 0.7;
}
/* Shield Visual */
.viz-shield {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: -20px;
  bottom: -40px;
  opacity: 0.15;
}
.viz-shield-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid #60a5fa;
}
.ring-1 { width: 60px; height: 60px; animation: pulse 2s infinite; }
.ring-2 { width: 100px; height: 100px; animation: pulse 2s infinite 0.5s; opacity: 0.5; }
.ring-3 { width: 140px; height: 140px; animation: pulse 2s infinite 1s; opacity: 0.2; }

/* Levels Visual */
.viz-levels {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 80px;
  position: absolute;
  right: 40px;
  bottom: 30px;
}
.viz-bar-wrapper {
  width: 16px;
  height: 100%;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.viz-bar {
  width: 100%;
  background: linear-gradient(0deg, #fbbf24, #f59e0b);
  border-radius: 4px;
}
.b1 { height: 40%; }
.b2 { height: 70%; }
.b3 { height: 100%; }

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

/* CTA Section */
.bot-cta-section {
  position: relative;
  text-align: center;
  padding: 80px 20px;
  background: var(--b-card-bg);
  border: 1px solid var(--b-border);
  border-radius: 24px;
  margin-bottom: 100px;
  overflow: hidden;
}
.bot-cta-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  background: var(--b-accent-glow);
  filter: blur(120px);
  z-index: 0;
  pointer-events: none;
}
.bot-cta-section h2,
.bot-cta-section p,
.bot-cta-section a {
  position: relative;
  z-index: 1;
}
.bot-cta-section h2 {
  font-size: 2.25rem;
  font-weight: 800;
  margin: 0 0 16px;
}
.bot-cta-section p {
  color: #a1a1aa;
  font-size: 1.1rem;
  margin: 0 0 32px;
}

/* Footer */
.bot-footer {
  border-top: 1px solid var(--b-border);
  padding: 60px 24px 40px;
  max-width: 1200px;
  margin: 0 auto;
}
.bot-footer-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 60px;
  flex-wrap: wrap;
  gap: 40px;
}
.bot-footer-brand strong {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.05em;
  display: block;
  margin-bottom: 12px;
}
.bot-footer-brand p {
  color: #a1a1aa;
  max-width: 300px;
  line-height: 1.6;
}
.bot-footer-links {
  display: flex;
  gap: 80px;
}
.bot-footer-col h4 {
  color: #fff;
  font-size: 1rem;
  margin: 0 0 20px;
}
.bot-footer-col a {
  display: block;
  color: #a1a1aa;
  text-decoration: none;
  margin-bottom: 12px;
  transition: color 0.2s;
}
.bot-footer-col a:hover {
  color: #fff;
}
.bot-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #71717a;
  font-size: 0.85rem;
  padding-top: 24px;
  border-top: 1px solid var(--b-border);
}

@media (max-width: 900px) {
  .bot-bento-grid {
    grid-template-columns: 1fr;
  }
  .col-span-2 { grid-column: span 1; }
  .bot-hero-title { font-size: 3rem; }
  .bot-stats-bar { flex-direction: column; gap: 20px; }
  .bot-stat-divider { width: 40px; height: 1px; }
  .bot-footer-top { flex-direction: column; }
  .bot-footer-links { flex-direction: column; gap: 40px; }
  .bot-nav-links { display: none; }
}
'''

with open('src/dashboard/public/css/style.css', 'a', encoding='utf-8') as f:
    f.write('\\n' + modern_css)

print("Updated landing.js and appended pure aesthetics to style.css")
