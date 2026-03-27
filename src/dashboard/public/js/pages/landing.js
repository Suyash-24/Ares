// Landing page (unauthenticated) - Exact Replication
function renderLanding() {
  const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands';

  document.getElementById('page-content').innerHTML = `
<!-- Pure Black Base -->
<div class="fixed inset-0 bg-black pointer-events-none z-0"></div>

<!-- Ambient Glowing Orbs -->
<div class="fixed inset-0 overflow-hidden pointer-events-none z-0 mix-blend-screen">
  <div class="absolute -top-[10%] left-[20%] w-[50vw] h-[50vw] glow-orb-primary opacity-50"></div>
  <div class="absolute top-[40%] right-[10%] w-[40vw] h-[40vw] glow-orb-secondary opacity-40"></div>
</div>

<!-- Exact Floating Navbar -->
<header class="fixed top-8 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-[100]">
  <div class="glass-nav px-6 py-3 flex justify-between items-center">
    <div class="flex items-center gap-2 cursor-pointer" onclick="window.scrollTo({top:0, behavior:'smooth'})">
      <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
        <span class="material-symbols-outlined text-lg">bolt</span>
      </div>
      <span class="text-lg font-headline font-bold text-white tracking-tight ml-1">Ares</span>
    </div>
    
    <nav class="hidden md:flex justify-center items-center gap-8">
      <a class="text-sm font-headline font-medium text-white/60 hover:text-white transition-colors" href="#features">Features</a>
      <a class="text-sm font-headline font-medium text-white/60 hover:text-white transition-colors" href="/docs" data-link="/docs">Documentation</a>
      <a class="text-sm font-headline font-medium text-white/60 hover:text-white transition-colors" href="#">Premium</a>
    </nav>
    
    <div class="flex items-center gap-4">
      <a href="/auth/login" class="text-sm font-headline font-medium text-white/60 hover:text-white transition-colors hidden sm:block">Dashboard</a>
      <a href="\${oauthUrl}" target="_blank" rel="noopener" class="btn-primary-exact px-5 py-2 text-sm">
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
    <h1 class="font-headline font-black text-6xl md:text-[5.5rem] lg:text-[7rem] mb-6 tracking-tighter leading-[0.95] text-white select-none">
      The standard for <br class="hidden md:block" /> <span class="text-gradient-primary">discord bots.</span>
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
    <div class="glass-exact p-2 md:p-4 bg-black/40 shadow-2xl">
      <div class="w-full h-[400px] md:h-[600px] rounded-[1rem] bg-[#050505] overflow-hidden border border-white/5 relative">
        <!-- Mock Nav -->
        <div class="absolute top-0 w-full h-12 border-b border-white/5 flex items-center px-4 gap-3 bg-white/[0.01]">
          <div class="flex gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-white/10"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-white/10"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-white/10"></div>
          </div>
          <div class="flex-1"></div>
          <div class="h-5 w-48 bg-white/5 rounded-md"></div>
          <div class="flex-1"></div>
        </div>
        <!-- Mock Body Grid -->
        <div class="absolute top-12 w-full h-[calc(100%-3rem)] p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Sidebar -->
          <div class="hidden md:flex flex-col gap-2">
            <div class="h-8 w-full bg-white/5 rounded-lg mb-4"></div>
            <div class="h-6 w-full bg-white/5 rounded-md"></div>
            <div class="h-6 w-3/4 bg-white/5 rounded-md"></div>
            <div class="h-6 w-5/6 bg-white/5 rounded-md"></div>
          </div>
          <!-- Main Content -->
          <div class="col-span-1 md:col-span-3 grid grid-cols-2 gap-4">
            <div class="col-span-2 h-32 rounded-xl bg-white/[0.02] border border-white/5 p-4 flex gap-4 items-center">
               <div class="w-16 h-16 rounded-full bg-primary/20"></div>
               <div class="flex-1 space-y-2">
                 <div class="h-4 w-1/3 bg-white/10 rounded"></div>
                 <div class="h-3 w-1/4 bg-white/5 rounded"></div>
               </div>
            </div>
            <div class="h-48 rounded-xl bg-white/[0.02] border border-white/5 p-4 relative overflow-hidden">
                <div class="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-primary/10 to-transparent"></div>
                <div class="h-4 w-1/2 bg-white/10 rounded mb-auto"></div>
            </div>
            <div class="h-48 rounded-xl bg-white/[0.02] border border-white/5 p-4 relative overflow-hidden">
                <div class="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-secondary/10 to-transparent"></div>
                <div class="h-4 w-1/2 bg-white/10 rounded mb-auto"></div>
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
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[300px]">
      
      <!-- Box 1: Moderation -->
      <div class="md:col-span-2 glass-exact p-8 flex flex-col justify-between group relative overflow-hidden hover:bg-white/[0.05] cursor-default">
        <div class="absolute top-0 right-0 w-64 h-64 glow-orb-primary opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
        <div class="relative z-10">
          <div class="w-12 h-12 rounded-xl glass-exact flex items-center justify-center mb-6 text-white text-opacity-80">
            <span class="material-symbols-outlined">shield_person</span>
          </div>
          <h3 class="font-headline text-2xl font-bold mb-2 text-white tracking-tight">Advanced Automod</h3>
          <p class="font-headline text-white/50 max-w-md text-sm leading-relaxed">
            Protect your server instantly with highly configurable, zero-latency filters against spam, links, and malicious users.
          </p>
        </div>
      </div>

      <!-- Box 2: Audio -->
      <div class="col-span-1 glass-exact p-8 flex flex-col group relative overflow-hidden hover:bg-white/[0.05] cursor-default">
         <div class="relative z-10">
          <div class="w-10 h-10 rounded-xl glass-exact flex items-center justify-center mb-4 text-white text-opacity-80">
            <span class="material-symbols-outlined text-[20px]">headphones</span>
          </div>
          <h3 class="font-headline text-xl font-bold mb-2 text-white tracking-tight">Pristine Audio</h3>
          <p class="font-headline text-white/50 text-sm">Experience zero-latency, high-fidelity music streaming across global voice channels.</p>
        </div>
        <div class="mt-auto w-full pt-4 border-t border-white/5 flex gap-1 items-end h-8">
          <div class="w-full bg-white/20 h-[30%] rounded-sm"></div>
          <div class="w-full bg-white/40 h-[60%] rounded-sm"></div>
          <div class="w-full bg-primary/80 h-[100%] rounded-sm shadow-[0_0_10px_#3b82f6]"></div>
          <div class="w-full bg-white/20 h-[40%] rounded-sm"></div>
          <div class="w-full bg-white/10 h-[20%] rounded-sm"></div>
        </div>
      </div>

      <!-- Box 3: Leveling -->
      <div class="col-span-1 glass-exact p-8 flex flex-col group relative overflow-hidden hover:bg-white/[0.05] cursor-default">
        <div class="relative z-10">
          <div class="w-10 h-10 rounded-xl glass-exact flex items-center justify-center mb-4 text-white text-opacity-80">
            <span class="material-symbols-outlined text-[20px]">deployed_code</span>
          </div>
          <h3 class="font-headline text-xl font-bold mb-2 text-white tracking-tight">Engagement</h3>
          <p class="font-headline text-white/50 text-sm">Reward your community with an aesthetic, highly customizable leveling system.</p>
        </div>
      </div>

      <!-- Box 4: Analytics -->
      <div class="md:col-span-2 glass-exact p-8 flex justify-between items-center group relative overflow-hidden hover:bg-white/[0.05] cursor-default">
        <div class="relative z-10 max-w-xs">
          <div class="w-12 h-12 rounded-xl glass-exact flex items-center justify-center mb-6 text-white text-opacity-80">
            <span class="material-symbols-outlined">insights</span>
          </div>
          <h3 class="font-headline text-2xl font-bold mb-2 text-white tracking-tight">Deep Analytics</h3>
          <p class="font-headline text-white/50 text-sm leading-relaxed">
            Monitor growth, message volume, and member retention through a beautifully designed, real-time dashboard.
          </p>
        </div>
        <div class="hidden sm:block w-48 h-full relative">
           <!-- Line graph mock -->
           <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M0,80 Q20,60 40,70 T80,30 L100,50 L100,100 L0,100 Z" fill="rgba(59, 130, 246, 0.1)"></path>
             <path d="M0,80 Q20,60 40,70 T80,30 L100,50" fill="none" stroke="#3b82f6" stroke-width="2"></path>
           </svg>
        </div>
      </div>

    </div>
  </section>

  <!-- Big Exact Stats Strip -->
  <section class="mb-40 py-16 border-y border-white/10 relative overflow-hidden bg-white/[0.01]">
    <div class="flex flex-wrap justify-evenly items-center gap-10 relative z-10 max-w-4xl mx-auto">
      <div class="text-center group">
        <div class="font-headline text-4xl md:text-5xl font-black text-white tracking-tighter transition-colors">12K+</div>
        <div class="font-headline text-sm text-white/50 mt-1">Servers Secured</div>
      </div>
      <div class="text-center group">
        <div class="font-headline text-4xl md:text-5xl font-black text-white tracking-tighter transition-colors">5.2M+</div>
        <div class="font-headline text-sm text-white/50 mt-1">Total Users</div>
      </div>
      <div class="text-center group">
        <div class="font-headline text-4xl md:text-5xl font-black text-white tracking-tighter transition-colors">99.9%</div>
        <div class="font-headline text-sm text-white/50 mt-1">Global Uptime</div>
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
<footer class="border-t border-white/10 bg-[#000000] relative z-20">
  <div class="max-w-6xl mx-auto px-6 py-16">
    <div class="flex flex-col md:flex-row justify-between gap-10 mb-16">
      
      <div class="md:w-1/3">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black"><span class="material-symbols-outlined text-[14px]">bolt</span></div>
          <span class="text-lg font-headline font-bold text-white tracking-tight">Ares</span>
        </div>
        <p class="font-headline text-sm text-white/40 leading-relaxed mb-6">
          The finest infrastructure for your Discord community. Built for scale, designed for aesthetics.
        </p>
      </div>
      
      <div class="flex gap-16 md:justify-end md:w-2/3">
        <div>
          <h4 class="font-headline font-semibold text-sm text-white mb-4">Product</h4>
          <ul class="space-y-3 font-headline text-sm text-white/50">
            <li><a href="/docs" data-link="/docs" class="hover:text-white transition-colors">Documentation</a></li>
            <li><a href="#" class="hover:text-white transition-colors">Premium</a></li>
            <li><a href="#" class="hover:text-white transition-colors">Commands</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-headline font-semibold text-sm text-white mb-4">Legal</h4>
          <ul class="space-y-3 font-headline text-sm text-white/50">
            <li><a href="#" class="hover:text-white transition-colors">Terms of Service</a></li>
            <li><a href="#" class="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" class="hover:text-white transition-colors">Refunds</a></li>
          </ul>
        </div>
      </div>

    </div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10">
      <span class="font-headline text-xs text-white/40">© 2024 Ares Intelligence Systems.</span>
      <div class="flex items-center gap-2 font-headline text-xs text-white/40">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
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
