import { api } from '../api.js';
import { router } from '../router.js';
import {
  conditionTag,
  emptyHTML,
  formatDate,
  formatPercent,
  formatPrice,
  formatWholeNumber,
  getCategoryMeta,
  loadingHTML,
  renderCategoryBadge,
  showToast,
} from '../utils.js';

export async function renderProductDetailPage(productId) {
  const app = document.getElementById('page-content');
  app.innerHTML = `<div class="container page">${loadingHTML('Loading product details')}</div>`;

  try {
    const product = await api.getProduct(productId);
    const user = api.getUser();
    const isOwner = Boolean(user && user.userId === product.sellerId);
    const category = getCategoryMeta(product.category);
    const breakdown = product.pricingBreakdown || {};
    const lifecycle = product.lifecycleData || {};
    const finalPrice = product.dynamicPrice || product.basePrice;
    const savingsVsNew = Number(product.savingsVsNew ?? product.savingsVsNewProduct ?? 0);

    app.innerHTML = `
      <div class="container page stack-lg">
        <div class="action-row">
          <a href="/marketplace" data-link class="btn btn-secondary">Back to Marketplace</a>
          <span class="pill pill-muted">Listed ${formatDate(product.createdAt)}</span>
        </div>

        <div class="split-layout">
          <section class="card detail-card stack-lg">
            <div class="detail-header">
              <div class="action-row">
                ${conditionTag(product.condition)}
                ${renderCategoryBadge(product.category)}
                <span class="pill pill-gold">${category.label}</span>
              </div>
              <h1 class="detail-title">${product.title}</h1>
              <p>${product.description || 'No additional description was provided for this listing.'}</p>
              <div class="detail-price-meta">
                <strong class="detail-price">${formatPrice(finalPrice)}</strong>
                ${product.dynamicPrice && product.dynamicPrice !== product.basePrice
                  ? `<s>${formatPrice(product.basePrice)}</s>`
                  : ''}
                ${savingsVsNew > 0 ? `<span class="pill pill-emerald">${formatPercent(savingsVsNew)} below estimated new price</span>` : ''}
              </div>
            </div>

            <div class="panel-card">
              <h3>Lifecycle profile</h3>
              <div class="meter-list mt-2">
                ${meterRow('Refurbishment quality', lifecycle.refurbishmentQuality || 0)}
                ${meterRow('Material recyclability', lifecycle.materialRecyclability || 0)}
                ${meterRow('Reuse potential', product.reusePotential || 0)}
                ${meterRow('Usage efficiency', Math.max(0, 100 - Math.min(100, (lifecycle.usageMonths || 0) * 2)))}
              </div>
            </div>

            <div class="panel-card">
              <h3>Dynamic pricing breakdown</h3>
              <div class="data-list mt-2">
                ${dataRow('Base listing price', formatPrice(product.basePrice))}
                ${dataRow('Lifecycle multiplier', `x${Number(breakdown.lifecycleMultiplier || 1).toFixed(2)}`)}
                ${dataRow('Demand factor', `x${Number(breakdown.demandFactor || 1).toFixed(2)}`)}
                ${dataRow('Sustainability discount', formatPercent(Number(breakdown.sustainabilityDiscount || 0) * 100, 1))}
                ${dataRow('Time decay', formatPercent(Number(breakdown.timeDecay || 0) * 100, 1))}
                ${dataRow('Lifecycle score', formatWholeNumber(breakdown.lifecycleScore || product.reusePotential || 0))}
                ${dataRow('Final adaptive price', formatPrice(finalPrice))}
              </div>
            </div>
          </section>

          <aside class="card sidebar-card stack-lg">
            <div class="panel-card">
              <h3>Exchange summary</h3>
              <div class="data-list mt-2">
                ${dataRow('Seller', product.sellerName || 'Marketplace member')}
                ${dataRow('Carbon saved', `${formatWholeNumber(lifecycle.carbonSaved || 0)} kg CO2e`)}
                ${dataRow('Expected reuse cycles', formatWholeNumber(lifecycle.expectedReuseCycles || 0))}
                ${dataRow('Manufacturing impact', `${formatWholeNumber(lifecycle.manufacturingImpact || 0)} kg CO2e`)}
                ${lifecycle.weightKg ? dataRow('Product weight', `${lifecycle.weightKg} kg`) : ''}
                ${dataRow('Status', product.status || 'active')}
              </div>
              <details class="mt-2" style="font-size:0.82rem;color:var(--text-soft)">
                <summary style="cursor:pointer;font-weight:600;color:var(--text-muted)">How was CO2 calculated?</summary>
                <p class="mt-1">${lifecycle.carbonSource || 'Estimated via avoided-burden LCA method (ISO 14044). Manufacturing baselines from EPA WARM Model, EU Ecodesign, and industry LCA data.'}</p>
              </details>
            </div>

            <div class="panel-card">
              <h3>Next action</h3>
              <p class="mt-1">Use the sustainability profile and pricing breakdown to make a more confident circular purchase decision.</p>
              <div class="stack-md mt-3">
                ${product.status === 'active' && !isOwner && api.isLoggedIn()
                  ? `<button id="btn-purchase" class="btn btn-primary btn-full" type="button">Purchase for ${formatPrice(finalPrice)}</button>`
                  : ''}
                ${!api.isLoggedIn()
                  ? '<a href="/login" data-link class="btn btn-primary btn-full">Sign in to purchase</a>'
                  : ''}
                ${isOwner
                  ? '<button id="btn-delete" class="btn btn-danger btn-full" type="button">Archive Listing</button>'
                  : ''}
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    const purchaseButton = document.getElementById('btn-purchase');
    if (purchaseButton) {
      purchaseButton.addEventListener('click', async () => {
        purchaseButton.disabled = true;
        purchaseButton.textContent = 'Processing purchase';

        try {
          const result = await api.purchaseProduct(productId);
          showToast(`${result.message} ${result.pointsEarned} points earned.`, 'success');
          router.navigate('/dashboard');
        } catch (error) {
          purchaseButton.disabled = false;
          purchaseButton.textContent = `Purchase for ${formatPrice(finalPrice)}`;
          showToast(error.message || 'Purchase failed.', 'error');
        }
      });
    }

    const deleteButton = document.getElementById('btn-delete');
    if (deleteButton) {
      deleteButton.addEventListener('click', async () => {
        deleteButton.disabled = true;
        deleteButton.textContent = 'Archiving listing';

        try {
          await api.deleteProduct(productId);
          showToast('Listing archived successfully.', 'success');
          router.navigate('/dashboard');
        } catch (error) {
          deleteButton.disabled = false;
          deleteButton.textContent = 'Archive Listing';
          showToast(error.message || 'Unable to archive listing.', 'error');
        }
      });
    }
  } catch (error) {
    app.innerHTML = `<div class="container page">${emptyHTML('Product unavailable', error.message || 'We could not load this listing.')}</div>`;
  }
}

function meterRow(label, value) {
  return `
    <div class="meter-row">
      <div class="meter-row-header">
        <span>${label}</span>
        <strong>${formatWholeNumber(value)} / 100</strong>
      </div>
      <div class="meter-track">
        <div class="meter-fill" style="width:${Math.max(0, Math.min(100, Number(value || 0)))}%"></div>
      </div>
    </div>
  `;
}

function dataRow(label, value) {
  return `
    <div class="data-row">
      <span class="subtle">${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}
