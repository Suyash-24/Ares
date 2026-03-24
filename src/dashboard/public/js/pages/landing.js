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
            <div class="landing-v3-preview-label">Ares Live Command Hub</div>
          </div>
          <div class="landing-v3-preview-body landing-v3-showcase-layout">
            <div class="landing-v3-showcase-main">
              <div class="landing-v3-showcase-glow"></div>
              <h3>Run moderation, security, and engagement from one surface.</h3>
              <p>
                Ares unifies anti-nuke, automod, ticketing, music, giveaways, and logs in a single workflow so your team can move fast without chaos.
              </p>
              <div class="landing-v3-showcase-rail">
                <div class="landing-v3-rail-row"><span>Threat Detection</span><b>Active</b></div>
                <div class="landing-v3-rail-row"><span>Automod Filters</span><b>24 rules running</b></div>
                <div class="landing-v3-rail-row"><span>Support Tickets</span><b>12 open</b></div>
                <div class="landing-v3-rail-row"><span>Server Logs</span><b>Live stream</b></div>
              </div>
            </div>
            <div class="landing-v3-showcase-side">
              <article>
                <strong>Response Time</strong>
                <span>Most moderation actions execute in milliseconds for high-volume communities.</span>
              </article>
              <article>
                <strong>Scalable Setup</strong>
                <span>From small private groups to large public servers, modules stay consistent and easy to tune.</span>
              </article>
              <article>
                <strong>Unified Dashboard</strong>
                <span>Configure and monitor all core systems without jumping between disconnected bots.</span>
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
            <p>Purpose-built systems designed for security, clarity, and daily server growth.</p>
          </div>
          <div class="landing-v3-grid">
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-shield"></div>
              <h3>Anti-Nuke Protection</h3>
              <p>Stops destructive actions like mass bans, role hijacks, and channel wipes before they escalate.</p>
              <div class="landing-v3-card-meter"><span style="--w:92%"></span></div>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-filter"></div>
              <h3>Automod Filters</h3>
              <p>Keeps chats clean by handling spam, invite links, abusive patterns, and noisy message floods.</p>
              <div class="landing-v3-card-meter"><span style="--w:86%"></span></div>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-wave"></div>
              <h3>Music System</h3>
              <p>Delivers stable queue-based playback for YouTube, Spotify, and SoundCloud with smooth controls.</p>
              <div class="landing-v3-card-meter"><span style="--w:79%"></span></div>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-ticket"></div>
              <h3>Ticket Support</h3>
              <p>Creates structured support channels with assignment flow, context retention, and transcript readiness.</p>
              <div class="landing-v3-card-meter"><span style="--w:84%"></span></div>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-growth"></div>
              <h3>Giveaways + Leveling</h3>
              <p>Boosts member activity through XP progression, role rewards, and repeatable giveaway campaigns.</p>
              <div class="landing-v3-card-meter"><span style="--w:88%"></span></div>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-logs"></div>
              <h3>Logging Setup</h3>
              <p>Gives admins a clear audit trail for moderation and server events in dedicated log channels.</p>
              <div class="landing-v3-card-meter"><span style="--w:95%"></span></div>
            </article>
          </div>
        </section>

        <section class="landing-v3-testimonials" id="support">
          <h2>Built for Real Community Use Cases</h2>
          <div class="landing-v3-rollout-grid">
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">Gaming Communities</span>
              <h4>Protect high-traffic chats without slowing conversation.</h4>
              <p>Anti-raid, automod, and role controls keep match-day or event spikes manageable for staff.</p>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">Creator Servers</span>
              <h4>Keep fan servers organized with lightweight ops.</h4>
              <p>Tickets, announcements, and moderation presets reduce manual overhead for creator teams.</p>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">Support-Heavy Hubs</span>
              <h4>Handle member issues faster with structured support flow.</h4>
              <p>Ticket routing and log history make handoffs clean between moderators across time zones.</p>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">Growth Servers</span>
              <h4>Drive retention through progression and events.</h4>
              <p>Leveling, giveaways, and voice/music tools create repeat participation loops for members.</p>
            </article>
            <article class="landing-v3-rollout-card landing-v3-rollout-card-wide">
              <h4>Launch with confidence in minutes</h4>
              <p>Open docs for complete module setup guides, permission requirements, and production-ready defaults.</p>
              <a href="/docs" data-link="/docs">Explore Documentation</a>
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
