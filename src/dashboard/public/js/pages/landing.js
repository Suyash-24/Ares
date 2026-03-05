// ── Landing page (unauthenticated) ──
function renderLanding() {
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('content').style.marginLeft = '0';

  document.getElementById('page-content').innerHTML = `
    <div class="landing">
      <div class="landing-content" style="animation: fadeUp 0.5s ease-out">
        <div style="font-size: 4rem; margin-bottom: 20px;">⚡</div>
        <h1 class="landing-title">Ares Dashboard</h1>
        <p class="landing-subtitle">
          Manage your Discord servers, configure moderation, automod, music, leveling and more — all from one beautiful panel.
        </p>
        <a href="/auth/login" class="btn btn-primary" style="text-decoration:none">
          <span>🔐</span> Login with Discord
        </a>
      </div>
    </div>
  `;
}
