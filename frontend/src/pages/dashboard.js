// ─── Dashboard Page ─────────────────────────────────────────────────
import { api } from '../api.js';
import { router } from '../router.js';
import { formatPrice, productCardHTML, loadingHTML, emptyHTML, showToast } from '../utils.js';

export async function renderDashboardPage() {
  if (!api.isLoggedIn()) { router.navigate('/login'); return; }

  const app = document.getElementById('page-content');
  app.innerHTML = `<div class="container page">${loadingHTML('Loading dashboard...')}</div>`;

  try {
    const [profile, progress] = await Promise.all([
      api.getProfile(),
      api.getMyProgress().catch(() => null),
    ]);

    const initials = (profile.displayName || 'U').charAt(0).toUpperCase();
    const badges = progress?.earnedBadges || [];
    const myProducts = [];
    const myTransactions = [];

    // Try to load user's products
    try {
      const data = await api.listProducts({ page: 1, limit: 50 });
      (data.products || []).forEach(p => {
        if (p.sellerId === profile.userId) myProducts.push(p);
      });
    } catch {}

    app.innerHTML = `
      <div class="container page">
        <div class="dashboard-header">
          <div class="dashboard-avatar">${initials}</div>
          <div class="dashboard-info" style="flex:1">
            <h2>${profile.displayName}</h2>
            <p class="text-secondary">${profile.email} · ${profile.role}</p>
            <div class="flex gap-2 mt-1" style="flex-wrap:wrap">
              <span class="tag tag-green">🌱 Score: ${profile.sustainabilityScore || 0}</span>
              <span class="tag tag-purple">⭐ Points: ${profile.totalPoints || 0}</span>
              <span class="tag tag-blue">🏆 ${badges.length} Badges</span>
            </div>
          </div>
        </div>

        ${badges.length > 0 ? `
          <div class="section-header"><h2>🏆 My Badges</h2></div>
          <div class="flex gap-2 mb-4" style="flex-wrap:wrap">
            ${badges.map(b => `
              <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:8px">
                <span style="font-size:1.5rem">${b.icon}</span>
                <div>
                  <div style="font-weight:600;font-size:0.85rem">${b.name}</div>
                  <div class="text-muted" style="font-size:0.75rem">${b.tier}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="section-header">
          <h2>📦 My Listings</h2>
          <a href="/create-listing" data-link class="btn btn-primary btn-sm">+ New Listing</a>
        </div>
        <div id="my-listings-grid" class="grid-3 mb-4">
          ${myProducts.length > 0
            ? myProducts.map(p => productCardHTML(p)).join('')
            : emptyHTML('📦', 'No listings yet', 'Start selling sustainable products!')}
        </div>
      </div>
    `;

    // Click handlers for product cards
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        router.navigate(`/product/${card.dataset.productId}`);
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
    app.innerHTML = `<div class="container page">${emptyHTML('⚠️', 'Error loading dashboard', err.message)}</div>`;
  }
}
