// ─── Analytics Dashboard Page ───────────────────────────────────────
import { api } from '../api.js';
import { formatNumber, formatPrice, loadingHTML, emptyHTML } from '../utils.js';

export async function renderAnalyticsPage() {
  const app = document.getElementById('page-content');
  app.innerHTML = `<div class="container page">${loadingHTML('Loading analytics...')}</div>`;

  try {
    const globalRes = await api.getGlobalAnalytics();
    const global = globalRes.analytics || globalRes;
    let personal = null;
    if (api.isLoggedIn()) {
      try {
        const pRes = await api.getPersonalAnalytics();
        personal = pRes.analytics || pRes;
      } catch {}
    }

    app.innerHTML = `
      <div class="container page">
        <div class="section-header"><h2>📊 Analytics Dashboard</h2></div>

        ${personal ? `
          <div class="tabs mb-3" id="analytics-tabs">
            <button class="tab active" data-tab="personal">My Impact</button>
            <button class="tab" data-tab="global">Global Impact</button>
          </div>
        ` : ''}

        <div id="personal-section" class="${personal ? '' : 'hidden'}">
          ${personal ? renderPersonalAnalytics(personal) : ''}
        </div>

        <div id="global-section" class="${personal ? 'hidden' : ''}">
          ${renderGlobalAnalytics(global)}
        </div>
      </div>
    `;

    // Tab switching
    if (personal) {
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const target = tab.dataset.tab;
          document.getElementById('personal-section').classList.toggle('hidden', target !== 'personal');
          document.getElementById('global-section').classList.toggle('hidden', target !== 'global');
        });
      });
    }
  } catch (err) {
    app.innerHTML = `<div class="container page">${emptyHTML('⚠️', 'Error', err.message)}</div>`;
  }
}

function renderGlobalAnalytics(g) {
  return `
    <div class="grid-4 mb-4">
      <div class="card stat-card">
        <div class="stat-icon">🌍</div>
        <div class="stat-value">${formatNumber(g.totalCarbonSaved || 0)}</div>
        <div class="stat-label">kg CO₂ Saved</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${formatNumber(g.totalExchanges || 0)}</div>
        <div class="stat-label">Products Exchanged</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${formatNumber(g.totalUsers || 0)}</div>
        <div class="stat-label">Active Users</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">🗑️</div>
        <div class="stat-value">${formatNumber(g.totalWasteReduced || 0)}</div>
        <div class="stat-label">kg Waste Reduced</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="padding:24px">
        <h3 style="margin-bottom:16px">📈 Category Distribution</h3>
        ${renderCategoryBars(g.categoryBreakdown || {})}
      </div>
      <div class="card" style="padding:24px">
        <h3 style="margin-bottom:16px">💰 Market Overview</h3>
        <div class="sustainability-meter">
          <div class="meter-row">
            <span class="meter-label">Total Listings</span>
            <div style="font-weight:700;color:var(--accent)">${g.totalProductsListed || 0}</div>
          </div>
          <div class="meter-row">
            <span class="meter-label">Waste Reduced</span>
            <div style="font-weight:700;color:var(--accent)">${(g.totalWasteReduced || 0).toFixed(1)} kg</div>
          </div>
          <div class="meter-row">
            <span class="meter-label">Active Listings</span>
            <div style="font-weight:700;color:var(--accent)">${g.activeListings || 0}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPersonalAnalytics(p) {
  return `
    <div class="grid-3 mb-4">
      <div class="card stat-card">
        <div class="stat-icon">🌱</div>
        <div class="stat-value">${(p.totalCarbonSaved || 0).toFixed(1)}</div>
        <div class="stat-label">kg CO₂ I've Saved</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">🛒</div>
        <div class="stat-value">${p.totalTransactions || 0}</div>
        <div class="stat-label">Purchases</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${p.totalPointsEarned || 0}</div>
        <div class="stat-label">Points Earned</div>
      </div>
    </div>
    <div class="card" style="padding:24px">
      <h3 style="margin-bottom:16px">📊 My Sustainability Score</h3>
      <div class="progress-bar" style="height:12px">
        <div class="progress-bar-fill" style="width:${Math.min(100, (p.sustainabilityScore || 0))}%"></div>
      </div>
      <div class="flex justify-between mt-1">
        <span class="text-muted" style="font-size:0.8rem">0</span>
        <span class="text-accent" style="font-weight:700">${p.sustainabilityScore || 0} pts</span>
        <span class="text-muted" style="font-size:0.8rem">100</span>
      </div>
    </div>
  `;
}

function renderCategoryBars(breakdown) {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return '<p class="text-muted">No data yet</p>';
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const icons = { electronics: '💻', furniture: '🪑', clothing: '👕', appliances: '🔌', books: '📚', sports: '⚽', toys: '🧸', automotive: '🚗', other: '📦' };
  return `<div class="sustainability-meter">
    ${entries.map(([cat, count]) => `
      <div class="meter-row">
        <span class="meter-label">${icons[cat] || '📦'} ${cat}</span>
        <div class="meter-bar"><div class="meter-fill meter-green" style="width:${(count / max * 100)}%"></div></div>
        <span style="width:30px;text-align:right;font-size:0.8rem;font-weight:600">${count}</span>
      </div>
    `).join('')}
  </div>`;
}
