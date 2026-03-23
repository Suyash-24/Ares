// Landing page (unauthenticated)
function renderLanding() {
  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';

  document.getElementById('page-content').innerHTML = `
<!-- Ambient Background Elements -->
<div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
  <div class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] nebula-glow rounded-full"></div>
  <div class="absolute top-[40%] -right-[10%] w-[40%] h-[40%] nebula-glow rounded-full opacity-60" style="background: radial-gradient(circle, rgba(75, 215, 246, 0.1) 0%, transparent 70%);"></div>
</div>

<!-- TopAppBar Navigation -->
<header class="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl shadow-2xl shadow-purple-900/20 z-[100] transition-all duration-500">
  <div class="flex justify-between items-center px-8 py-3 max-w-7xl mx-auto">
    <div class="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent font-headline">
      THE COMMAND BRIDGE
    </div>
    <nav class="hidden md:flex items-center gap-8 font-headline tracking-tight text-sm uppercase font-bold">
      <a class="text-cyan-400 drop-shadow-[0_0_8px_rgba(75,215,246,0.6)]" href="#">Bridge</a>
      <a class="text-slate-400 hover:text-white transition-colors" href="#">Nebula</a>
      <a class="text-slate-400 hover:text-white transition-colors" href="#">Tactical</a>
      <a class="text-slate-400 hover:text-white transition-colors" href="/docs" data-link="/docs">Docs</a>
    </nav>
    <div class="flex items-center gap-4 text-purple-300">
      <a href="/auth/login" class="hidden sm:inline-flex px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(132,85,239,0.3)] hover:shadow-[0_0_35px_rgba(132,85,239,0.5)] transition-all duration-300 active:scale-95">Dashboard</a>
      <button class="p-2 hover:bg-white/5 rounded-full transition-all duration-300 active:scale-95">
        <span class="material-symbols-outlined">account_circle</span>
      </button>
    </div>
  </div>
</header>

<main class="relative z-10 pt-32 pb-40 px-6 max-w-7xl mx-auto overflow-hidden">
  <!-- Hero Section -->
  <section class="flex flex-col items-center text-center mb-32">
    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/20 mb-8">
      <span class="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#4bd7f6]"></span>
      <span class="font-label text-xs uppercase tracking-[0.2em] text-secondary">System Online</span>
    </div>
    <h1 class="font-headline font-extrabold text-5xl md:text-8xl mb-8 tracking-tighter leading-[0.9] max-w-4xl bg-gradient-to-b from-on-surface via-on-surface to-slate-500 bg-clip-text text-transparent">
      THE ALL-IN-ONE <span class="text-primary italic">DISCORD</span> BOT.
    </h1>
    <p class="font-body text-on-surface-variant text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
      Elevate your community with Ares. A high-performance command center for moderation, leveling, and real-time analytics designed for the modern web.
    </p>
    <div class="flex flex-wrap justify-center gap-6">
      <a href="/auth/login" class="px-10 py-5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(132,85,239,0.3)] hover:shadow-[0_0_45px_rgba(132,85,239,0.5)] transition-all duration-300 active:scale-95">
        Initialize Bridge
      </a>
      <a href="${oauthUrl}" target="_blank" rel="noopener" class="px-10 py-5 rounded-xl border border-secondary/30 text-secondary font-headline font-bold uppercase tracking-widest text-sm hover:bg-secondary/5 transition-all duration-300 active:scale-95">
        Add to Server
      </a>
    </div>
  </section>

  <!-- Feature Bento Grid -->
  <section class="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
    <!-- Moderation Card -->
    <div class="md:col-span-2 glass-card rounded-[2rem] p-10 flex flex-col justify-between group overflow-hidden relative">
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-all duration-700"></div>
      <div class="relative z-10">
        <div class="w-14 h-14 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-6 text-primary border border-primary/20">
          <span class="material-symbols-outlined text-3xl">security</span>
        </div>
        <h3 class="font-headline text-3xl font-bold mb-4">Moderation Suite</h3>
        <p class="font-body text-on-surface-variant max-w-md">
          Autonomous protection protocols. Auto-mod, verification gates, and advanced logging to keep your nebula safe from hostile signals.
        </p>
      </div>
      <div class="flex items-center gap-3 relative z-10">
        <span class="font-label text-[10px] tracking-widest uppercase text-slate-500">Status: Active</span>
        <div class="h-[1px] flex-grow bg-outline-variant/20"></div>
      </div>
    </div>

    <!-- Music Card -->
    <div class="glass-card rounded-[2rem] p-10 flex flex-col justify-between group">
      <div class="relative z-10">
        <div class="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center mb-6 text-secondary border border-secondary/20">
          <span class="material-symbols-outlined text-3xl">music_note</span>
        </div>
        <h3 class="font-headline text-2xl font-bold mb-4">Music &amp; Leveling</h3>
        <p class="font-body text-sm text-on-surface-variant leading-relaxed">
          High-fidelity audio streaming and engagement gamification integrated into a single interface.
        </p>
      </div>
      <div class="flex flex-col gap-2 mt-4">
        <div class="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div class="h-full w-2/3 bg-gradient-to-r from-secondary to-cyan-200"></div>
        </div>
        <div class="flex justify-between text-[10px] font-label text-slate-500">
          <span>XP PROGRESS</span>
          <span>67%</span>
        </div>
      </div>
    </div>

    <!-- Analytics Card -->
    <div class="glass-card rounded-[2rem] p-8 flex flex-col group">
      <div class="w-12 h-12 rounded-xl bg-tertiary-container/20 flex items-center justify-center mb-6 text-tertiary border border-tertiary/20">
        <span class="material-symbols-outlined">analytics</span>
      </div>
      <h3 class="font-headline text-xl font-bold mb-3">Server Analytics</h3>
      <p class="font-body text-sm text-on-surface-variant mb-6">
        Real-time visualization of your community growth and activity metrics.
      </p>
      <div class="mt-auto p-4 bg-surface-container-lowest rounded-xl flex items-end justify-between h-24 gap-1">
        <div class="w-full bg-primary/20 rounded-t-sm h-1/2"></div>
        <div class="w-full bg-primary/20 rounded-t-sm h-2/3"></div>
        <div class="w-full bg-primary/40 rounded-t-sm h-full shadow-[0_0_10px_rgba(208,188,255,0.3)]"></div>
        <div class="w-full bg-primary/20 rounded-t-sm h-3/4"></div>
        <div class="w-full bg-primary/20 rounded-t-sm h-1/2"></div>
      </div>
    </div>

    <!-- Visual Decorative Card -->
    <div class="md:col-span-2 glass-card rounded-[2rem] relative overflow-hidden flex items-center p-10 group">
      <div class="absolute inset-0 z-0">
        <img alt="Abstract digital nebula" class="w-full h-full object-cover opacity-30 mix-blend-screen group-hover:scale-110 transition-transform duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAmL5P7KnP-QvfgCwPgABdIjNz9d0drqH-DreZokcQiRctF8ios4hq8NXNAriBGnZI5UNc81KENuctOwIxNQlaVgBZOVFk8ffgxTv_hXkTP0SCIUxoUCELaMIiIrGKZNM_hKipkaanBWI0ywnRHngLkG_MbH83CXy6xPgcwHt7vbiDkA5WqQm-s5WZSLjIOf0TeZE5P5CBMBGIzRynPRs7ir8osvjUeTbOCZnBR9BSic-D1vBQVrG8pPcVLt1E9JDCQDHlDFlQuyk"/>
        <div class="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-transparent"></div>
      </div>
      <div class="relative z-10 max-w-sm">
        <span class="font-label text-[10px] uppercase tracking-widest text-primary mb-2 block">System Integration</span>
        <h3 class="font-headline text-3xl font-bold mb-4 tracking-tight">The Discord OS</h3>
        <p class="font-body text-on-surface-variant mb-6 text-sm">
          Experience a bot that feels like a native extension of your server. Fluid transitions, instant responses, and cosmic precision.
        </p>
        <a class="inline-flex items-center gap-2 font-headline font-bold text-xs uppercase tracking-widest text-secondary group/link" href="/docs" data-link="/docs">
          Explore Modules
          <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </a>
      </div>
    </div>
  </section>

  <!-- Stats Counter Section -->
  <section class="mt-32 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
    <div>
      <div class="font-headline text-4xl font-extrabold text-on-surface mb-2 tracking-tighter">5.2M+</div>
      <div class="font-label text-[10px] uppercase tracking-[0.2em] text-slate-500">Users Guarded</div>
    </div>
    <div>
      <div class="font-headline text-4xl font-extrabold text-on-surface mb-2 tracking-tighter">12K+</div>
      <div class="font-label text-[10px] uppercase tracking-[0.2em] text-slate-500">Servers Active</div>
    </div>
    <div>
      <div class="font-headline text-4xl font-extrabold text-on-surface mb-2 tracking-tighter">99.9%</div>
      <div class="font-label text-[10px] uppercase tracking-[0.2em] text-slate-500">Signal Uptime</div>
    </div>
    <div>
      <div class="font-headline text-4xl font-extrabold text-on-surface mb-2 tracking-tighter">24ms</div>
      <div class="font-label text-[10px] uppercase tracking-[0.2em] text-slate-500">Command Latency</div>
    </div>
  </section>
</main>

<!-- BottomNavBar (mobile) -->
<nav class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-8 py-4 px-10 rounded-full border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl shadow-cyan-900/20 md:hidden">
  <div class="flex flex-col items-center justify-center text-cyan-400 relative after:content-[''] after:absolute after:-bottom-2 after:w-1 after:h-1 after:bg-cyan-400 after:rounded-full after:shadow-[0_0_12px_#4bd7f6] cursor-pointer active:scale-90 transition-all duration-300">
    <span class="material-symbols-outlined">grid_view</span>
    <span class="font-label text-[10px] font-bold uppercase tracking-widest mt-1">Bridge</span>
  </div>
  <div class="flex flex-col items-center justify-center text-slate-500 hover:text-purple-300 cursor-pointer hover:scale-110 active:scale-90 transition-all duration-300">
    <span class="material-symbols-outlined">auto_awesome</span>
    <span class="font-label text-[10px] font-bold uppercase tracking-widest mt-1">Nebula</span>
  </div>
  <div class="flex flex-col items-center justify-center text-slate-500 hover:text-purple-300 cursor-pointer hover:scale-110 active:scale-90 transition-all duration-300">
    <span class="material-symbols-outlined">rocket_launch</span>
    <span class="font-label text-[10px] font-bold uppercase tracking-widest mt-1">Tactical</span>
  </div>
  <div class="flex flex-col items-center justify-center text-slate-500 hover:text-purple-300 cursor-pointer hover:scale-110 active:scale-90 transition-all duration-300">
    <span class="material-symbols-outlined">sensors</span>
    <span class="font-label text-[10px] font-bold uppercase tracking-widest mt-1">Signals</span>
  </div>
</nav>

<!-- Footer Content -->
<footer class="relative z-10 border-t border-outline-variant/10 bg-surface-container-lowest/50 py-20 px-6">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
    <div class="max-w-xs">
      <div class="text-xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent font-headline mb-6">
        ARES COMMAND
      </div>
      <p class="font-body text-sm text-on-surface-variant leading-relaxed">
        Defining the next generation of Discord community management. Join the cosmic fleet.
      </p>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-16">
      <div>
        <h4 class="font-headline font-bold text-xs uppercase tracking-widest text-on-surface mb-6">Protocols</h4>
        <ul class="space-y-4 font-body text-sm text-on-surface-variant">
          <li><a class="hover:text-primary transition-colors" href="/docs" data-link="/docs">Documentation</a></li>
          <li><a class="hover:text-primary transition-colors" href="/docs" data-link="/docs">Commands</a></li>
          <li><a class="hover:text-primary transition-colors" href="/docs" data-link="/docs">Permissions</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-headline font-bold text-xs uppercase tracking-widest text-on-surface mb-6">Fleet</h4>
        <ul class="space-y-4 font-body text-sm text-on-surface-variant">
          <li><a class="hover:text-primary transition-colors" href="#">Status</a></li>
          <li><a class="hover:text-primary transition-colors" href="#">Support Hub</a></li>
          <li><a class="hover:text-primary transition-colors" href="#">Privacy</a></li>
        </ul>
      </div>
      <div class="col-span-2 md:col-span-1">
        <h4 class="font-headline font-bold text-xs uppercase tracking-widest text-on-surface mb-6">Sub-Frequency</h4>
        <div class="flex gap-4">
          <a class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors" href="#">
            <span class="material-symbols-outlined text-on-surface-variant">chat</span>
          </a>
          <a class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors" href="#">
            <span class="material-symbols-outlined text-on-surface-variant">language</span>
          </a>
        </div>
      </div>
    </div>
  </div>
  <div class="max-w-7xl mx-auto mt-20 pt-10 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4">
    <span class="font-label text-[10px] text-slate-500 uppercase tracking-widest">&copy; 2024 Ares Intelligence Systems. All Rights Reserved.</span>
    <div class="flex gap-8">
      <a class="font-label text-[10px] text-slate-500 uppercase tracking-widest hover:text-on-surface transition-colors" href="#">Terms of Signal</a>
      <a class="font-label text-[10px] text-slate-500 uppercase tracking-widest hover:text-on-surface transition-colors" href="#">Data Privacy</a>
    </div>
  </div>
</footer>
  `;
}