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
            <div class="landing-v3-preview-label">Ares Control Surface</div>
          </div>
          <div class="landing-v3-preview-body landing-v3-showcase-layout">
            <div class="landing-v3-showcase-main">
              <div class="landing-v3-showcase-glow"></div>
              <h3>Everything your server needs, in one command center.</h3>
              <p>
                Ares combines protection, moderation, support tooling, music, and engagement systems into one polished workflow.
                No plugin chaos, no scattered setup.
              </p>
              <div class="landing-v3-showcase-chips">
                <span>Anti-Nuke</span>
                <span>Automod</span>
                <span>Tickets</span>
                <span>Giveaways</span>
                <span>Leveling</span>
                <span>Logs</span>
              </div>
            </div>
            <div class="landing-v3-showcase-side">
              <article>
                <strong>Protection Layer</strong>
                <span>Mass-action defenses, smart filtering, instant logging.</span>
              </article>
              <article>
                <strong>Engagement Layer</strong>
                <span>Music, leveling, and event tools that keep communities active.</span>
              </article>
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
            <p>Each module below has a specific purpose, clear impact, and production-ready behavior.</p>
          </div>
          <div class="landing-v3-grid">
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-shield"></div>
              <h3>Anti-Nuke Protection</h3>
              <p>Stops destructive actions like mass bans, role hijacks, and channel wipes before they escalate.</p>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-filter"></div>
              <h3>Automod Filters</h3>
              <p>Keeps chats clean by handling spam, invite links, abusive patterns, and noisy message floods.</p>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-wave"></div>
              <h3>Music System</h3>
              <p>Delivers stable queue-based playback for YouTube, Spotify, and SoundCloud with smooth controls.</p>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-ticket"></div>
              <h3>Ticket Support</h3>
              <p>Creates structured support channels with assignment flow, context retention, and transcript readiness.</p>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-growth"></div>
              <h3>Giveaways + Leveling</h3>
              <p>Boosts member activity through XP progression, role rewards, and repeatable giveaway campaigns.</p>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-logs"></div>
              <h3>Logging Setup</h3>
              <p>Gives admins a clear audit trail for moderation and server events in dedicated log channels.</p>
            </article>
          </div>
        </section>

        <section class="landing-v3-testimonials" id="support">
          <h2>How Teams Use Ares</h2>
          <div class="landing-v3-rollout-grid">
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">01</span>
              <h4>Harden the Server</h4>
              <p>Enable anti-raid and anti-nuke safeguards first so destructive actions are blocked from day one.</p>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">02</span>
              <h4>Configure Day-to-Day Moderation</h4>
              <p>Set automod rules and moderation flows so your team can respond quickly and consistently.</p>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">03</span>
              <h4>Add Member Experience Systems</h4>
              <p>Turn on leveling, music, and giveaways to keep members engaged and active over time.</p>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">04</span>
              <h4>Scale with Visibility</h4>
              <p>Use logging, stats, and dashboards to monitor growth and keep operational clarity as the server expands.</p>
            </article>
            <article class="landing-v3-rollout-card landing-v3-rollout-card-wide">
              <h4>Need exact setup details?</h4>
              <p>Use the complete command documentation for step-by-step module configuration and examples.</p>
              <a href="/docs" data-link="/docs">Open Documentation</a>
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
