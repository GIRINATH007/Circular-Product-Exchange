import './styles/global.css';
import { router } from './router.js';
import { renderNavbar, attachNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderHomePage } from './pages/home.js';
import { renderLoginPage } from './pages/login.js';
import { renderRegisterPage } from './pages/register.js';
import { renderMarketplacePage } from './pages/marketplace.js';
import { renderProductDetailPage } from './pages/product-detail.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderCreateListingPage } from './pages/create-listing.js';
import { renderAnalyticsPage } from './pages/analytics.js';
import { renderLeaderboardPage } from './pages/leaderboard.js';

const app = document.getElementById('app');

// ── Back-to-top button ─────────────────────────────────────────────
function createBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.id = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
  document.body.appendChild(btn);

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
}

createBackToTop();

// ── Scroll-reveal observer ─────────────────────────────────────────
function observeRevealElements() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll(
    '.section-shell, .hero-shell, .metric-card, .product-card, .panel-card, .leaderboard-row, .auth-wrap, .dashboard-header'
  ).forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

// ── Page renderer ──────────────────────────────────────────────────
function render(pageRenderer, ...args) {
  app.innerHTML = `${renderNavbar()}<main id="page-content" class="page-shell"></main>${renderFooter()}`;
  attachNavbarEvents();

  // Page-enter animation
  const pageContent = document.getElementById('page-content');
  pageContent.classList.add('page-enter');

  pageRenderer(...args);
  window.scrollTo(0, 0);

  // Trigger scroll-reveal after content renders
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      observeRevealElements();
      pageContent.classList.add('page-enter-active');
    });
  });
}

router
  .on('/', () => render(renderHomePage))
  .on('/login', () => render(renderLoginPage))
  .on('/register', () => render(renderRegisterPage))
  .on('/marketplace', () => render(renderMarketplacePage))
  .on('/product/:id', (id) => render(renderProductDetailPage, id))
  .on('/dashboard', () => render(renderDashboardPage))
  .on('/create-listing', () => render(renderCreateListingPage))
  .on('/analytics', () => render(renderAnalyticsPage))
  .on('/leaderboard', () => render(renderLeaderboardPage));

router.resolve();
