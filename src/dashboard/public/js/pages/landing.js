// Landing page (unauthenticated) - Exact Replication
async function renderLanding() {
  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';

  document.getElementById('page-content').innerHTML = `
<!-- Pure Black Base -->
<div class="fixed inset-0 bg-[#020202] pointer-events-none z-0"></div>

<!-- Custom Aesthetic Dot Pattern grid to fix plainness -->
<div class="fixed inset-0 z-0 pointer-events-none" style="background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 32px 32px; -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 90%); mask-image: radial-gradient(circle at center, black 30%, transparent 90%);"></div>

<!-- Ambient Glowing Orbs -->
<div class="fixed inset-0 overflow-hidden pointer-events-none z-0 mix-blend-screen">
  <div class="absolute -top-[10%] left-[10%] w-[60vw] h-[60vw] glow-orb-primary opacity-50"></div>
  <div class="absolute top-[30%] right-[5%] w-[50vw] h-[50vw] glow-orb-secondary opacity-40"></div>
</div>

<!-- Exact Floating Navbar - Full Width Pill -->
<header class="fixed top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[96%] md:max-w-[1400px] z-[100] border border-white/10 bg-white/[0.02] backdrop-blur-2xl rounded-full">
  <div class="px-6 md:px-8 py-4 flex justify-between items-center">
    <div class="flex items-center gap-2 cursor-pointer" onclick="window.scrollTo({top:0, behavior:'smooth'})">
      <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
        <span class="material-symbols-outlined text-lg">bolt</span>
      </div>
      <span class="text-lg font-headline font-bold text-white tracking-tight ml-1">Ares</span>
    </div>
    
    <nav class="hidden md:flex justify-center items-center gap-8">
      <a class="text-sm font-headline font-medium text-white/70 hover:text-white transition-colors" href="#features">Features</a>
      <a class="text-sm font-headline font-medium text-white/70 hover:text-white transition-colors" href="/docs" data-link="/docs">Documentation</a>
      <a class="text-sm font-headline font-medium text-white/70 hover:text-white transition-colors" href="#">Premium</a>
      <a class="text-sm font-headline font-medium text-white/70 hover:text-white transition-colors" href="/auth/login">Dashboard</a>
    </nav>
    
    <div class="flex items-center gap-4">
      <a href="\${oauthUrl}" target="_blank" rel="noopener" class="btn-primary-exact px-6 py-2.5 text-sm">
        Add to Discord
      </a>
    </div>
  </div>
</header>

<main class="relative z-10 pt-48 pb-32 px-6 max-w-6xl mx-auto overflow-hidden">
  
  <!-- Minimalist Hero Section -->
  <section class="flex flex-col items-center text-center mb-32 pt-10">
    
    <!-- Exact Status Pill -->
    <a href="/docs" data-link="/docs" class="glass-exact px-4 py-1.5 rounded-full inline-flex items-center gap-2 mb-8 cursor-pointer group">
      <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
      <span class="text-xs font-headline text-white/70 font-medium group-hover:text-white transition-colors">Ares v2.0 is live. Read the docs →</span>
    </a>

    <!-- Massive Exact Headline -->
    <h1 class="font-headline font-black text-5xl md:text-7xl lg:text-[6rem] mb-6 tracking-tighter leading-[1.05] text-white select-none">
      Next-generation <br class="hidden md:block" /> <span class="text-gradient-primary">community management.</span>
    </h1>
    
    <p class="font-headline text-white/60 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
      Ares provides industry-leading moderation, lossless audio streaming, and deep analytics. Built for communities that demand perfection.
    </p>
    
    <div class="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
      <a href="\${oauthUrl}" target="_blank" rel="noopener" class="btn-primary-exact flex items-center justify-center gap-2 px-8 py-3.5 text-base">
        <span class="material-symbols-outlined text-[20px]">add</span>
        Invite Ares
      </a>
      <a href="/auth/login" class="btn-secondary-exact flex items-center justify-center gap-2 px-8 py-3.5 text-base">
        Open Dashboard
      </a>
    </div>
    
  </section>

  <!-- Dashboard Mockup (Exact styling) -->
  <section class="relative w-full max-w-5xl mx-auto mb-40">
    <div class="glass-exact p-1 md:p-3 bg-white/[0.01] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
      <div class="w-full h-[400px] md:h-[550px] rounded-[1rem] bg-[#020202] overflow-hidden border border-white/5 relative shadow-inner">
        <!-- Mock Nav -->
        <div class="absolute top-0 w-full h-10 border-b border-white/5 flex items-center px-4 gap-3 bg-white/[0.02]">
          <div class="flex gap-2">
            <div class="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-110 transition-all"></div>
            <div class="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 transition-all"></div>
            <div class="w-3 h-3 rounded-full bg-[#27C93F] hover:brightness-110 transition-all"></div>
          </div>
          <div class="flex-1 flex justify-center">
            <div class="font-mono text-[10px] text-white/30 tracking-widest uppercase bg-white/5 px-4 py-1 rounded w-max select-none border border-white/5">ares_dashboard ~ system_online</div>
          </div>
        </div>
        <!-- Mock Body Grid -->
        <div class="absolute top-10 w-full h-[calc(100%-2.5rem)] p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <!-- Sidebar -->
          <div class="hidden md:flex flex-col gap-3 border-r border-white/5 pr-6">
            <div class="flex items-center gap-3 w-full bg-white/5 p-3 rounded-lg border border-white/10">
              <span class="material-symbols-outlined text-white text-lg">dashboard</span>
              <span class="text-sm font-headline text-white font-medium">Overview</span>
            </div>
            <div class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-colors cursor-default group">
              <span class="material-symbols-outlined text-white/40 text-lg group-hover:text-white transition-colors">shield_person</span>
              <span class="text-sm font-headline text-white/40 group-hover:text-white transition-colors">Automod</span>
            </div>
            <div class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-colors cursor-default group">
              <span class="material-symbols-outlined text-white/40 text-lg group-hover:text-white transition-colors">graphic_eq</span>
              <span class="text-sm font-headline text-white/40 group-hover:text-white transition-colors">Audio Modules</span>
            </div>
            <div class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-colors cursor-default group">
              <span class="material-symbols-outlined text-white/40 text-lg group-hover:text-white transition-colors">settings</span>
              <span class="text-sm font-headline text-white/40 group-hover:text-white transition-colors">Configuration</span>
            </div>
            <div class="mt-auto p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-1 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <span class="text-xs font-headline font-bold text-primary uppercase tracking-wider">Ares Premium</span>
              <span class="text-xs text-primary/70">Enterprise Tier Active</span>
            </div>
          </div>
          <!-- Main Content -->
          <div class="col-span-1 md:col-span-3 flex flex-col gap-6">
            <!-- Top Stats Row -->
            <div class="grid grid-cols-3 gap-4">
               <div class="glass-exact p-4 md:p-5 flex flex-col justify-center relative overflow-hidden">
                 <div class="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                 <span class="text-[10px] sm:text-xs font-headline text-white/40 mb-1 uppercase tracking-widest z-10">Latency</span>
                 <span class="text-xl sm:text-2xl font-headline font-bold text-emerald-400 z-10 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] flex items-center gap-2">
                   <span id="landing-ping-term">...</span> <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 relative top-0.5 animate-pulse"></span>
                 </span>
               </div>
               <div class="glass-exact p-4 md:p-5 flex flex-col justify-center relative overflow-hidden">
                 <span class="text-[10px] sm:text-xs font-headline text-white/40 mb-1 uppercase tracking-widest z-10">Servers</span>
                 <span id="landing-guilds-term" class="text-xl sm:text-2xl font-headline font-bold text-white z-10">...</span>
               </div>
               <div class="glass-exact p-4 md:p-5 flex flex-col justify-center relative overflow-hidden">
                 <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/20 rounded-full blur-xl"></div>
                 <span class="text-[10px] sm:text-xs font-headline text-white/40 mb-1 uppercase tracking-widest z-10">Users</span>
                 <span id="landing-users-term" class="text-xl sm:text-2xl font-headline font-bold text-primary z-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">...</span>
               </div>
            </div>
            
            <!-- Terminal / Logs Window -->
            <div class="flex-1 rounded-xl bg-[#080808] border border-white/5 overflow-hidden flex flex-col relative shadow-inner">
               <div class="w-full h-8 bg-white/[0.02] border-b border-white/5 flex items-center px-4">
                 <span class="font-mono text-[10px] text-white/40 flex items-center gap-2"><span class="material-symbols-outlined text-[12px] text-primary">terminal</span> live-events.log</span>
               </div>
               <div class="p-4 font-mono text-[10px] sm:text-xs lg:text-sm space-y-3 sm:space-y-4 text-white/50 absolute inset-0 top-8 overflow-hidden select-none">
                 <div class="flex gap-3 sm:gap-4"><span class="text-white/20">10:45:01</span><span class="text-primary w-20 shrink-0 font-bold">[SYSTEM]</span><span class="text-white/80">Shard 0 established connection to Gateway.</span></div>
                 <div class="flex gap-3 sm:gap-4"><span class="text-white/20">10:45:02</span><span class="text-emerald-400 w-20 shrink-0 font-bold">[SYNC]</span><span class="text-white/80">Successfully synchronized 452 guild rulesets.</span></div>
                 <div class="flex gap-3 sm:gap-4"><span class="text-white/20">10:45:05</span><span class="text-yellow-400 w-20 shrink-0 font-bold">[WARN]</span><span class="text-white/80">Rate limit approach on /users/@me, backing off...</span></div>
                 <div class="flex gap-3 sm:gap-4"><span class="text-white/20">10:45:07</span><span class="text-red-400 w-20 shrink-0 font-bold drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]">[AUTOMOD]</span><span class="text-white/90">Intercepted 5 malicious payload links. Action: <span class="text-red-400 font-bold bg-red-400/10 px-1 rounded">BANNED</span></span></div>
                 <div class="flex gap-3 sm:gap-4"><span class="text-white/20">10:45:10</span><span class="text-secondary w-20 shrink-0 font-bold">[MUSIC]</span><span class="text-white/80">Lavalink node 'USEast-1' responding at 15ms ping.</span></div>
                 <div class="flex gap-3 sm:gap-4 opacity-70"><span class="text-white/20">10:45:12</span><span class="text-white/30 w-20 shrink-0 font-bold">[IDLE]</span><span class="text-white/40 flex gap-1">Awaiting events<span class="animate-pulse">...</span></span></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Exact Features Grid Section -->
  <section id="features" class="mb-40">
    <div class="text-center mb-16">
      <h2 class="font-headline text-3xl md:text-5xl font-black tracking-tighter mb-4 text-white">Everything you need.</h2>
      <p class="font-headline text-white/50 max-w-lg mx-auto text-lg">Powerful components, seamlessly integrated.</p>
    </div>

    <!-- Bento Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[320px]">
      
      <!-- Box 1: Automod (Blue accent) -->
      <div class="md:col-span-2 glass-exact p-8 flex flex-col justify-between group relative overflow-hidden cursor-default" style="transition: all 0.4s cubic-bezier(0.4,0,0.2,1);">
        <!-- Gradient border glow on hover -->
        <div class="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(59,130,246,0.15), transparent 50%);"></div>
        <!-- Floating particles -->
        <div class="absolute top-8 right-12 w-2 h-2 rounded-full bg-blue-500/30 group-hover:bg-blue-400/60 transition-all duration-1000 group-hover:translate-y-[-8px]"></div>
        <div class="absolute top-20 right-24 w-1.5 h-1.5 rounded-full bg-blue-400/20 group-hover:bg-blue-300/50 transition-all duration-1000 delay-150 group-hover:translate-y-[-12px]"></div>
        <div class="absolute top-14 right-40 w-1 h-1 rounded-full bg-blue-300/20 group-hover:bg-blue-200/40 transition-all duration-1000 delay-300 group-hover:translate-y-[-6px]"></div>
        
        <div class="relative z-10">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-shadow duration-500">
            <span class="material-symbols-outlined text-blue-400 text-[26px]">shield_person</span>
          </div>
          <h3 class="font-headline text-2xl font-bold mb-3 text-white tracking-tight">Advanced Automod</h3>
          <p class="font-headline text-white/50 max-w-md text-sm leading-relaxed">
            Protect your server instantly with highly configurable, zero-latency filters against spam, links, and malicious users.
          </p>
        </div>
        
        <!-- Module tags -->
        <div class="mt-auto pt-6 flex items-center gap-4">
          <div class="flex flex-wrap gap-2 items-center">
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-headline font-semibold tracking-wider uppercase">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Active
            </span>
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-headline font-semibold tracking-wider uppercase">Anti-Spam</span>
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-headline font-semibold tracking-wider uppercase">Anti-Link</span>
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-headline font-semibold tracking-wider uppercase">Anti-Invite</span>
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-headline font-semibold tracking-wider uppercase">Auto-Warn</span>
          </div>
        </div>
      </div>

      <!-- Box 2: Audio (Violet accent) -->
      <div class="col-span-1 glass-exact p-8 flex flex-col group relative overflow-hidden cursor-default" style="transition: all 0.4s cubic-bezier(0.4,0,0.2,1);">
        <div class="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(139,92,246,0.15), transparent 50%);"></div>
        
        <div class="relative z-10">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-violet-500/10 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-shadow duration-500">
            <span class="material-symbols-outlined text-violet-400 text-[22px]">headphones</span>
          </div>
          <h3 class="font-headline text-xl font-bold mb-2 text-white tracking-tight">Pristine Audio</h3>
          <p class="font-headline text-white/50 text-sm leading-relaxed">Zero-latency, high-fidelity music streaming across global voice channels.</p>
        </div>
        
        <!-- Animated equalizer bars -->
        <div class="mt-auto w-full pt-5 flex gap-[3px] items-end h-16 relative">
          <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-violet-500/5 to-transparent rounded-xl pointer-events-none"></div>
          <div class="flex-1 bg-violet-500/30 rounded-t-sm group-hover:bg-violet-400/50 transition-all duration-300" style="height: 25%; animation: eq1 1.2s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/40 rounded-t-sm group-hover:bg-violet-400/60 transition-all duration-300" style="height: 55%; animation: eq2 0.9s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/60 rounded-t-sm group-hover:bg-violet-400/80 transition-all duration-300" style="height: 85%; animation: eq3 1.1s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/80 rounded-t-sm shadow-[0_0_12px_rgba(139,92,246,0.5)] group-hover:bg-violet-400 transition-all duration-300" style="height: 100%; animation: eq4 0.8s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/60 rounded-t-sm group-hover:bg-violet-400/80 transition-all duration-300" style="height: 70%; animation: eq5 1.3s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/40 rounded-t-sm group-hover:bg-violet-400/60 transition-all duration-300" style="height: 45%; animation: eq2 1s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/30 rounded-t-sm group-hover:bg-violet-400/50 transition-all duration-300" style="height: 30%; animation: eq1 1.4s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/50 rounded-t-sm group-hover:bg-violet-400/70 transition-all duration-300" style="height: 60%; animation: eq3 0.7s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/30 rounded-t-sm group-hover:bg-violet-400/50 transition-all duration-300" style="height: 35%; animation: eq5 1.1s ease-in-out infinite alternate;"></div>
          <div class="flex-1 bg-violet-500/20 rounded-t-sm group-hover:bg-violet-400/40 transition-all duration-300" style="height: 20%; animation: eq1 0.9s ease-in-out infinite alternate;"></div>
        </div>
      </div>

      <!-- Box 3: Leveling (Emerald accent) -->
      <div class="col-span-1 glass-exact p-8 flex flex-col group relative overflow-hidden cursor-default" style="transition: all 0.4s cubic-bezier(0.4,0,0.2,1);">
        <div class="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(16,185,129,0.15), transparent 50%);"></div>
        
        <div class="relative z-10">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-shadow duration-500">
            <span class="material-symbols-outlined text-emerald-400 text-[22px]">trending_up</span>
          </div>
          <h3 class="font-headline text-xl font-bold mb-2 text-white tracking-tight">Engagement</h3>
          <p class="font-headline text-white/50 text-sm leading-relaxed">Reward your community with an aesthetic, highly customizable leveling system.</p>
        </div>
        
        <!-- Visual XP bar (decorative only) -->
        <div class="mt-auto pt-5 space-y-3 relative z-10">
          <div class="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div class="h-full rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]" style="width: 72%; background: linear-gradient(90deg, #10b981, #34d399);"></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-headline font-semibold tracking-wider uppercase">Leaderboards</span>
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-headline font-semibold tracking-wider uppercase">Role Rewards</span>
            <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-headline font-semibold tracking-wider uppercase">XP Tracking</span>
          </div>
        </div>
      </div>

      <!-- Box 4: Analytics (Amber/Blue accent) -->
      <div class="md:col-span-2 glass-exact p-8 flex justify-between items-center group relative overflow-hidden cursor-default" style="transition: all 0.4s cubic-bezier(0.4,0,0.2,1);">
        <div class="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(-45deg, rgba(59,130,246,0.1), transparent 50%);"></div>
        
        <div class="relative z-10 max-w-xs">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-shadow duration-500">
            <span class="material-symbols-outlined text-blue-400 text-[26px]">insights</span>
          </div>
          <h3 class="font-headline text-2xl font-bold mb-3 text-white tracking-tight">Deep Analytics</h3>
          <p class="font-headline text-white/50 text-sm leading-relaxed">
            Monitor growth, message volume, and member retention through a beautifully designed, real-time dashboard.
          </p>
        </div>
        
        <!-- Richer chart visualization -->
        <div class="hidden sm:block w-56 h-full relative">
           <svg class="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none">
             <!-- Grid lines -->
             <line x1="0" y1="30" x2="200" y2="30" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>
             <line x1="0" y1="60" x2="200" y2="60" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>
             <line x1="0" y1="90" x2="200" y2="90" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>
             <!-- Gradient fill under curve -->
             <defs>
               <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stop-color="rgba(59,130,246,0.25)"/>
                 <stop offset="100%" stop-color="rgba(59,130,246,0)"/>
               </linearGradient>
             </defs>
             <path d="M0,100 C20,90 40,85 60,70 C80,55 90,65 110,45 C130,25 150,35 170,20 C185,12 195,15 200,10 L200,120 L0,120 Z" fill="url(#chartGrad)"/>
             <path d="M0,100 C20,90 40,85 60,70 C80,55 90,65 110,45 C130,25 150,35 170,20 C185,12 195,15 200,10" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
             <!-- Glow dot at peak -->
             <circle cx="200" cy="10" r="4" fill="#3b82f6" opacity="0.8">
               <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
               <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
             </circle>
             <circle cx="200" cy="10" r="8" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.3">
               <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite"/>
               <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
             </circle>
           </svg>
        </div>
      </div>

    </div>
  </section>

  <!-- Big Stats Strip (Premium) -->
  <section class="mb-40 py-20 relative overflow-hidden">
    <!-- Ambient center glow -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-20 pointer-events-none" style="background: radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%);"></div>
    
    <!-- Top/bottom subtle border lines with gradient fade -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
    <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 max-w-4xl mx-auto px-6">
      
      <!-- Servers -->
      <div class="glass-exact p-8 text-center group relative overflow-hidden" style="transition: all 0.4s cubic-bezier(0.4,0,0.2,1);">
        <div class="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(59,130,246,0.1), transparent 50%);"></div>
        <div class="w-12 h-12 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-shadow duration-500">
          <span class="material-symbols-outlined text-blue-400 text-[22px]">dns</span>
        </div>
        <div class="font-headline text-4xl md:text-5xl font-black tracking-tighter mb-2 relative z-10">
          <span id="landing-guilds-big" class="bg-gradient-to-b from-white to-white/60 bg-clip-text" style="-webkit-background-clip: text; -webkit-text-fill-color: transparent;">...</span>
        </div>
        <div class="font-headline text-sm text-white/40 uppercase tracking-widest font-semibold">Servers</div>
      </div>
      
      <!-- Users -->
      <div class="glass-exact p-8 text-center group relative overflow-hidden" style="transition: all 0.4s cubic-bezier(0.4,0,0.2,1);">
        <div class="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(139,92,246,0.1), transparent 50%);"></div>
        <div class="w-12 h-12 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-violet-500/10 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-shadow duration-500">
          <span class="material-symbols-outlined text-violet-400 text-[22px]">group</span>
        </div>
        <div class="font-headline text-4xl md:text-5xl font-black tracking-tighter mb-2 relative z-10">
          <span id="landing-users-big" class="bg-gradient-to-b from-white to-white/60 bg-clip-text" style="-webkit-background-clip: text; -webkit-text-fill-color: transparent;">...</span>
        </div>
        <div class="font-headline text-sm text-white/40 uppercase tracking-widest font-semibold">Users</div>
      </div>
      
      <!-- Channels -->
      <div class="glass-exact p-8 text-center group relative overflow-hidden" style="transition: all 0.4s cubic-bezier(0.4,0,0.2,1);">
        <div class="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style="background: linear-gradient(135deg, rgba(16,185,129,0.1), transparent 50%);"></div>
        <div class="w-12 h-12 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-shadow duration-500">
          <span class="material-symbols-outlined text-emerald-400 text-[22px]">tag</span>
        </div>
        <div class="font-headline text-4xl md:text-5xl font-black tracking-tighter mb-2 relative z-10">
          <span id="landing-channels-big" class="bg-gradient-to-b from-white to-white/60 bg-clip-text" style="-webkit-background-clip: text; -webkit-text-fill-color: transparent;">...</span>
        </div>
        <div class="font-headline text-sm text-white/40 uppercase tracking-widest font-semibold">Channels</div>
      </div>
      
    </div>
  </section>

  <!-- Bottom CTA -->
  <section class="text-center mb-20 flex flex-col items-center">
    <h2 class="font-headline text-4xl md:text-5xl font-black tracking-tighter mb-4 text-white">Start building today.</h2>
    <p class="font-headline text-white/50 text-lg mb-8 max-w-sm">Join the thousands of communities running on Ares.</p>
    <a href="\${oauthUrl}" target="_blank" rel="noopener" class="btn-primary-exact px-10 py-4 text-base shadow-[0_0_40px_rgba(255,255,255,0.1)] inline-block">
      Invite to Discord
    </a>
  </section>

</main>

<!-- Exact Minimal Footer -->
<footer class="border-t border-white/10 bg-[#020202] relative z-20 overflow-hidden">
  <!-- Subtle top glow for the footer -->
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
  
  <div class="w-[96%] max-w-[1500px] mx-auto px-4 md:px-8 py-20">
    <div class="flex flex-col md:flex-row justify-between gap-12 mb-20">
      
      <div class="md:w-5/12">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black"><span class="material-symbols-outlined text-lg">bolt</span></div>
          <span class="text-2xl font-headline font-black text-white tracking-tight">Ares</span>
        </div>
        <p class="font-headline text-base text-white/60 leading-relaxed mb-8 max-w-sm">
          The finest infrastructure for your Discord community. Built for massive scale and designed for perfection.
        </p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors">
            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
          </a>
          <a href="/docs" data-link="/docs" class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors">
            <span class="material-symbols-outlined text-[18px]">menu_book</span>
          </a>
        </div>
      </div>
      
      <div class="flex flex-wrap gap-12 md:gap-24 md:justify-end md:w-7/12">
        <div>
          <h4 class="font-headline font-bold text-sm text-white mb-6 uppercase tracking-widest">Product</h4>
          <ul class="space-y-4 font-headline text-sm text-white/60">
            <li><a href="/docs" data-link="/docs" class="hover:text-primary transition-colors">Documentation</a></li>
            <li><a href="#" class="hover:text-primary transition-colors">Premium Plans</a></li>
            <li><a href="#" class="hover:text-primary transition-colors">Commands List</a></li>
            <li><a href="/auth/login" class="hover:text-primary transition-colors">Dashboard</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-headline font-bold text-sm text-white mb-6 uppercase tracking-widest">Legal</h4>
          <ul class="space-y-4 font-headline text-sm text-white/60">
            <li><a href="#" class="hover:text-white transition-colors">Terms of Service</a></li>
            <li><a href="#" class="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" class="hover:text-white transition-colors">Refund Policy</a></li>
          </ul>
        </div>
      </div>

    </div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 pt-10 border-t border-white/[0.05]">
      <span class="font-headline text-sm text-white/40">© 2024 Ares Intelligence Systems. All rights reserved.</span>
      <div class="flex items-center gap-2 font-headline text-sm text-white/50">
        <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"></span>
        <span class="font-medium tracking-wide">All Systems Operational</span>
      </div>
    </div>
  </div>
</footer>
  `;

  // Attach smooth scrolling logic for hash links
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

  // Fetch real values dynamically
  try {
    const stats = await API.get('/api/public/stats');
    if (stats) {
      const update = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      update('landing-ping-term', `${stats.ping}ms`);
      update('landing-guilds-term', typeof formatNumber === 'function' ? formatNumber(stats.guilds) : stats.guilds.toLocaleString());
      update('landing-users-term', typeof formatNumber === 'function' ? formatNumber(stats.users) : stats.users.toLocaleString());
      // For big numbers, we can use formatNumber, which is presumed to exist in scope or we fallback to string formatting
      update('landing-guilds-big', typeof formatNumber === 'function' ? formatNumber(stats.guilds) : stats.guilds.toLocaleString());
      update('landing-users-big', typeof formatNumber === 'function' ? formatNumber(stats.users) : stats.users.toLocaleString());
      update('landing-channels-big', typeof formatNumber === 'function' ? formatNumber(stats.channels) : stats.channels.toLocaleString());
    }
  } catch (err) {
    console.error('Failed to load real landing stats:', err);
  }
}
