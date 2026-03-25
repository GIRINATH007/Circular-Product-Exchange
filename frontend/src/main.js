// ─── Main Entry Point ───────────────────────────────────────────────
import './styles/global.css';
import { router } from './router.js';
import { renderNavbar, attachNavbarEvents } from './components/navbar.js';
import { renderHomePage } from './pages/home.js';
import { renderLoginPage } from './pages/login.js';
import { renderRegisterPage } from './pages/register.js';
import { renderMarketplacePage } from './pages/marketplace.js';
import { renderProductDetailPage } from './pages/product-detail.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderCreateListingPage } from './pages/create-listing.js';
import { renderAnalyticsPage } from './pages/analytics.js';
import { renderLeaderboardPage } from './pages/leaderboard.js';

// App shell
const app = document.getElementById('app');

function render(pageRenderer, ...args) {
  // Re-render navbar on every page change
  const navbarHTML = renderNavbar();
  app.innerHTML = navbarHTML + '<div id="page-content"></div>';
  attachNavbarEvents();
  // Render the page
  pageRenderer(...args);
  // Scroll to top
  window.scrollTo(0, 0);
}

// Register routes
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

// Initial page load
router.resolve();
