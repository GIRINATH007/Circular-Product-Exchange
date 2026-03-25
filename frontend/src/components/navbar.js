// ─── Navbar Component ───────────────────────────────────────────────
import { api } from '../api.js';
import { router } from '../router.js';

export function renderNavbar() {
  const loggedIn = api.isLoggedIn();
  const user = api.getUser();
  const path = window.location.pathname;

  const link = (href, label) =>
    `<a href="${href}" data-link class="${path === href ? 'active' : ''}">${label}</a>`;

  return `
  <nav class="navbar" id="main-navbar">
    <div class="navbar-inner">
      <a href="/" data-link class="navbar-brand">♻️ <span>Circular</span>Exchange</a>
      <div class="navbar-links">
        ${link('/', 'Home')}
        ${link('/marketplace', 'Marketplace')}
        ${link('/analytics', 'Analytics')}
        ${link('/leaderboard', 'Leaderboard')}
        ${loggedIn ? `
          ${link('/dashboard', 'Dashboard')}
          ${link('/create-listing', '+ List')}
          <button id="btn-logout" class="btn btn-sm btn-secondary">Logout</button>
        ` : `
          ${link('/login', 'Login')}
          <a href="/register" data-link class="btn btn-sm btn-primary">Sign Up</a>
        `}
      </div>
    </div>
  </nav>
  <div class="navbar-spacer"></div>`;
}

export function attachNavbarEvents() {
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      api.logout();
      router.navigate('/');
    });
  }
}
