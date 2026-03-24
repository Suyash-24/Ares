// Landing page (unauthenticated)
function renderLanding() {
  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';

  document.getElementById('page-content').innerHTML = `
    <div class="landing-v3">
      <div class="landing-v3-bg-orb orb-a"></div>
      <div class="landing-v3-bg-orb orb-b"></div>

      <header class="landing-v3-nav-wrap">
        <div class="landing-v3-nav">
          <a class="landing-v3-logo" href="/" data-link="/">ARES</a>
          <nav class="landing-v3-links">
            <a href="/docs" data-link="/docs">Docs</a>
            <a href="#support">Support</a>
            <a href="#servers">Servers</a>
          </nav>
          <div class="landing-v3-nav-actions">
            <a class="landing-v3-dash" href="/auth/login">Dashboard</a>
          </div>
        </div>
      </header>

      <main class="landing-v3-shell">
        <section class="landing-v3-hero">
          <div class="landing-v3-badge">Now powered by Ares AI 2.0</div>
          <h1>
            The Ultimate Discord
            <span>Command Center.</span>
          </h1>
          <p>
            Elevate your community with military-grade moderation, high-fidelity music, and intelligent automation.
            Ares is the only bot your server will ever need.
          </p>
          <div class="landing-v3-hero-actions">
            <a href="${oauthUrl}" target="_blank" rel="noopener" class="landing-v3-btn primary">Add to Discord</a>
            <a href="/docs" data-link="/docs" class="landing-v3-btn ghost">View Features</a>
          </div>
        </section>

        <section class="landing-v3-preview">
          <div class="landing-v3-preview-top">
            <div class="landing-v3-window-dots"><span></span><span></span><span></span></div>
            <div class="landing-v3-preview-label">Live Discord Analytics</div>
          </div>
          <div class="landing-v3-preview-body">
            <div class="landing-v3-chart-card">
              <div class="landing-v3-chart-grid"></div>
              <div class="landing-v3-chart-lines">
                <i style="--h:42%; --x:0"></i>
                <i style="--h:62%; --x:16"></i>
                <i style="--h:38%; --x:32"></i>
                <i style="--h:78%; --x:48"></i>
                <i style="--h:66%; --x:64"></i>
                <i style="--h:88%; --x:80"></i>
              </div>
            </div>
            <div class="landing-v3-preview-copy">
              <h3>Discord Preview</h3>
              <p>Watch activity, moderation events, and music queues in one compact command view.</p>
            </div>
          </div>
        </section>

        <section class="landing-v3-stats" id="servers">
          <article><strong>5,000+</strong><span>Global Servers</span></article>
          <article><strong>2M+</strong><span>Active Users</span></article>
          <article><strong>99.9%</strong><span>Network Uptime</span></article>
        </section>

        <section class="landing-v3-capabilities">
          <div class="landing-v3-headline">
            <h2>Supreme Capabilities</h2>
            <p>Engineered for performance. Built for the void. Our features set the standard for modern Discord management.</p>
          </div>
          <div class="landing-v3-grid">
            <article class="landing-v3-card wide">
              <h3>Moderation</h3>
              <p>Advanced auto-mod systems with customizable filters, warning thresholds, and automated temporary bans.</p>
              <div class="landing-v3-card-visual ring"></div>
            </article>
            <article class="landing-v3-card tall">
              <h3>Music</h3>
              <p>Lossless audio streaming with YouTube, Spotify, and SoundCloud integration. Crystal clear sound, zero lag.</p>
              <div class="landing-v3-card-visual bars"><span></span><span></span><span></span><span></span></div>
            </article>
            <article class="landing-v3-card">
              <h3>AI Intelligence</h3>
              <p>Smart sentiment analysis and automated response systems powered by the latest LLMs.</p>
            </article>
            <article class="landing-v3-card">
              <h3>Automations</h3>
              <p>Custom welcome messages, auto-roles, and scheduled announcements. Set it and forget it.</p>
            </article>
            <article class="landing-v3-card code">
              <pre>// user joins
if (safeJoin("Core")) {
  send("Welcome to the void.");
}</pre>
            </article>
          </div>
        </section>

        <section class="landing-v3-testimonials" id="support">
          <h2>Trusted by the best communities</h2>
          <div class="landing-v3-quote-grid">
            <blockquote>
              "Ares completely changed how we manage our 50k member community. The auto-mod is terrifyingly efficient."
              <cite>Alex Rivers, TechHub</cite>
            </blockquote>
            <blockquote>
              "The music quality is unmatched. We tried every other bot, and nothing comes close to Ares lossless streaming."
              <cite>Sarah Chen, LoFi Vibes</cite>
            </blockquote>
            <blockquote>
              "Documentation is top-tier. We had our entire server automated in less than an hour. Highly recommended."
              <cite>Marcus Thorne, CodeGuild</cite>
            </blockquote>
          </div>
        </section>

        <section class="landing-v3-cta">
          <h2>Ready to command the void?</h2>
          <p>Join thousands of top-tier servers using Ares today.</p>
          <a href="${oauthUrl}" target="_blank" rel="noopener" class="landing-v3-btn primary">Get Started Free</a>
        </section>
      </main>

      <footer class="landing-v3-footer">
        <div class="landing-v3-footer-left">
          <strong>ARES</strong>
          <span>Built for the void.</span>
        </div>
        <div class="landing-v3-footer-links">
          <a href="/docs" data-link="/docs">Docs</a>
          <a href="/docs" data-link="/docs">Terms</a>
          <a href="/docs" data-link="/docs">Privacy</a>
          <a href="/docs" data-link="/docs">Status</a>
        </div>
      </footer>
    </div>
  `;
}
