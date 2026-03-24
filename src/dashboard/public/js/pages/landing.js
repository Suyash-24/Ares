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
            <div class="landing-v3-preview-label">Ares Operations Console</div>
          </div>
          <div class="landing-v3-preview-body landing-v3-ops-layout">
            <div class="landing-v3-terminal">
              <div class="landing-v3-terminal-head">
                <span>Live Commands</span>
                <span class="landing-v3-terminal-status">connected</span>
              </div>
              <pre><code>.antinuke wizard
.automod preset moderate
.play Never Gonna Give You Up
.ticket new
.giveaway start Nitro Classic 1d 2
.leveling enable
.logsetup</code></pre>
            </div>
            <div class="landing-v3-ops-stack">
              <article><strong>Security</strong><span>Anti-Nuke + Automod active</span></article>
              <article><strong>Engagement</strong><span>Leveling and giveaways enabled</span></article>
              <article><strong>Support</strong><span>Ticket panels and logs ready</span></article>
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
            <h2>Real Ares Modules</h2>
            <p>Everything below maps to actual commands available in Ares today.</p>
          </div>
          <div class="landing-v3-grid">
            <article class="landing-v3-card">
              <h3>Anti-Nuke Protection</h3>
              <p>Protect against mass bans, role abuse, and channel nukes with policy presets.</p>
              <code>.antinuke wizard</code>
            </article>
            <article class="landing-v3-card">
              <h3>Automod Filters</h3>
              <p>Spam, invite, bad-word, and mention controls with instant enforcement.</p>
              <code>.automod preset moderate</code>
            </article>
            <article class="landing-v3-card">
              <h3>Music System</h3>
              <p>YouTube, Spotify, and SoundCloud queue playback with slash and prefix support.</p>
              <code>.play &lt;query or URL&gt;</code>
            </article>
            <article class="landing-v3-card">
              <h3>Ticket Support</h3>
              <p>Panel-based ticketing with staff assignment and transcript tools.</p>
              <code>.ticket new</code>
            </article>
            <article class="landing-v3-card">
              <h3>Giveaways + Leveling</h3>
              <p>Run timed giveaways and unlock progression through XP and leaderboards.</p>
              <code>.giveaway start Nitro Classic 1d 2</code>
            </article>
            <article class="landing-v3-card">
              <h3>Logging Setup</h3>
              <p>Wire moderation and server event logs to dedicated channels in seconds.</p>
              <code>.logsetup</code>
            </article>
          </div>
        </section>

        <section class="landing-v3-testimonials" id="support">
          <h2>Real Workflows and Resources</h2>
          <div class="landing-v3-workflow-grid">
            <article class="landing-v3-workflow-card">
              <h4>Secure a New Server</h4>
              <p><code>.antinuke wizard</code> then <code>.automod preset moderate</code> to bring core protection online quickly.</p>
            </article>
            <article class="landing-v3-workflow-card">
              <h4>Set Up Member Progression</h4>
              <p>Use <code>.leveling enable</code> and configure announcements to make activity visible and rewarding.</p>
            </article>
            <article class="landing-v3-workflow-card">
              <h4>Run Support + Events</h4>
              <p>Launch <code>.ticket new</code> for help desks and <code>.giveaway start Nitro Classic 1d 2</code> for engagement.</p>
            </article>
            <article class="landing-v3-workflow-card">
              <h4>Need Full Command Reference?</h4>
              <p>Browse the full module docs and examples in <a href="/docs" data-link="/docs">documentation</a>.</p>
            </article>
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
