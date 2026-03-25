// ─── Product Detail Page ────────────────────────────────────────────
import { api } from '../api.js';
import { router } from '../router.js';
import { formatPrice, conditionTag, categoryIcons, loadingHTML, showToast } from '../utils.js';

export async function renderProductDetailPage(productId) {
  const app = document.getElementById('page-content');
  app.innerHTML = `<div class="container page">${loadingHTML('Loading product...')}</div>`;

  try {
    const product = await api.getProduct(productId);
    const icon = categoryIcons[product.category] || '📦';
    const bd = product.pricingBreakdown || {};
    const lc = product.lifecycleData || {};
    const user = api.getUser();
    const isOwner = user && user.userId === product.sellerId;

    app.innerHTML = `
      <div class="container page">
        <a href="/marketplace" data-link class="btn btn-secondary btn-sm mb-3">← Back to Marketplace</a>
        <div class="grid-2" style="gap:32px">
          <div>
            <div class="card" style="padding:0;overflow:hidden">
              <div class="product-card-image" style="height:340px;font-size:6rem">${icon}</div>
            </div>
            <div class="card mt-2" style="padding:24px">
              <h3 style="margin-bottom:16px">♻️ Lifecycle Data</h3>
              <div class="sustainability-meter">
                ${meterRow('Refurbishment', lc.refurbishmentQuality || 0, 'green')}
                ${meterRow('Recyclability', lc.materialRecyclability || 0, 'blue')}
                ${meterRow('Reuse Potential', product.reusePotential || 0, 'purple')}
                ${meterRow('Usage', Math.min(100, (lc.usageMonths || 0) * 2), 'amber')}
              </div>
              <div class="mt-2 flex justify-between" style="font-size:0.85rem">
                <span class="text-secondary">🌱 Carbon Saved: <strong class="text-accent">${(lc.carbonSaved || 0).toFixed(1)} kg CO₂</strong></span>
                <span class="text-secondary">Expected Reuse Cycles: <strong>${lc.expectedReuseCycles || 0}</strong></span>
              </div>
            </div>
          </div>

          <div>
            <div class="card" style="padding:28px">
              <div class="flex items-center gap-2 mb-2">
                ${conditionTag(product.condition)}
                <span class="tag tag-purple">${product.category}</span>
                ${product.status === 'sold' ? '<span class="tag tag-red">Sold</span>' : ''}
              </div>
              <h1 style="font-size:1.8rem;margin-bottom:8px">${product.title}</h1>
              <p class="text-secondary mb-3">${product.description || 'No description provided.'}</p>
              <p class="text-muted" style="font-size:0.85rem;margin-bottom:16px">Listed by <strong>${product.sellerName || 'Unknown'}</strong></p>

              <div class="pricing-breakdown mb-3">
                <h4 style="margin-bottom:12px">💰 Dynamic Pricing Breakdown</h4>
                ${pricingRow('Base Price', formatPrice(product.basePrice))}
                ${pricingRow('Lifecycle Multiplier', 'x' + (bd.lifecycleMultiplier || 1).toFixed(3))}
                ${pricingRow('Demand Factor', 'x' + (bd.demandFactor || 1).toFixed(3))}
                ${pricingRow('Sustainability Discount', '-' + ((bd.sustainabilityDiscount || 0) * 100).toFixed(1) + '%')}
                ${bd.timeDecay ? pricingRow('Time Decay', '-' + (bd.timeDecay * 100).toFixed(1) + '%') : ''}
                <div class="pricing-row total">
                  <span>Final Price</span>
                  <span>${formatPrice(product.dynamicPrice || product.basePrice)}</span>
                </div>
              </div>

              ${product.savingsVsNewProduct ? `
                <div class="tag tag-green" style="padding:8px 14px;font-size:0.9rem;margin-bottom:16px">
                  🌍 ${product.savingsVsNewProduct.toFixed(0)}% savings vs buying new
                </div>
              ` : ''}

              ${product.status === 'active' && !isOwner && api.isLoggedIn() ? `
                <button id="btn-purchase" class="btn btn-primary btn-full btn-lg">
                  🛒 Purchase for ${formatPrice(product.dynamicPrice || product.basePrice)}
                </button>
              ` : ''}
              ${!api.isLoggedIn() ? `
                <a href="/login" data-link class="btn btn-primary btn-full btn-lg">Sign in to Purchase</a>
              ` : ''}
              ${isOwner ? `
                <button id="btn-delete" class="btn btn-danger btn-full">🗑️ Archive this listing</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Purchase handler
    const purchaseBtn = document.getElementById('btn-purchase');
    if (purchaseBtn) {
      purchaseBtn.addEventListener('click', async () => {
        purchaseBtn.disabled = true;
        purchaseBtn.textContent = 'Processing...';
        try {
          const result = await api.purchaseProduct(productId);
          showToast(`${result.message} +${result.pointsEarned} points!`, 'success');
          if (result.newBadges && result.newBadges.length > 0) {
            result.newBadges.forEach(b => showToast(`🏆 New badge: ${b.name}!`, 'info'));
          }
          router.navigate('/dashboard');
        } catch (err) {
          showToast(err.message, 'error');
          purchaseBtn.disabled = false;
          purchaseBtn.textContent = `🛒 Purchase for ${formatPrice(product.dynamicPrice)}`;
        }
      });
    }

    // Delete handler
    const deleteBtn = document.getElementById('btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        try {
          await api.deleteProduct(productId);
          showToast('Listing archived', 'success');
          router.navigate('/dashboard');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  } catch (err) {
    app.innerHTML = `<div class="container page">${loadingHTML('Error: ' + err.message)}</div>`;
  }
}

function meterRow(label, value, color) {
  return `<div class="meter-row">
    <span class="meter-label">${label}</span>
    <div class="meter-bar"><div class="meter-fill meter-${color}" style="width:${value}%"></div></div>
    <span style="width:40px;text-align:right;font-size:0.8rem;font-weight:600">${value}%</span>
  </div>`;
}

function pricingRow(label, value) {
  return `<div class="pricing-row"><span class="text-secondary">${label}</span><span>${value}</span></div>`;
}
