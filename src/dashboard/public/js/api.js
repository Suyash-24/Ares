// ── API helper ──
const API = {
  async get(url) {
    const res = await fetch(url);
    if (res.status === 401) {
      if (url.startsWith('/auth/')) return null;
      window.location.href = '/auth/login';
      return null;
    }
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async post(url, body = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.status === 401) {
      if (url.startsWith('/auth/')) return null;
      window.location.href = '/auth/login';
      return null;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API error: ${res.status}`);
    }
    return res.json();
  },

  async patch(url, body = {}) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.status === 401) {
      if (url.startsWith('/auth/')) return null;
      window.location.href = '/auth/login';
      return null;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API error: ${res.status}`);
    }
    return res.json();
  }
};

// ── Toast system ──
(function initToasts() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);

  window.toast = (message, type = 'info') => {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
  };
})();

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function discordAvatar(id, hash, size = 64) {
  if (!hash) return `https://cdn.discordapp.com/embed/avatars/${parseInt(id) % 5}.png`;
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.webp?size=${size}`;
}

function guildIcon(id, hash, size = 128) {
  if (!hash) return null;
  return `https://cdn.discordapp.com/icons/${id}/${hash}.webp?size=${size}`;
}
