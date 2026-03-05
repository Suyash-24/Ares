// ── Simple SPA Router ──
class Router {
  constructor() {
    this.routes = [];
    this.currentGuildId = null;
    window.addEventListener('popstate', () => this.resolve());
  }

  on(pattern, handler) {
    // Convert '/guilds/:guildId/overview' → regex
    const keys = [];
    const regex = new RegExp(
      '^' + pattern.replace(/:(\w+)/g, (_, key) => { keys.push(key); return '([^/]+)'; }) + '$'
    );
    this.routes.push({ regex, keys, handler });
    return this;
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    this.resolve();
  }

  resolve() {
    const path = window.location.pathname;
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.keys.forEach((key, i) => { params[key] = match[i + 1]; });
        if (params.guildId) this.currentGuildId = params.guildId;
        route.handler(params);
        return;
      }
    }
    // Fallback
    this.routes[0]?.handler({});
  }
}

const router = new Router();
