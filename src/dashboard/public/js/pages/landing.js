// Landing page (unauthenticated)
function renderLanding() {
  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';

  document.getElementById('page-content').innerHTML = `
<!-- Base Grid Pattern Background -->
<div class="fixed inset-0 bg-grid-pattern pointer-events-none z-0"></div>

<!-- Ambient Glowing Orbs -->
<div class="fixed inset-0 overflow-hidden pointer-events-none z-0 mix-blend-screen">
  <div class="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] ambient-blur-primary opacity-40 animate-pulse-ring" style="animation-duration: 15s;"></div>
  <div class="absolute top-[30%] -right-[20%] w-[60vw] h-[60vw] ambient-blur-secondary opacity-30 animate-pulse-ring" style="animation-duration: 20s; animation-delay: 5s;"></div>
</div>

<!-- Premium Navbar -->
<header class="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-[100] transition-all duration-500">
  <div class="glass-premium rounded-2xl px-6 py-4 flex justify-between items-center">
    <div class="flex items-center gap-3 cursor-pointer group" onclick="window.scrollTo({top:0, behavior:'smooth'})">
      <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
        <span class="material-symbols-outlined text-xl">bolt</span>
      </div>
      <span class="text-xl font-headline font-bold text-white tracking-tight">Ares</span>
    </div>
    
    <nav class="hidden md:flex flex-1 justify-center items-center gap-8">
      <a class="text-sm font-label text-on-surface hover:text-white transition-colors tracking-wide" href="#features">Features</a>
      <a class="text-sm font-label text-on-surface hover:text-white transition-colors tracking-wide" href="/docs" data-link="/docs">Documentation</a>
      <a class="text-sm font-label text-on-surface hover:text-white transition-colors tracking-wide" href="#">Premium</a>
    </nav>
    
    <div class="flex items-center gap-4">
      <a href="/auth/login" class="text-sm font-label text-on-surface hover:text-white transition-colors tracking-wide hidden sm:block">Dashboard</a>
      <a href="\${oauthUrl}" target="_blank" rel="noopener" class="btn-glow px-6 py-2.5 rounded-xl bg-white text-black font-headline font-bold text-sm hover:scale-105 active:scale-95 transition-all">
        Invite Bot
      </a>
    </div>
  </div>
</header>

<main class="relative z-10 pt-48 pb-32 px-6 max-w-7xl mx-auto overflow-hidden">
  
  <!-- Hero Section -->
  <section class="flex flex-col items-center text-center mb-40 animate-float-slow">
    
    <!-- Status Badge -->
    <a href="/docs" data-link="/docs" class="glass-pill px-4 py-1.5 rounded-full inline-flex items-center gap-3 mb-8 cursor-pointer hover:bg-white/5 transition-colors group">
      <span class="flex h-2 w-2 relative">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
      </span>
      <span class="text-xs font-label text-on-surface-variant font-medium tracking-wide group-hover:text-white transition-colors">Ares v2.0 Architecture is live. Read the docs <span class="text-secondary ml-1">→</span></span>
    </a>

    <!-- Massive Headline -->
    <h1 class="font-headline font-extrabold text-6xl md:text-8xl lg:text-9xl mb-8 tracking-tighter leading-[0.95] max-w-5xl text-gradient-premium select-none">
      Command your <br class="hidden md:block" /> server with <span class="text-gradient-primary">precision.</span>
    </h1>
    
    <p class="font-body text-on-surface-variant text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
      Ares is the definitive management tier for Discord. High-performance auto-moderation, pristine audio streaming, and deep analytics—built for scale.
    </p>
    
    <div class="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
      <a href="\${oauthUrl}" target="_blank" rel="noopener" class="btn-glow flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-headline font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all">
        <span class="material-symbols-outlined">add</span>
        Add to Discord
      </a>
      <a href="/auth/login" class="glass-pill flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-headline font-bold text-base hover:bg-white/5 hover:border-white/20 active:scale-[0.98] transition-all">
        Open Dashboard
      </a>
    </div>
    
  </section>

  <!-- Showcase / Mockup Area (Abstract Dashboard View) -->
  <section class="relative w-full max-w-5xl mx-auto mb-40 perspective-[2000px]">
    <div class="glass-premium rounded-3xl p-2 border-t border-white/10 shadow-[0_0_100px_rgba(132,85,239,0.15)] transform rotate-x-[2deg] hover:rotate-x-0 transition-transform duration-700 ease-out">
      <div class="w-full h-[400px] md:h-[600px] rounded-[1.25rem] bg-[#050505] overflow-hidden relative border border-white/5">
        <!-- Mock UI Header -->
        <div class="absolute top-0 w-full h-14 border-b border-white/5 flex items-center px-6 gap-4 bg-white/[0.02]">
          <div class="flex gap-2">
            <div class="w-3 h-3 rounded-full bg-white/10"></div>
            <div class="w-3 h-3 rounded-full bg-white/10"></div>
            <div class="w-3 h-3 rounded-full bg-white/10"></div>
          </div>
          <div class="h-6 w-64 bg-white/5 rounded mx-auto"></div>
        </div>
        <!-- Mock UI Body -->
        <div class="absolute top-14 w-full h-[calc(100%-3.5rem)] p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="h-full rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
            <div class="h-8 w-1/2 bg-white/5 rounded-lg"></div>
            <div class="h-24 w-full bg-primary/10 rounded-xl relative overflow-hidden"><div class="absolute bottom-0 left-0 h-1 bg-primary w-[70%]"></div></div>
            <div class="space-y-2 mt-auto">
              <div class="h-4 w-full bg-white/5 rounded"></div>
              <div class="h-4 w-4/5 bg-white/5 rounded"></div>
            </div>
          </div>
          <div class="md:col-span-2 h-full rounded-2xl bg-white/[0.02] border border-white/5 p-6 flex flex-col justify-between relative overflow-hidden">
            <div class="absolute right-0 top-0 w-64 h-64 ambient-blur-secondary opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
            <div>
              <div class="h-8 w-1/3 bg-white/5 rounded-lg mb-8"></div>
              <div class="flex items-end gap-2 h-32 mt-4">
                <div class="w-1/6 bg-white/5 h-[40%] rounded-t-sm"></div>
                <div class="w-1/6 bg-white/5 h-[60%] rounded-t-sm"></div>
                <div class="w-1/6 bg-white/10 h-[50%] rounded-t-sm"></div>
                <div class="w-1/6 bg-primary/40 h-[90%] rounded-t-sm relative shadow-[0_0_15px_rgba(208,188,255,0.3)]"><div class="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-primary font-bold">LIVE</div></div>
                <div class="w-1/6 bg-white/5 h-[70%] rounded-t-sm"></div>
                <div class="w-1/6 bg-white/5 h-[45%] rounded-t-sm"></div>
              </div>
            </div>
            <div class="flex gap-4">
               <div class="flex-1 h-12 bg-white/5 rounded-xl"></div>
               <div class="flex-1 h-12 bg-white/5 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Bento Grid Features Section -->
  <section id="features" class="mb-40">
    <div class="text-center mb-16">
      <h2 class="font-headline text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-white">Engineered for perfection.</h2>
      <p class="font-body text-on-surface-variant max-w-xl mx-auto">Every module represents a masterpiece of backend optimization and frontend elegance.</p>
    </div>

    <!-- The Bento Box -->
    <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 auto-rows-[280px]">
      
      <!-- Big Feature: Moderation -->
      <div class="md:col-span-4 lg:col-span-4 glass-premium rounded-3xl p-10 flex flex-col justify-between group relative overflow-hidden hover:border-primary/30">
        <div class="absolute top-0 right-0 w-96 h-96 ambient-blur-primary opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
        <div class="relative z-10">
          <div class="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/30 transition-all duration-300">
            <span class="material-symbols-outlined text-3xl">shield_person</span>
          </div>
          <h3 class="font-headline text-3xl font-bold mb-3 text-white">Autonomous Defense</h3>
          <p class="font-body text-on-surface-variant max-w-md text-sm leading-relaxed">
            Our proprietary Anti-Nuke and Automod algorithms analyze millions of signals per second to instantly neutralize malicious actors before they damage your server.
          </p>
        </div>
        <div class="relative z-10 flex items-center gap-4 mt-8">
          <span class="px-4 py-1.5 rounded-full bg-white/5 text-[10px] font-bold tracking-widest uppercase text-white border border-white/5">Auto-Mod</span>
          <span class="px-4 py-1.5 rounded-full bg-primary/10 text-[10px] font-bold tracking-widest uppercase text-primary border border-primary/20">Anti-Raid Active</span>
        </div>
      </div>

      <!-- Small Feature: Music -->
      <div class="md:col-span-2 lg:col-span-2 glass-premium rounded-3xl p-8 group flex flex-col relative overflow-hidden hover:border-secondary/30">
        <div class="relative z-10">
          <div class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:bg-secondary/20 group-hover:text-secondary group-hover:border-secondary/30 transition-all duration-300">
            <span class="material-symbols-outlined text-2xl">graphic_eq</span>
          </div>
          <h3 class="font-headline text-2xl font-bold mb-2 text-white">Lossless Audio</h3>
          <p class="font-body text-on-surface-variant text-sm">Powered by Lavalink V4 for the ultimate zero-latency streaming experience.</p>
        </div>
        <!-- Mock Audio Player Visual -->
        <div class="mt-auto w-full pt-6 border-t border-white/5">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] text-on-surface-variant font-label">01:24</span>
            <span class="text-[10px] text-on-surface-variant font-label">03:45</span>
          </div>
          <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-secondary w-1/3 relative shadow-[0_0_10px_#4bd7f6]"></div>
          </div>
        </div>
      </div>

      <!-- Small Feature: Analytics -->
      <div class="md:col-span-2 lg:col-span-2 glass-premium rounded-3xl p-8 group flex flex-col relative overflow-hidden hover:border-tertiary/30">
        <div class="relative z-10">
          <div class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:bg-tertiary/20 group-hover:text-tertiary group-hover:border-tertiary/30 transition-all duration-300">
            <span class="material-symbols-outlined text-2xl">monitoring</span>
          </div>
          <h3 class="font-headline text-xl font-bold mb-2 text-white">Deep Analytics</h3>
          <p class="font-body text-on-surface-variant text-sm">Visualize growth trends and engagement metrics effortlessly.</p>
        </div>
        <div class="mt-auto flex items-end gap-1 h-12">
           <div class="w-full bg-white/5 h-[30%] rounded-t-sm group-hover:bg-tertiary/40 transition-colors"></div>
           <div class="w-full bg-white/10 h-[50%] rounded-t-sm group-hover:bg-tertiary/60 transition-colors"></div>
           <div class="w-full bg-white/20 h-[80%] rounded-t-sm group-hover:bg-tertiary/80 transition-colors shadow-[0_0_15px_transparent] group-hover:shadow-[0_0_15px_rgba(208,188,255,0.4)]"></div>
           <div class="w-full bg-white/5 h-[40%] rounded-t-sm group-hover:bg-tertiary/30 transition-colors"></div>
        </div>
      </div>

      <!-- Medium Feature: Leveling & Roles -->
      <div class="md:col-span-4 lg:col-span-4 glass-premium rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center group relative overflow-hidden hover:border-white/20">
        <div class="flex-1 relative z-10 w-full">
          <div class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
            <span class="material-symbols-outlined text-2xl">workspace_premium</span>
          </div>
          <h3 class="font-headline text-2xl font-bold mb-2 text-white">Engagement Ecosystem</h3>
          <p class="font-body text-on-surface-variant text-sm">
            Reward your most active members with an entirely customizable leveling system, complete with dynamic rank cards, role rewards, and automatic leaderboards.
          </p>
        </div>
        <!-- Abstract visual representation -->
        <div class="flex-1 w-full flex justify-center py-4">
          <div class="relative w-48 h-48">
            <div class="absolute inset-0 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div class="absolute inset-4 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-4xl text-primary drop-shadow-[0_0_15px_rgba(208,188,255,0.8)] font-headline font-black">Lv. 99</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- Big Stats Strip -->
  <section class="mb-40 py-20 border-y border-white/5 relative overflow-hidden">
    <div class="absolute inset-0 bg-white/[0.01]"></div>
    <div class="flex flex-wrap justify-evenly items-center gap-10 relative z-10">
      <div class="text-center group">
        <div class="font-headline text-5xl md:text-7xl font-black text-white mb-2 tracking-tighter group-hover:text-primary transition-colors">12K<span class="text-primary">+</span></div>
        <div class="font-label text-xs uppercase tracking-[0.3em] text-on-surface-variant font-bold">Servers Secured</div>
      </div>
      <div class="text-center group">
        <div class="font-headline text-5xl md:text-7xl font-black text-white mb-2 tracking-tighter group-hover:text-secondary transition-colors">5.2M<span class="text-secondary">+</span></div>
        <div class="font-label text-xs uppercase tracking-[0.3em] text-on-surface-variant font-bold">Total Users</div>
      </div>
      <div class="text-center group">
        <div class="font-headline text-5xl md:text-7xl font-black text-white mb-2 tracking-tighter group-hover:text-white transition-colors">99.9<span class="text-white">%</span></div>
        <div class="font-label text-xs uppercase tracking-[0.3em] text-on-surface-variant font-bold">Uptime SLA</div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="max-w-4xl mx-auto text-center mb-20">
    <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 text-white shadow-[0_0_30px_rgba(255,255,255,0.1)]">
      <span class="material-symbols-outlined text-3xl">rocket_launch</span>
    </div>
    <h2 class="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-white">Ready to ascend?</h2>
    <p class="font-body text-on-surface-variant text-lg mb-10">Join thousands of premier communities powered by Ares.</p>
    <a href="\${oauthUrl}" target="_blank" rel="noopener" class="btn-glow inline-block px-10 py-5 rounded-2xl bg-white text-black font-headline font-bold text-lg hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer">
      Invite Ares Now
    </a>
  </section>

</main>

<!-- Modern Footer -->
<footer class="border-t border-white/5 bg-[#010101] relative z-20">
  <div class="max-w-7xl mx-auto px-6 py-20 pb-10">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
      
      <div class="md:col-span-2">
        <div class="flex items-center gap-2 mb-6">
          <div class="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[14px]">bolt</span></div>
          <span class="text-lg font-headline font-black text-white tracking-tight">ARES</span>
        </div>
        <p class="font-body text-sm text-on-surface-variant max-w-sm mb-8 leading-relaxed">
          The all-in-one Discord management platform built with an obsessive focus on performance and aesthetics.
        </p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-sm">chat</span>
          </a>
          <a href="#" class="w-10 h-10 rounded-full glass-pill flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-sm">language</span>
          </a>
        </div>
      </div>
      
      <div>
        <h4 class="font-headline font-bold text-xs uppercase tracking-widest text-white mb-6">Product</h4>
        <ul class="space-y-4 font-body text-sm text-on-surface-variant">
          <li><a href="/docs" data-link="/docs" class="hover:text-primary transition-colors">Documentation</a></li>
          <li><a href="#" class="hover:text-primary transition-colors">Dashboard</a></li>
          <li><a href="#" class="hover:text-primary transition-colors">Premium</a></li>
          <li><a href="#" class="hover:text-primary transition-colors">Status</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-headline font-bold text-xs uppercase tracking-widest text-white mb-6">Legal</h4>
        <ul class="space-y-4 font-body text-sm text-on-surface-variant">
          <li><a href="#" class="hover:text-white transition-colors">Terms of Service</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Privacy Policy</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Refund Policy</a></li>
        </ul>
      </div>

    </div>
    
    <div class="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <span class="font-label text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">© 2024 Ares Intelligence Systems.</span>
      <div class="flex items-center gap-2 font-label text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">
        <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
        All Systems Operational
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
}
