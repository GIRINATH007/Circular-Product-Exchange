// ─── Home / Landing Page ────────────────────────────────────────────
import { api } from '../api.js';
import { router } from '../router.js';
import { formatNumber, loadingHTML } from '../utils.js';

export async function renderHomePage() {
  const app = document.getElementById('page-content');
  app.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <h1>Give Products a Second Life</h1>
        <p>The sustainable marketplace with lifecycle-aware dynamic pricing. Buy and sell refurbished products while tracking your environmental impact.</p>
        <div class="hero-actions">
          <a href="/marketplace" data-link class="btn btn-primary btn-lg">🛒 Browse Marketplace</a>
          ${api.isLoggedIn()
            ? '<a href="/create-listing" data-link class="btn btn-secondary btn-lg">📦 List a Product</a>'
            : '<a href="/register" data-link class="btn btn-secondary btn-lg">🌱 Join Now</a>'}
        </div>
      </div>
    </section>

    <section class="container mt-4">
      <div class="grid-4" id="stats-grid">${loadingHTML()}</div>
    </section>

    <section class="container mt-4">
      <div class="section-header">
        <h2>🔄 How It Works</h2>
      </div>
      <div class="grid-3">
        <div class="card how-it-works-step">
          <div class="step-number">1</div>
          <h3>List Your Product</h3>
          <p>Add lifecycle data — our engine calculates the sustainability score and dynamic price.</p>
        </div>
        <div class="card how-it-works-step">
          <div class="step-number">2</div>
          <h3>Smart Pricing</h3>
          <p>Our algorithm factors in condition, reuse potential, carbon savings, and market demand.</p>
        </div>
        <div class="card how-it-works-step">
          <div class="step-number">3</div>
          <h3>Earn & Impact</h3>
          <p>Every exchange earns sustainability points, badges, and contributes to carbon reduction.</p>
        </div>
      </div>
    </section>

    <section class="container mt-4 mb-4">
      <div class="section-header">
        <h2>📂 Browse Categories</h2>
        <a href="/marketplace" data-link class="btn btn-secondary btn-sm">View All →</a>
      </div>
      <div class="grid-3" id="categories-grid">${loadingHTML()}</div>
    </section>
  `;

  // Load stats
  try {
    const data = await api.getGlobalAnalytics();
    const a = data.analytics || data;
    document.getElementById('stats-grid').innerHTML = `
      <div class="card stat-card">
        <div class="stat-icon">🌍</div>
        <div class="stat-value">${formatNumber(a.totalCarbonSaved || 0)}</div>
        <div class="stat-label">kg CO₂ Saved</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${formatNumber(a.totalExchanges || 0)}</div>
        <div class="stat-label">Products Exchanged</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${formatNumber(a.totalUsers || 0)}</div>
        <div class="stat-label">Active Users</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${formatNumber(a.totalWasteReduced || 0)}</div>
        <div class="stat-label">kg Waste Reduced</div>
      </div>
    `;
  } catch { /* Silent fail, stats not critical */ }

  // Load categories
  try {
    const categories = await api.getCategories();
    document.getElementById('categories-grid').innerHTML = categories.slice(0, 6).map(cat => `
      <div class="card card-hover category-card" data-category="${cat.id}">
        <div class="category-icon">${cat.icon}</div>
        <div class="category-name">${cat.name}</div>
        <div class="category-count">${cat.count} listings</div>
      </div>
    `).join('');

    // Click to navigate to marketplace with filter
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.category;
        router.navigate(`/marketplace?category=${cat}`);
      });
    });
  } catch { /* Silent fail */ }
}
