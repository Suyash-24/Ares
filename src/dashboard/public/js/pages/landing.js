// Landing page (unauthenticated) - Premium Redesign inspired by Bleed, Noctaly, Xieron, Leveling.gg
async function renderLanding() {
  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';

  document.getElementById('page-content').innerHTML = `
<!-- Pure Black Base -->
<div class="fixed inset-0 bg-[#050505] pointer-events-none z-0"></div>

<!-- Dot Pattern Grid -->
<div class="fixed inset-0 z-0 pointer-events-none" style="background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 40px 40px; -webkit-mask-image: radial-gradient(circle at center, black 20%, transparent 80%); mask-image: radial-gradient(circle at center, black 20%, transparent 80%);"></div>

<!-- Ambient Glow Orbs (breathing) -->
<div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
  <div class="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] breathe-orb" style="background: radial-gradient(circle at center, rgba(59,130,246,0.12) 0%, transparent 60%); filter: blur(80px);"></div>
  <div class="absolute top-[20%] -right-[15%] w-[60vw] h-[60vw] breathe-orb" style="background: radial-gradient(circle at center, rgba(139,92,246,0.1) 0%, transparent 60%); filter: blur(80px); animation-delay: 2s;"></div>
  <div class="absolute -bottom-[20%] left-[30%] w-[50vw] h-[50vw] breathe-orb" style="background: radial-gradient(circle at center, rgba(16,185,129,0.06) 0%, transparent 60%); filter: blur(100px); animation-delay: 4s;"></div>
</div>

<!-- Floating Particles Container -->
<div id="particles-container" class="fixed inset-0 pointer-events-none z-[1] overflow-hidden"></div>

<!-- Film grain -->
<div class="noise-overlay"></div>

<!-- ═══════════════════ NAVBAR ═══════════════════ -->
<header class="fixed top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[96%] md:max-w-[1400px] z-[100] border border-white/[0.08] bg-black/40 backdrop-blur-2xl rounded-full">
  <div class="px-6 md:px-8 py-3.5 flex justify-between items-center">
    <div class="flex items-center gap-2.5 cursor-pointer" onclick="window.scrollTo({top:0, behavior:'smooth'})">
      <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
        <span class="material-symbols-outlined text-lg">bolt</span>
      </div>
      <span class="text-lg font-headline font-bold text-white tracking-tight">Ares</span>
    </div>
    
    <nav class="hidden md:flex justify-center items-center gap-8">
      <a class="text-[13px] font-headline font-medium text-white/50 hover:text-white transition-colors duration-200" href="#features">Features</a>
      <a class="text-[13px] font-headline font-medium text-white/50 hover:text-white transition-colors duration-200" href="/docs" data-link="/docs">Documentation</a>
      <a class="text-[13px] font-headline font-medium text-white/50 hover:text-white transition-colors duration-200" href="#">Premium</a>
      <a class="text-[13px] font-headline font-medium text-white/50 hover:text-white transition-colors duration-200" href="/auth/login">Dashboard</a>
    </nav>
    
    <div class="flex items-center gap-3">
      <a href="\${oauthUrl}" target="_blank" rel="noopener" class="bg-white text-black font-headline font-bold text-[13px] px-5 py-2 rounded-full hover:opacity-90 hover:scale-[1.02] transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
        Invite Bot
      </a>
    </div>
  </div>
</header>

<!-- ═══════════════════ HERO SECTION ═══════════════════ -->
<main class="relative z-10 overflow-hidden">

<section class="min-h-screen flex items-center relative">
  <!-- Hero spotlight -->
  <div class="hero-spotlight"></div>
  
  <div class="w-full max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-24">
    <div class="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-16">
      
      <!-- Left Side: Text Content -->
      <div class="lg:w-7/12 text-center lg:text-left">
        
        <!-- Main Headline (Bleed style - big, bold, left-aligned) -->
        <h1 class="font-headline font-black text-5xl md:text-6xl lg:text-[4.5rem] mb-6 tracking-[-0.04em] leading-[1.08] text-white select-none animate-fade-in-up delay-100">
          Ares is your server's<br class="hidden md:block" />
          <span class="text-gradient-animated">ultimate command center.</span>
        </h1>
        
        <p class="font-headline text-white/45 text-base md:text-lg max-w-xl mb-10 leading-relaxed animate-fade-in-up delay-200 lg:pr-8">
          Meet the all-in-one bot for moderation, music, leveling, and deep analytics. Built to elevate your community's experience and streamline server management.
        </p>
        
        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in-up delay-300 justify-center lg:justify-start">
          <a href="\${oauthUrl}" target="_blank" rel="noopener" class="group flex items-center justify-center gap-2 bg-white text-black font-headline font-bold text-sm px-7 py-3.5 rounded-full hover:scale-[1.03] transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.12)]">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Add to Discord
          </a>
          <a href="/auth/login" class="flex items-center justify-center gap-2 border border-white/[0.12] bg-white/[0.03] text-white font-headline font-semibold text-sm px-7 py-3.5 rounded-full hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300">
            Open Dashboard
          </a>
        </div>
        

      </div>
      
      <!-- Right Side: Floating Feature Tags (Bleed style) + Dashboard Preview -->
      <div class="lg:w-5/12 relative flex justify-center lg:justify-end animate-fade-in-up delay-300" id="hero-preview">
        
        <!-- Dashboard Preview Card -->
        <div class="w-full max-w-md border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_20px_60px_-12px_rgba(0,0,0,0.8)]">
          <!-- Window chrome -->
          <div class="h-10 border-b border-white/[0.06] flex items-center px-4 gap-3 bg-white/[0.02]">
            <div class="flex gap-2">
              <div class="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
              <div class="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
              <div class="w-3 h-3 rounded-full bg-[#27C93F]"></div>
            </div>
            <div class="flex-1 flex justify-center">
              <span class="font-mono text-[10px] text-white/25 tracking-wider uppercase">ares ~ dashboard</span>
            </div>
          </div>
          
          <!-- Dashboard content -->
          <div class="p-5 space-y-4">
            <!-- Stats row -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                <span class="text-[10px] font-headline text-white/30 uppercase tracking-wider block mb-1">Latency</span>
                <span id="landing-ping-term" class="text-lg font-headline font-bold text-emerald-400">...</span>
              </div>
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                <span class="text-[10px] font-headline text-white/30 uppercase tracking-wider block mb-1">Servers</span>
                <span id="landing-guilds-term" class="text-lg font-headline font-bold text-white">...</span>
              </div>
              <div class="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                <span class="text-[10px] font-headline text-white/30 uppercase tracking-wider block mb-1">Users</span>
                <span id="landing-users-term" class="text-lg font-headline font-bold text-blue-400">...</span>
              </div>
            </div>
            
            <!-- Log Output -->
            <div class="bg-black/40 border border-white/[0.05] rounded-xl overflow-hidden">
              <div class="h-7 border-b border-white/[0.05] flex items-center px-3 bg-white/[0.02]">
                <span class="font-mono text-[9px] text-white/30 flex items-center gap-1.5"><span class="material-symbols-outlined text-[10px] text-blue-400">terminal</span>live-events.log</span>
              </div>
              <div class="p-3 font-mono text-[10px] space-y-2.5 text-white/40 select-none max-h-[180px] overflow-hidden">
                <div class="flex gap-2"><span class="text-white/15 w-12 shrink-0">10:45:01</span><span class="text-blue-400 font-bold w-16 shrink-0">[SYSTEM]</span><span class="text-white/60">Shard 0 connected to Gateway.</span></div>
                <div class="flex gap-2"><span class="text-white/15 w-12 shrink-0">10:45:02</span><span class="text-emerald-400 font-bold w-16 shrink-0">[SYNC]</span><span class="text-white/60">Synced guild rulesets.</span></div>
                <div class="flex gap-2"><span class="text-white/15 w-12 shrink-0">10:45:05</span><span class="text-yellow-400 font-bold w-16 shrink-0">[WARN]</span><span class="text-white/60">Rate limit on /users/@me</span></div>
                <div class="flex gap-2"><span class="text-white/15 w-12 shrink-0">10:45:07</span><span class="text-red-400 font-bold w-16 shrink-0">[MOD]</span><span class="text-white/60">Intercepted spam. <span class="text-red-400 bg-red-400/10 px-1 rounded text-[9px]">BANNED</span></span></div>
                <div class="flex gap-2"><span class="text-white/15 w-12 shrink-0">10:45:10</span><span class="text-violet-400 font-bold w-16 shrink-0">[MUSIC]</span><span class="text-white/60">Lavalink: 15ms ping.</span></div>
                <div class="flex gap-2 opacity-50"><span class="text-white/15 w-12 shrink-0">10:45:12</span><span class="text-white/20 font-bold w-16 shrink-0">[IDLE]</span><span class="text-white/30">Awaiting events<span class="animate-pulse">...</span></span></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Floating Feature Tags (Bleed-style, animated float) -->
        <div class="absolute -right-4 top-16 hidden lg:flex items-center gap-2 px-4 py-2.5 border border-white/[0.08] bg-black/60 backdrop-blur-xl rounded-xl shadow-lg animate-fade-in-up float-tag" style="animation-delay: 0.6s;">
          <span class="material-symbols-outlined text-blue-400 text-[18px]">shield</span>
          <span class="text-[13px] font-headline text-white/70 font-medium">anti-nuke</span>
        </div>
        <div class="absolute -left-8 top-48 hidden lg:flex items-center gap-2 px-4 py-2.5 border border-white/[0.08] bg-black/60 backdrop-blur-xl rounded-xl shadow-lg animate-fade-in-up float-tag float-tag-delay1" style="animation-delay: 0.8s;">
          <span class="material-symbols-outlined text-violet-400 text-[18px]">music_note</span>
          <span class="text-[13px] font-headline text-white/70 font-medium">music player</span>
        </div>
        <div class="absolute -right-2 bottom-24 hidden lg:flex items-center gap-2 px-4 py-2.5 border border-white/[0.08] bg-black/60 backdrop-blur-xl rounded-xl shadow-lg animate-fade-in-up float-tag float-tag-delay2" style="animation-delay: 1s;">
          <span class="material-symbols-outlined text-emerald-400 text-[18px]">trending_up</span>
          <span class="text-[13px] font-headline text-white/70 font-medium">leveling</span>
        </div>
      </div>
      
    </div>
  </div>
</section>

<!-- ═══════════════════ FEATURES SECTION ═══════════════════ -->
<section id="features" class="py-32 relative">
  <div class="max-w-[1400px] mx-auto px-6 md:px-12">
    
    <div class="text-center mb-20 reveal-blur">
      <span class="inline-block text-[11px] font-headline font-bold text-blue-400 uppercase tracking-[0.2em] mb-4">Features</span>
      <h2 class="font-headline text-3xl md:text-5xl font-black tracking-[-0.03em] mb-5 text-white">Everything your server needs.</h2>
      <p class="font-headline text-white/40 max-w-lg mx-auto text-base">Powerful modules, seamlessly integrated. No more juggling multiple bots.</p>
    </div>

    <!-- Feature Grid (Bento) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      
      <!-- Feature 1: Moderation (Large) -->
      <div class="md:col-span-2 group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10 flex flex-col justify-between min-h-[340px] hover:border-white/[0.15] transition-all duration-500 cursor-default animated-border tilt-card reveal" style="transition-delay: 0.1s;">
        <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(59,130,246,0.08), transparent 50%);"></div>
        <div>
          <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-blue-500/10 border border-blue-500/15">
            <span class="material-symbols-outlined text-blue-400 text-[24px]">shield_person</span>
          </div>
          <h3 class="font-headline text-2xl font-bold mb-3 text-white tracking-tight">Advanced Moderation</h3>
          <p class="font-headline text-white/40 max-w-md text-[14px] leading-relaxed">
            Protect your server with configurable automod filters, anti-spam, anti-link, anti-invite, and real-time threat detection. Zero-latency enforcement.
          </p>
        </div>
        <div class="flex flex-wrap gap-2 mt-8">
          <span class="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[10px] font-headline font-bold tracking-wider uppercase flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Active</span>
          <span class="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/35 text-[10px] font-headline font-bold tracking-wider uppercase">Anti-Spam</span>
          <span class="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/35 text-[10px] font-headline font-bold tracking-wider uppercase">Anti-Link</span>
          <span class="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/35 text-[10px] font-headline font-bold tracking-wider uppercase">Anti-Invite</span>
          <span class="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/35 text-[10px] font-headline font-bold tracking-wider uppercase">Auto-Warn</span>
        </div>
      </div>

      <!-- Feature 2: Music -->
      <div class="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 flex flex-col min-h-[340px] hover:border-white/[0.15] transition-all duration-500 cursor-default animated-border tilt-card reveal" style="transition-delay: 0.2s;">
        <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(139,92,246,0.08), transparent 50%);"></div>
        <div>
          <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-violet-500/10 border border-violet-500/15">
            <span class="material-symbols-outlined text-violet-400 text-[24px]">headphones</span>
          </div>
          <h3 class="font-headline text-xl font-bold mb-2 text-white tracking-tight">Pristine Audio</h3>
          <p class="font-headline text-white/40 text-[13px] leading-relaxed">High-fidelity music streaming with queue management and filter presets.</p>
        </div>
        <!-- Equalizer bars -->
        <div class="mt-auto w-full pt-6 flex gap-[3px] items-end h-14 relative">
          <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-violet-500/5 to-transparent rounded-xl pointer-events-none"></div>
          <div class="flex-1 bg-violet-500/25 rounded-t-sm" style="height: 25%; animation: eq1 1.2s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/35 rounded-t-sm" style="height: 55%; animation: eq2 0.9s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/50 rounded-t-sm" style="height: 85%; animation: eq3 1.1s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/70 rounded-t-sm shadow-[0_0_8px_rgba(139,92,246,0.4)]" style="height: 100%; animation: eq4 0.8s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/50 rounded-t-sm" style="height: 70%; animation: eq5 1.3s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/35 rounded-t-sm" style="height: 45%; animation: eq2 1s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/25 rounded-t-sm" style="height: 30%; animation: eq1 1.4s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/40 rounded-t-sm" style="height: 60%; animation: eq3 0.7s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/25 rounded-t-sm" style="height: 35%; animation: eq5 1.1s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/15 rounded-t-sm" style="height: 20%; animation: eq1 0.9s ease-in-out infinite alternate;"></div>
        </div>
      </div>

      <!-- Feature 3: Leveling -->
      <div class="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 flex flex-col min-h-[300px] hover:border-white/[0.15] transition-all duration-500 cursor-default animated-border tilt-card reveal" style="transition-delay: 0.15s;">
        <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(16,185,129,0.08), transparent 50%);"></div>
        <div>
          <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-emerald-500/10 border border-emerald-500/15">
            <span class="material-symbols-outlined text-emerald-400 text-[24px]">trending_up</span>
          </div>
          <h3 class="font-headline text-xl font-bold mb-2 text-white tracking-tight">Engagement & Leveling</h3>
          <p class="font-headline text-white/40 text-[13px] leading-relaxed">XP tracking, role rewards, customizable leaderboards, and rank cards.</p>
        </div>
        <div class="mt-auto pt-6 space-y-3">
          <div class="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04]">
            <div class="h-full rounded-full" style="width: 72%; background: linear-gradient(90deg, #10b981, #34d399); box-shadow: 0 0 10px rgba(16,185,129,0.3);"></div>
          </div>
          <div class="flex gap-2">
            <span class="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/35 text-[10px] font-headline font-bold tracking-wider uppercase">Leaderboards</span>
            <span class="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/35 text-[10px] font-headline font-bold tracking-wider uppercase">Role Rewards</span>
          </div>
        </div>
      </div>

      <!-- Feature 4: Analytics (Large) -->
      <div class="md:col-span-2 group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10 flex flex-col md:flex-row justify-between items-center min-h-[300px] hover:border-white/[0.15] transition-all duration-500 cursor-default animated-border tilt-card reveal" style="transition-delay: 0.25s;">
        <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(-45deg, rgba(59,130,246,0.06), transparent 50%);"></div>
        <div class="relative z-10 max-w-sm">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-blue-500/10 border border-blue-500/15">
            <span class="material-symbols-outlined text-blue-400 text-[24px]">insights</span>
          </div>
          <h3 class="font-headline text-2xl font-bold mb-3 text-white tracking-tight">Deep Analytics</h3>
          <p class="font-headline text-white/40 text-[14px] leading-relaxed">
            Monitor growth, message volume, and member retention through a beautifully designed, real-time dashboard.
          </p>
        </div>
        <div class="hidden sm:block w-56 h-40 relative mt-6 md:mt-0">
           <svg class="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none">
             <line x1="0" y1="30" x2="200" y2="30" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>
             <line x1="0" y1="60" x2="200" y2="60" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>
             <line x1="0" y1="90" x2="200" y2="90" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>
             <defs>
               <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stop-color="rgba(59,130,246,0.2)"/>
                 <stop offset="100%" stop-color="rgba(59,130,246,0)"/>
               </linearGradient>
             </defs>
             <path d="M0,100 C20,90 40,85 60,70 C80,55 90,65 110,45 C130,25 150,35 170,20 C185,12 195,15 200,10 L200,120 L0,120 Z" fill="url(#chartGrad)"/>
             <path d="M0,100 C20,90 40,85 60,70 C80,55 90,65 110,45 C130,25 150,35 170,20 C185,12 195,15 200,10" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
             <circle cx="200" cy="10" r="3" fill="#3b82f6" opacity="0.8">
               <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
               <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
             </circle>
           </svg>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- ═══════════════════ STATS SECTION ═══════════════════ -->
<section class="py-24 relative overflow-hidden">
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] rounded-full opacity-15 pointer-events-none" style="background: radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%);"></div>
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
  <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
  
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto px-6 relative z-10">
    <div class="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center group hover:border-white/[0.15] transition-all duration-500 pulse-glow reveal-scale" style="transition-delay: 0.1s;">
      <div class="w-10 h-10 rounded-xl mx-auto mb-4 flex items-center justify-center bg-blue-500/10 border border-blue-500/15">
        <span class="material-symbols-outlined text-blue-400 text-[20px]">dns</span>
      </div>
      <div class="font-headline text-3xl md:text-4xl font-black tracking-tighter mb-1.5">
        <span id="landing-guilds-big" class="text-white">...</span>
      </div>
      <span class="font-headline text-[11px] text-white/30 uppercase tracking-[0.15em] font-semibold">Servers</span>
    </div>
    <div class="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center group hover:border-white/[0.15] transition-all duration-500 pulse-glow reveal-scale" style="transition-delay: 0.2s;">
      <div class="w-10 h-10 rounded-xl mx-auto mb-4 flex items-center justify-center bg-violet-500/10 border border-violet-500/15">
        <span class="material-symbols-outlined text-violet-400 text-[20px]">group</span>
      </div>
      <div class="font-headline text-3xl md:text-4xl font-black tracking-tighter mb-1.5">
        <span id="landing-users-big" class="text-white">...</span>
      </div>
      <span class="font-headline text-[11px] text-white/30 uppercase tracking-[0.15em] font-semibold">Users</span>
    </div>
    <div class="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center group hover:border-white/[0.15] transition-all duration-500 pulse-glow reveal-scale" style="transition-delay: 0.3s;">
      <div class="w-10 h-10 rounded-xl mx-auto mb-4 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15">
        <span class="material-symbols-outlined text-emerald-400 text-[20px]">tag</span>
      </div>
      <div class="font-headline text-3xl md:text-4xl font-black tracking-tighter mb-1.5">
        <span id="landing-channels-big" class="text-white">...</span>
      </div>
      <span class="font-headline text-[11px] text-white/30 uppercase tracking-[0.15em] font-semibold">Channels</span>
    </div>
  </div>
</section>

<!-- ═══════════════════ BOTTOM CTA ═══════════════════ -->
<section class="py-32 relative overflow-hidden">
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none" style="background: radial-gradient(circle, rgba(139,92,246,0.3), transparent 60%);"></div>
  
  <div class="text-center max-w-2xl mx-auto px-6 relative z-10 reveal-blur">
    <span class="inline-block text-[11px] font-headline font-bold text-violet-400 uppercase tracking-[0.2em] mb-4">Get Started</span>
    <h2 class="font-headline text-3xl md:text-5xl font-black tracking-[-0.03em] mb-5 text-white">Elevate your community's<br/>experience today.</h2>
    <p class="font-headline text-white/40 text-base mb-10 max-w-md mx-auto">Get Ares in your server and unlock powerful moderation, engagement, and management tools in seconds.</p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="\${oauthUrl}" target="_blank" rel="noopener" class="bg-white text-black font-headline font-bold text-sm px-8 py-4 rounded-full hover:scale-[1.03] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)] inline-flex items-center justify-center gap-2">
        <span class="material-symbols-outlined text-[18px]">add</span>
        Add to Discord
      </a>
      <a href="https://discord.gg/ares" target="_blank" rel="noopener" class="border border-white/[0.12] bg-white/[0.03] text-white font-headline font-semibold text-sm px-8 py-4 rounded-full hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 inline-flex items-center justify-center gap-2">
        Join Support Server
      </a>
    </div>
  </div>
</section>

</main>

<!-- ═══════════════════ FOOTER ═══════════════════ -->
<footer class="border-t border-white/[0.06] bg-[#050505] relative z-20">
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
  
  <div class="w-[96%] max-w-[1400px] mx-auto px-6 md:px-12 py-16">
    <div class="flex flex-col md:flex-row justify-between gap-12 mb-16">
      
      <div class="md:w-5/12">
        <div class="flex items-center gap-2.5 mb-5">
          <div class="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black">
            <span class="material-symbols-outlined text-sm">bolt</span>
          </div>
          <span class="text-xl font-headline font-bold text-white tracking-tight">Ares</span>
        </div>
        <p class="font-headline text-[13px] text-white/35 leading-relaxed mb-6 max-w-xs">
          The next-generation Discord bot for moderation, security, and community engagement.
        </p>
        <div class="flex gap-3">
          <a href="#" class="w-9 h-9 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
            <span class="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
          <a href="/docs" data-link="/docs" class="w-9 h-9 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
            <span class="material-symbols-outlined text-[16px]">menu_book</span>
          </a>
        </div>
      </div>
      
      <div class="flex flex-wrap gap-16 md:gap-20">
        <div>
          <h4 class="font-headline font-bold text-[11px] text-white/60 mb-5 uppercase tracking-[0.15em]">Product</h4>
          <ul class="space-y-3 font-headline text-[13px] text-white/35">
            <li><a href="/docs" data-link="/docs" class="hover:text-white transition-colors duration-200">Documentation</a></li>
            <li><a href="#" class="hover:text-white transition-colors duration-200">Premium</a></li>
            <li><a href="#" class="hover:text-white transition-colors duration-200">Commands</a></li>
            <li><a href="/auth/login" class="hover:text-white transition-colors duration-200">Dashboard</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-headline font-bold text-[11px] text-white/60 mb-5 uppercase tracking-[0.15em]">Legal</h4>
          <ul class="space-y-3 font-headline text-[13px] text-white/35">
            <li><a href="#" class="hover:text-white transition-colors duration-200">Terms of Service</a></li>
            <li><a href="#" class="hover:text-white transition-colors duration-200">Privacy Policy</a></li>
            <li><a href="#" class="hover:text-white transition-colors duration-200">Refund Policy</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-headline font-bold text-[11px] text-white/60 mb-5 uppercase tracking-[0.15em]">Community</h4>
          <ul class="space-y-3 font-headline text-[13px] text-white/35">
            <li><a href="#" class="hover:text-white transition-colors duration-200">Support Server</a></li>
            <li><a href="#" class="hover:text-white transition-colors duration-200">Status</a></li>
          </ul>
        </div>
      </div>

    </div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/[0.05]">
      <span class="font-headline text-[12px] text-white/25">© 2026 Ares. All rights reserved.</span>
      <div class="flex items-center gap-2 font-headline text-[12px] text-white/35">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
        <span class="font-medium">All Systems Operational</span>
      </div>
    </div>
  </div>
</footer>
  `;

  // ═══════════════════ ANIMATION ENGINE ═══════════════════

  // 1. Scroll-triggered reveal (IntersectionObserver)
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  // 2. Floating Particles
  const particleContainer = document.getElementById('particles-container');
  if (particleContainer) {
    function spawnParticle() {
      const p = document.createElement('div');
      p.className = 'particle';
      const x = Math.random() * 100;
      const size = Math.random() * 2 + 1;
      const duration = Math.random() * 15 + 12;
      const delay = Math.random() * 5;
      p.style.cssText = `left:${x}%;width:${size}px;height:${size}px;bottom:-10px;opacity:0;animation:floatUp ${duration}s ${delay}s linear infinite;`;
      particleContainer.appendChild(p);
    }
    for (let i = 0; i < 25; i++) spawnParticle();
  }

  // 3. Magnetic Tilt on Feature Cards
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
    });
  });

  // 4. Smooth scrolling for hash links
  const hashLinks = document.querySelectorAll('a[href^="#"]');
  hashLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').substring(1);
      if (targetId) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // 5. Animated number counter
  function animateCounter(el, target, suffix = '') {
    const duration = 1500;
    const start = performance.now();
    const isFloat = typeof target === 'string' && target.includes('.');
    el.classList.add('counter-number');
    
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      if (typeof target === 'number') {
        el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      } else {
        el.textContent = target;
      }
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.classList.remove('counting');
      }
    }
    
    el.classList.add('counting');
    requestAnimationFrame(tick);
  }

  // 6. Fetch real values dynamically with counter animation
  try {
    const stats = await API.get('/api/public/stats');
    if (stats) {
      const updateWithAnim = (id, rawVal, formatted) => {
        const el = document.getElementById(id);
        if (el) {
          if (typeof rawVal === 'number') {
            animateCounter(el, rawVal);
            setTimeout(() => { el.textContent = formatted; }, 1600);
          } else {
            el.textContent = formatted;
          }
        }
      };
      
      const fmtGuilds = typeof formatNumber === 'function' ? formatNumber(stats.guilds) : stats.guilds.toLocaleString();
      const fmtUsers = typeof formatNumber === 'function' ? formatNumber(stats.users) : stats.users.toLocaleString();
      const fmtChannels = typeof formatNumber === 'function' ? formatNumber(stats.channels) : stats.channels.toLocaleString();
      
      // Terminal stats (no counter anim, direct update)
      const updateDirect = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      updateDirect('landing-ping-term', `${stats.ping}ms`);
      updateDirect('landing-guilds-term', fmtGuilds);
      updateDirect('landing-users-term', fmtUsers);
      
      // Big stats with counter animation
      updateWithAnim('landing-guilds-big', stats.guilds, fmtGuilds);
      updateWithAnim('landing-users-big', stats.users, fmtUsers);
      updateWithAnim('landing-channels-big', stats.channels, fmtChannels);
    }
  } catch (err) {
    console.error('Failed to load real landing stats:', err);
  }

  // 7. Sequential terminal log typing effect
  const logContainer = document.querySelector('.font-mono.space-y-2\\.5');
  if (logContainer) {
    const logLines = logContainer.children;
    Array.from(logLines).forEach((line, i) => {
      line.style.opacity = '0';
      line.style.transform = 'translateX(-10px)';
      line.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => {
        line.style.opacity = line.classList.contains('opacity-50') ? '0.5' : '1';
        line.style.transform = 'translateX(0)';
      }, 800 + i * 300);
    });
  }

  // 8. Navbar scroll effect (subtle shrink + more blur)
  let lastScroll = 0;
  const navbar = document.querySelector('header');
  if (navbar) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY > 100) {
        navbar.style.background = 'rgba(0,0,0,0.6)';
        navbar.style.borderColor = 'rgba(255,255,255,0.12)';
      } else {
        navbar.style.background = 'rgba(0,0,0,0.4)';
        navbar.style.borderColor = 'rgba(255,255,255,0.08)';
      }
      lastScroll = scrollY;
    }, { passive: true });
  }
}
