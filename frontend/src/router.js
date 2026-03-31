// Client-side router
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
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath === path) return;
    window.history.pushState({}, '', path);
    this.resolve();
  }

  resolve() {
    const path = window.location.pathname;

    if (this.routes[path]) {
      this.currentPage = path;
      this.routes[path]();
      return;
    }

    for (const route of Object.keys(this.routes)) {
      const regex = new RegExp(`^${route.replace(/:([^/]+)/g, '([^/]+)')}$`);
      const match = path.match(regex);
      if (match) {
        this.currentPage = route;
        this.routes[route](...match.slice(1).map(decodeURIComponent));
        return;
      }
    }

    this.navigate('/');
  }
}

export const router = new Router();

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-link]');
  if (!link) return;

  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    link.target === '_blank' ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const href = link.getAttribute('href');
  if (!href || href.startsWith('http')) return;

  event.preventDefault();
  router.navigate(href);
});
