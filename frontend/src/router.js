// ─── Client-side Router ─────────────────────────────────────────────
class Router {
  constructor() {
    this.routes = {};
    this.currentPage = null;
    window.addEventListener('popstate', () => this.resolve());
  }

  on(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  navigate(path) {
    if (window.location.pathname === path) return;
    window.history.pushState({}, '', path);
    this.resolve();
  }

  resolve() {
    const path = window.location.pathname;

    // Exact match
    if (this.routes[path]) {
      this.currentPage = path;
      this.routes[path]();
      return;
    }

    // Dynamic match (e.g., /product/:id)
    for (const route of Object.keys(this.routes)) {
      const regex = new RegExp('^' + route.replace(/:([^/]+)/g, '([^/]+)') + '$');
      const match = path.match(regex);
      if (match) {
        this.currentPage = route;
        this.routes[route](...match.slice(1));
        return;
      }
    }

    // 404 → redirect to home
    this.navigate('/');
  }
}

export const router = new Router();

// Intercept link clicks for SPA navigation
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-link]');
  if (link) {
    e.preventDefault();
    router.navigate(link.getAttribute('href'));
  }
});
