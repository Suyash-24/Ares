// Landing page (unauthenticated)
function renderLanding() {
  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';

  document.getElementById('page-content').innerHTML = `
    <div class="landing-v3">
      <div class="landing-v3-ambient"></div>

      <nav class="landing-v3-nav">
        <a class="landing-v3-logo" href="/" data-link="/">ARES</a>
        <div class="landing-v3-links">
          <a href="#features">Features</a>
          <a href="#usecases">Use Cases</a>
          <a href="/docs" data-link="/docs">Docs</a>
        </div>
        <div class="landing-v3-actions">
          <a class="landing-v3-dash" href="/auth/login">Open Dashboard</a>
        </div>
      </nav>

      <div class="landing-v3-shell">
        <section class="landing-v3-hero">
          <div class="landing-v3-badge">Ops-grade security + engagement</div>
          <h1>Secure, automate, and grow your Discord server.</h1>
          <p>
            Ares merges anti-nuke, automod, tickets, music, giveaways, and logging into one control plane so staff move faster, stay safe, and keep members active.
          </p>
          <div class="landing-v3-hero-actions">
            <a class="landing-v3-btn primary" href="${oauthUrl}" target="_blank" rel="noopener">Add to Discord</a>
            <a class="landing-v3-btn ghost" href="/docs" data-link="/docs">View Documentation</a>
          </div>

          <div class="landing-v3-trust">
            <div class="landing-v3-metric"><strong>6,800+</strong><span>Servers protected</span></div>
            <div class="landing-v3-metric"><strong>99.9%</strong><span>Operational uptime</span></div>
            <div class="landing-v3-metric"><strong>2.4M</strong><span>Incidents mitigated</span></div>
          </div>

          <div class="landing-v3-marquee">
            <div class="landing-v3-marquee-track">
              <span class="landing-v3-chip">League Arena · 390k</span>
              <span class="landing-v3-chip">Creator Hub · 180k</span>
              <span class="landing-v3-chip">Esports Central · 250k</span>
              <span class="landing-v3-chip">Support Desk · 120k</span>
              <span class="landing-v3-chip">Music Lounge · 95k</span>
              <span class="landing-v3-chip">Study Space · 80k</span>
              <span class="landing-v3-chip">Event Ops · 210k</span>
              <span class="landing-v3-chip">League Arena · 390k</span>
              <span class="landing-v3-chip">Creator Hub · 180k</span>
              <span class="landing-v3-chip">Esports Central · 250k</span>
              <span class="landing-v3-chip">Support Desk · 120k</span>
              <span class="landing-v3-chip">Music Lounge · 95k</span>
              <span class="landing-v3-chip">Study Space · 80k</span>
              <span class="landing-v3-chip">Event Ops · 210k</span>
            </div>
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
                Anti-nuke, automod, ticketing, music, giveaways, and logs ship with sane defaults so you can flip them on in minutes and trust they will hold under load.
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

        <section class="landing-v3-capabilities" id="features">
          <div class="landing-v3-headline">
            <h2>Operations-grade modules</h2>
            <p>Each system ships with defaults that protect, then scales with granular rules, audit trails, and docs you can hand to staff.</p>
          </div>
          <div class="landing-v3-grid">
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-shield"></div>
              <h3>Anti-Nuke Protection</h3>
              <p>Blocks mass bans, role hijacks, and channel wipes instantly, with rollback and lockdown options ready.</p>
              <div class="landing-v3-card-meter"><span style="--w:92%"></span></div>
              <a class="landing-v3-doc-link" href="/docs" data-link="/docs">See setup guide</a>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-filter"></div>
              <h3>Automod Filters</h3>
              <p>Regex filters, invite blocking, flood controls, and penalty escalation built to be transparent to staff.</p>
              <div class="landing-v3-card-meter"><span style="--w:86%"></span></div>
              <a class="landing-v3-doc-link" href="/docs" data-link="/docs">View rules examples</a>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-ticket"></div>
              <h3>Support Tickets</h3>
              <p>Structured routing with assignment, context retention, and transcript export for compliance-ready support.</p>
              <div class="landing-v3-card-meter"><span style="--w:84%"></span></div>
              <a class="landing-v3-doc-link" href="/docs" data-link="/docs">Configure workflows</a>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-wave"></div>
              <h3>Music System</h3>
              <p>Stable queue-based playback with Spotify, YouTube, and SoundCloud integration plus in-channel controls.</p>
              <div class="landing-v3-card-meter"><span style="--w:79%"></span></div>
              <a class="landing-v3-doc-link" href="/docs" data-link="/docs">See music commands</a>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-growth"></div>
              <h3>Giveaways + Leveling</h3>
              <p>Member progression, XP boosts, and campaigns to keep participation loops running every week.</p>
              <div class="landing-v3-card-meter"><span style="--w:88%"></span></div>
              <a class="landing-v3-doc-link" href="/docs" data-link="/docs">Launch a campaign</a>
            </article>
            <article class="landing-v3-card square">
              <div class="landing-v3-module-visual v-logs"></div>
              <h3>Logging Setup</h3>
              <p>Clear audit trails for moderation and server events with channel-specific routing and retention.</p>
              <div class="landing-v3-card-meter"><span style="--w:95%"></span></div>
              <a class="landing-v3-doc-link" href="/docs" data-link="/docs">Open log presets</a>
            </article>
          </div>
        </section>

        <section class="landing-v3-testimonials" id="usecases">
          <h2>Built for real community models</h2>
          <div class="landing-v3-rollout-grid">
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">Gaming Events</span>
              <h4>Protect high-traffic chats without slowing conversation.</h4>
              <div class="landing-v3-checklist">
                <span>Anti-raid + anti-nuke pre-armed</span>
                <span>Voice and text leveling during events</span>
                <span>Live logs for staff coordination</span>
              </div>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">Creator Servers</span>
              <h4>Keep fan servers organized with lightweight ops.</h4>
              <div class="landing-v3-checklist">
                <span>Ticket routing with assignments</span>
                <span>Announcement-ready automations</span>
                <span>Role-based access for VIP areas</span>
              </div>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">Support Hubs</span>
              <h4>Handle issues faster with structured support flow.</h4>
              <div class="landing-v3-checklist">
                <span>Transcript exports for every ticket</span>
                <span>Logging that ties actions to staff</span>
                <span>Queue visibility across time zones</span>
              </div>
            </article>
            <article class="landing-v3-rollout-card">
              <span class="landing-v3-rollout-step">Growth Servers</span>
              <h4>Drive retention through progression and events.</h4>
              <div class="landing-v3-checklist">
                <span>XP boosts on schedules and channels</span>
                <span>Giveaways that recycle engaged members</span>
                <span>Music sessions with queue control</span>
              </div>
            </article>
            <article class="landing-v3-rollout-card landing-v3-rollout-card-wide">
              <h4>Launch with confidence in minutes</h4>
              <p>Open docs for module setup guides, permission requirements, and production-ready defaults.</p>
              <a href="/docs" data-link="/docs">Explore Documentation</a>
            </article>
          </div>
        </section>

        <section class="landing-v3-cta" id="pro">
          <h2>Ready to lock down and grow?</h2>
          <p>Join thousands of communities running Ares with enterprise-grade reliability.</p>
          <div class="landing-v3-hero-actions">
            <a class="landing-v3-btn primary" href="${oauthUrl}" target="_blank" rel="noopener">Invite Ares</a>
            <a class="landing-v3-btn ghost" href="/docs" data-link="/docs">Browse docs</a>
          </div>
        </section>

        <footer class="landing-v3-footer">
          <div class="landing-v3-footer-left">
            <strong>ARES</strong>
            <span>Discord operations, simplified.</span>
          </div>
          <div class="landing-v3-footer-links">
            <a href="/docs" data-link="/docs">Docs</a>
            <a href="/auth/login">Dashboard</a>
            <a href="/">Status</a>
            <a href="/">Support</a>
          </div>
        </footer>
      </div>
    </div>
  `;
}
