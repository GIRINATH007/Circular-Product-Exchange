import { api } from '../api.js';
import { router } from '../router.js';

export function renderNavbar() {
  const path = window.location.pathname;
  const loggedIn = api.isLoggedIn();
  const user = api.getUser();
  const firstName = (user?.displayName || 'Guest').split(' ')[0];

  const link = (href, label) => `
    <a href="${href}" data-link class="nav-link ${path === href ? 'active' : ''}">${label}</a>
  `;

  return `
    <header class="topbar">
      <div class="container">
        <div class="topbar-shell">
          <a href="/" data-link class="brand" aria-label="CircularX home">
            <span class="brand-mark">CX</span>
            <span class="brand-copy">
              <strong>CircularX</strong>
              <span>Lifecycle-led exchange marketplace</span>
            </span>
          </a>

          <nav class="nav-links" id="nav-menu" aria-label="Primary">
            ${link('/', 'Home')}
            ${link('/marketplace', 'Marketplace')}
            ${link('/analytics', 'Impact')}
            ${link('/leaderboard', 'Community')}
          </nav>

          <div class="nav-actions">
            ${loggedIn ? `
              <span class="pill pill-muted">Signed in as ${firstName}</span>
              ${link('/dashboard', 'Dashboard')}
              ${user?.role === 'seller' ? '<a href="/create-listing" data-link class="btn btn-primary btn-sm">Create Listing</a>' : ''}
              <button id="btn-logout" class="btn btn-secondary btn-sm" type="button">Logout</button>
            ` : `
              <a href="/login" data-link class="btn btn-secondary btn-sm">Sign In</a>
              <a href="/register" data-link class="btn btn-primary btn-sm">Get Started</a>
            `}
          </div>

          <button class="nav-toggle" id="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
        </div>
      </div>
    </header>
  `;
}

export function attachNavbarEvents() {
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      api.logout();
      router.navigate('/');
    });
  }

  // Mobile hamburger toggle
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('nav-open');
      toggle.classList.toggle('nav-toggle-active');
    });
  }
}
