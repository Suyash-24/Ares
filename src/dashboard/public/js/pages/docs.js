// ── Documentation page ──
function renderDocs() {
  // Hide sidebar, full-width layout like landing
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('content').style.marginLeft = '0';
  document.getElementById('content').style.padding = '0';

  const categories = [
    {
      id: 'moderation', icon: '🛡️', title: 'Moderation',
      desc: '75+ commands for keeping your server safe and organized.',
      commands: [
        { name: 'ban', usage: '.ban @user [reason]', desc: 'Ban a member from the server.' },
        { name: 'kick', usage: '.kick @user [reason]', desc: 'Kick a member from the server.' },
        { name: 'mute', usage: '.mute @user [duration] [reason]', desc: 'Mute a member server-wide.' },
        { name: 'warn', usage: '.warn @user [reason]', desc: 'Issue a warning to a member.' },
        { name: 'clear', usage: '.clear [amount]', desc: 'Bulk delete messages in a channel.' },
        { name: 'detain', usage: '.detain @user [reason]', desc: 'Detain a member with restricted access.' },
        { name: 'lock', usage: '.lock [channel]', desc: 'Lock a channel to prevent messages.' },
        { name: 'unlock', usage: '.unlock [channel]', desc: 'Unlock a previously locked channel.' },
        { name: 'tempban', usage: '.tempban @user [duration] [reason]', desc: 'Temporarily ban a member.' },
        { name: 'softban', usage: '.softban @user [reason]', desc: 'Ban and immediately unban to clear messages.' },
        { name: 'massban', usage: '.massban @user1 @user2 ...', desc: 'Ban multiple members at once.' },
        { name: 'modhistory', usage: '.modhistory @user', desc: 'View moderation history of a user.' },
        { name: 'warnings', usage: '.warnings @user', desc: 'List all warnings for a user.' },
        { name: 'slowmode', usage: '.slowmode [seconds]', desc: 'Set slowmode for a channel.' },
        { name: 'nuke', usage: '.nuke', desc: 'Clone and delete the current channel.' },
        { name: 'role', usage: '.role @user @role', desc: 'Manage roles for a member.' },
        { name: 'nick', usage: '.nick @user [nickname]', desc: 'Change a member\'s nickname.' },
        { name: 'temprole', usage: '.temprole @user @role [duration]', desc: 'Give a temporary role.' },
        { name: 'snapshot', usage: '.snapshot', desc: 'Take a snapshot of all member roles.' },
        { name: 'voidstaff', usage: '.voidstaff @user', desc: 'Remove all staff roles from a member.' }
      ]
    },
    {
      id: 'music', icon: '🎵', title: 'Music',
      desc: 'Lavalink-powered music playback with full queue management.',
      commands: [
        { name: 'play', usage: '.play [query/URL]', desc: 'Play a song or add it to queue.' },
        { name: 'skip', usage: '.skip', desc: 'Skip the current track.' },
        { name: 'stop', usage: '.stop', desc: 'Stop playback and clear the queue.' },
        { name: 'pause', usage: '.pause', desc: 'Pause the current track.' },
        { name: 'resume', usage: '.resume', desc: 'Resume paused playback.' },
        { name: 'queue', usage: '.queue', desc: 'Show the current music queue.' },
        { name: 'nowplaying', usage: '.nowplaying', desc: 'Show the currently playing track.' },
        { name: 'volume', usage: '.volume [1-100]', desc: 'Set playback volume.' },
        { name: 'loop', usage: '.loop [off/track/queue]', desc: 'Toggle loop mode.' },
        { name: 'shuffle', usage: '.shuffle', desc: 'Shuffle the current queue.' },
        { name: '247', usage: '.247', desc: 'Toggle 24/7 mode — bot stays in voice.' },
        { name: 'autoplay', usage: '.autoplay', desc: 'Auto-queue similar tracks when queue ends.' },
        { name: 'remove', usage: '.remove [position]', desc: 'Remove a track from the queue.' },
        { name: 'join', usage: '.join', desc: 'Join your current voice channel.' }
      ]
    },
    {
      id: 'leveling', icon: '📊', title: 'Leveling & Stats',
      desc: 'XP, rank cards, voice tracking, leaderboards, and analytics.',
      commands: [
        { name: 'rank', usage: '.rank [@user]', desc: 'Show your or someone else\'s rank card.' },
        { name: 'leaderboard', usage: '.leaderboard', desc: 'View the server XP leaderboard.' },
        { name: 'leveling', usage: '.leveling', desc: 'Configure leveling settings.' },
        { name: 'addxp', usage: '.addxp @user [amount]', desc: 'Add XP to a member.' },
        { name: 'removexp', usage: '.removexp @user [amount]', desc: 'Remove XP from a member.' },
        { name: 'setlevel', usage: '.setlevel @user [level]', desc: 'Set a member\'s level directly.' },
        { name: 'messages', usage: '.messages [@user]', desc: 'View message count stats.' },
        { name: 'optout', usage: '.optout', desc: 'Opt out of the leveling system.' },
        { name: 'stats', usage: '.stats', desc: 'View detailed server statistics.' },
        { name: 'invites', usage: '.invites [@user]', desc: 'Check invite statistics.' },
        { name: 'voice', usage: '.voice [@user]', desc: 'View voice time stats.' },
        { name: 'daily', usage: '.daily', desc: 'View daily activity stats.' },
        { name: 'weekly', usage: '.weekly', desc: 'View weekly activity stats.' },
        { name: 'top', usage: '.top', desc: 'View top active members.' }
      ]
    },
    {
      id: 'automod', icon: '⚙️', title: 'Automod',
      desc: 'Intelligent automatic moderation filters.',
      commands: [
        { name: 'automod', usage: '.automod', desc: 'Configure automod settings — spam, invites, links, caps, mass mentions.' }
      ]
    },
    {
      id: 'antinuke', icon: '🔒', title: 'Anti-Nuke & Anti-Raid',
      desc: 'Protect your server from nukes and raids.',
      commands: [
        { name: 'antinuke', usage: '.antinuke', desc: 'Configure anti-nuke protection — channel/role deletion limits, ban limits, and more.' },
        { name: 'antiraid', usage: '.antiraid', desc: 'Configure anti-raid — join rate limits, account age filters, and lockdown.' }
      ]
    },
    {
      id: 'giveaways', icon: '🎉', title: 'Giveaways',
      desc: 'Create and manage giveaways with ease.',
      commands: [
        { name: 'giveaway', usage: '.giveaway', desc: 'Create, end, reroll, pause, and manage giveaways.' }
      ]
    },
    {
      id: 'tickets', icon: '🎫', title: 'Tickets',
      desc: 'Panel-based ticket system with transcripts.',
      commands: [
        { name: 'ticket', usage: '.ticket', desc: 'Set up ticket panels, categories, staff roles, auto-close, and transcripts.' }
      ]
    },
    {
      id: 'welcome', icon: '👋', title: 'Welcome & Goodbye',
      desc: 'Custom join/leave messages for your server.',
      commands: [
        { name: 'welcome', usage: '.welcome', desc: 'Configure welcome messages, channels, and embed.' },
        { name: 'goodbye', usage: '.goodbye', desc: 'Configure goodbye messages, channels, and embed.' }
      ]
    },
    {
      id: 'fun', icon: '🎮', title: 'Fun',
      desc: 'Fun commands to keep chat entertaining.',
      commands: [
        { name: '8ball', usage: '.8ball [question]', desc: 'Ask the magic 8-ball a question.' },
        { name: 'coinflip', usage: '.coinflip', desc: 'Flip a coin.' },
        { name: 'roll', usage: '.roll [sides]', desc: 'Roll a die.' },
        { name: 'ship', usage: '.ship @user1 @user2', desc: 'Ship two people together.' },
        { name: 'hack', usage: '.hack @user', desc: 'Pretend to hack someone.' },
        { name: 'rate', usage: '.rate @user', desc: 'Rate someone out of 10.' },
        { name: 'choose', usage: '.choose [opt1] | [opt2]', desc: 'Choose between options.' }
      ]
    },
    {
      id: 'general', icon: '💬', title: 'General',
      desc: 'Essential utility commands.',
      commands: [
        { name: 'help', usage: '.help [command]', desc: 'Show help menu or details for a specific command.' },
        { name: 'ping', usage: '.ping', desc: 'Check bot latency.' },
        { name: 'botinfo', usage: '.botinfo', desc: 'Show bot information and stats.' },
        { name: 'serverinfo', usage: '.serverinfo', desc: 'Show detailed server information.' },
        { name: 'userinfo', usage: '.userinfo [@user]', desc: 'Show user information.' },
        { name: 'avatar', usage: '.avatar [@user]', desc: 'Get a user\'s avatar.' },
        { name: 'banner', usage: '.banner [@user]', desc: 'Get a user\'s banner.' },
        { name: 'afk', usage: '.afk [reason]', desc: 'Set yourself as AFK.' },
        { name: 'suggest', usage: '.suggest [idea]', desc: 'Submit a suggestion.' },
        { name: 'uptime', usage: '.uptime', desc: 'Show bot uptime.' },
        { name: 'invitebot', usage: '.invitebot', desc: 'Get the bot invite link.' },
        { name: 'say', usage: '.say [message]', desc: 'Make the bot say something.' }
      ]
    },
    {
      id: 'voice', icon: '🔊', title: 'Voice Commands',
      desc: 'Manage voice channel members.',
      commands: [
        { name: 'vcmute', usage: '.vcmute @user', desc: 'Server-mute a member in voice.' },
        { name: 'vcunmute', usage: '.vcunmute @user', desc: 'Server-unmute a member in voice.' },
        { name: 'vckick', usage: '.vckick @user', desc: 'Kick a member from voice channel.' },
        { name: 'vcmove', usage: '.vcmove @user [channel]', desc: 'Move a member to another voice channel.' },
        { name: 'vcdeafen', usage: '.vcdeafen @user', desc: 'Server-deafen a member.' },
        { name: 'vcmuteall', usage: '.vcmuteall', desc: 'Mute all members in your voice channel.' },
        { name: 'vckickall', usage: '.vckickall', desc: 'Kick all members from voice.' },
        { name: 'vcpull', usage: '.vcpull @user', desc: 'Pull a member into your voice channel.' }
      ]
    },
    {
      id: 'config', icon: '🔧', title: 'Server Configuration',
      desc: 'Configure bot behavior for your server.',
      commands: [
        { name: 'prefix', usage: '.prefix [new]', desc: 'View or change the bot prefix.' },
        { name: 'logs', usage: '.logs', desc: 'Configure logging settings.' },
        { name: 'trigger', usage: '.trigger', desc: 'Create custom auto-responders.' },
        { name: 'reaction', usage: '.reaction', desc: 'Set up auto-reactions on keywords.' },
        { name: 'starboard', usage: '.starboard', desc: 'Configure the starboard system.' },
        { name: 'birthday', usage: '.birthday', desc: 'Configure birthday announcements.' },
        { name: 'bumpreminder', usage: '.bumpreminder', desc: 'Set up bump reminders.' }
      ]
    },
    {
      id: 'misc', icon: '✨', title: 'Miscellaneous',
      desc: 'Emoji, sticker, snipe, and embed tools.',
      commands: [
        { name: 'snipe', usage: '.snipe', desc: 'Snipe the last deleted message.' },
        { name: 'editsnipe', usage: '.editsnipe', desc: 'Snipe the last edited message.' },
        { name: 'addemoji', usage: '.addemoji [emoji/url]', desc: 'Add a custom emoji to the server.' },
        { name: 'addsticker', usage: '.addsticker', desc: 'Add a sticker to the server.' },
        { name: 'steal', usage: '.steal [emoji]', desc: 'Steal an emoji from another server.' },
        { name: 'embed', usage: '.embed', desc: 'Build and send a custom embed.' }
      ]
    }
  ];

  const sidebar = buildDocsSidebar(categories);
  const content = buildDocsContent(categories);

  document.getElementById('page-content').innerHTML = `
    <div class="docs">
      <!-- Navbar -->
      <header class="lp-nav">
        <div class="lp-nav-inner">
          <a href="/" class="lp-nav-brand" data-link="/" style="text-decoration:none">
            <span class="lp-nav-logo">⚡</span>
            <span class="lp-nav-wordmark">Ares</span>
          </a>
          <nav class="lp-nav-links">
            <a href="/" data-link="/">Home</a>
            <a href="/docs" class="docs-nav-active">Docs</a>
            <a href="https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands" target="_blank" rel="noopener">Invite</a>
          </nav>
          <a href="/auth/login" class="lp-nav-cta">Dashboard <span class="lp-arrow">↗</span></a>
        </div>
      </header>

      <div class="docs-layout">
        <!-- Sidebar TOC -->
        <aside class="docs-sidebar">
          <div class="docs-sidebar-title">Documentation</div>
          <div class="docs-search">
            <input type="text" id="docs-search" class="docs-search-input" placeholder="Search commands..." autocomplete="off" />
          </div>
          ${sidebar}
        </aside>

        <!-- Main content -->
        <main class="docs-main">
          <!-- Hero -->
          <section class="docs-hero">
            <h1 class="docs-hero-title">Ares <span class="lp-gradient-text">Documentation</span></h1>
            <p class="docs-hero-desc">Complete reference for all commands, modules, and configuration options. Default prefix: <code>.</code></p>
            <div class="docs-quick-stats">
              <div class="docs-qstat"><span class="docs-qstat-num">200+</span><span class="docs-qstat-label">Commands</span></div>
              <div class="docs-qstat"><span class="docs-qstat-num">13</span><span class="docs-qstat-label">Modules</span></div>
              <div class="docs-qstat"><span class="docs-qstat-num">Slash</span><span class="docs-qstat-label">& Prefix</span></div>
            </div>
          </section>

          ${content}
        </main>
      </div>
    </div>
  `;

  initDocsSearch(categories);
  initDocsSidebarScroll();
  initDocsLinks();
}

function buildDocsSidebar(categories) {
  return `<nav class="docs-toc">
    ${categories.map(c => `
      <a href="#${c.id}" class="docs-toc-item" data-section="${c.id}">
        <span class="docs-toc-icon">${c.icon}</span>
        <span>${c.title}</span>
        <span class="docs-toc-count">${c.commands.length}</span>
      </a>
    `).join('')}
  </nav>`;
}

function buildDocsContent(categories) {
  return categories.map(c => `
    <section class="docs-category" id="${c.id}">
      <div class="docs-cat-header">
        <div class="docs-cat-icon">${c.icon}</div>
        <div>
          <h2 class="docs-cat-title">${c.title}</h2>
          <p class="docs-cat-desc">${c.desc}</p>
        </div>
      </div>
      <div class="docs-cmd-grid">
        ${c.commands.map(cmd => `
          <div class="docs-cmd" data-cmd="${cmd.name}">
            <div class="docs-cmd-top">
              <code class="docs-cmd-name">${cmd.name}</code>
            </div>
            <p class="docs-cmd-desc">${cmd.desc}</p>
            <div class="docs-cmd-usage"><span class="docs-cmd-usage-label">Usage</span><code>${cmd.usage}</code></div>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');
}

function initDocsSearch(categories) {
  const input = document.getElementById('docs-search');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('.docs-cmd').forEach(el => {
      const name = el.dataset.cmd || '';
      const desc = (el.querySelector('.docs-cmd-desc')?.textContent || '').toLowerCase();
      el.style.display = (!q || name.includes(q) || desc.includes(q)) ? '' : 'none';
    });
    // Hide empty categories
    document.querySelectorAll('.docs-category').forEach(cat => {
      const visible = cat.querySelectorAll('.docs-cmd[style=""], .docs-cmd:not([style])');
      const hasHidden = cat.querySelector('.docs-cmd[style*="none"]');
      cat.style.display = (visible.length === 0 && hasHidden) ? 'none' : '';
    });
  });
}

function initDocsSidebarScroll() {
  const sections = document.querySelectorAll('.docs-category');
  const tocItems = document.querySelectorAll('.docs-toc-item');
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocItems.forEach(t => t.classList.remove('active'));
        const active = document.querySelector(`.docs-toc-item[data-section="${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 });

  sections.forEach(s => observer.observe(s));
}

function initDocsLinks() {
  // SPA navigation for internal links
  document.querySelectorAll('.docs [data-link]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate(a.getAttribute('data-link'));
    });
  });

  // Smooth scroll for TOC anchors
  document.querySelectorAll('.docs-toc-item').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        const navH = document.querySelector('.lp-nav')?.offsetHeight || 0;
        const y = target.getBoundingClientRect().top + window.scrollY - navH - 20;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    });
  });
}
