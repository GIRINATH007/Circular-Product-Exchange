const CATEGORY_META = {
  electronics: { label: 'Electronics', shortLabel: 'Electronics', glyph: 'EL', emoji: '💻' },
  furniture: { label: 'Furniture', shortLabel: 'Furniture', glyph: 'FU', emoji: '🪑' },
  clothing: { label: 'Clothing', shortLabel: 'Clothing', glyph: 'CL', emoji: '👕' },
  appliances: { label: 'Appliances', shortLabel: 'Appliances', glyph: 'AP', emoji: '🔌' },
  books: { label: 'Books', shortLabel: 'Books', glyph: 'BK', emoji: '📚' },
  sports: { label: 'Sports', shortLabel: 'Sports', glyph: 'SP', emoji: '⚽' },
  toys: { label: 'Toys', shortLabel: 'Toys', glyph: 'TY', emoji: '🧸' },
  automotive: { label: 'Automotive', shortLabel: 'Auto', glyph: 'AU', emoji: '🚗' },
  other: { label: 'Other', shortLabel: 'Other', glyph: 'OT', emoji: '📦' },
};

const CONDITION_META = {
  like_new: { label: 'Like New', tone: 'emerald' },
  good: { label: 'Good', tone: 'sky' },
  fair: { label: 'Fair', tone: 'amber' },
  poor: { label: 'Poor', tone: 'rose' },
};

let toastContainer = null;

function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showToast(message, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<strong>${type === 'error' ? 'Notice' : 'Update'}</strong><span>${escapeHTML(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 240);
  }, 3600);
}

export function formatPrice(value, currency = 'INR') {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
}

export function formatWholeNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function formatPercent(value, digits = 0) {
  const amount = Number(value || 0);
  return `${amount.toFixed(digits)}%`;
}

export function formatDate(value) {
  if (!value) return 'Recently added';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently added';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function slugToLabel(value = '') {
  return value
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getCategoryMeta(category) {
  return CATEGORY_META[category] || { label: slugToLabel(category || 'other'), shortLabel: slugToLabel(category || 'other'), glyph: 'OT' };
}

export function getConditionMeta(condition) {
  return CONDITION_META[condition] || { label: slugToLabel(condition || 'good'), tone: 'sky' };
}

export function renderCategoryBadge(category) {
  const meta = getCategoryMeta(category);
  return `<span class="pill pill-muted">${escapeHTML(meta.label)}</span>`;
}

export function conditionTag(condition) {
  const meta = getConditionMeta(condition);
  return `<span class="pill pill-${meta.tone}">${escapeHTML(meta.label)}</span>`;
}

export function renderMetricCard(title, value, detail, tone = 'emerald') {
  return `
    <article class="metric-card metric-card-${tone}">
      <p class="metric-card-label">${escapeHTML(title)}</p>
      <h3 class="metric-card-value">${escapeHTML(value)}</h3>
      <p class="metric-card-detail">${escapeHTML(detail)}</p>
    </article>
  `;
}

export function renderSectionIntro(eyebrow, title, description, actions = '') {
  return `
    <div class="section-intro">
      <div>
        <span class="section-eyebrow">${escapeHTML(eyebrow)}</span>
        <h2>${escapeHTML(title)}</h2>
        <p>${escapeHTML(description)}</p>
      </div>
      ${actions ? `<div class="section-intro-actions">${actions}</div>` : ''}
    </div>
  `;
}

export function renderProductVisual(product) {
  const meta = getCategoryMeta(product.category);
  const price = product.dynamicPrice || product.basePrice || 0;
  const impact = product.lifecycleData?.carbonSaved || 0;

  return `
    <div class="product-visual product-visual-${escapeHTML(product.category || 'other')}">
      <div class="product-visual-ring"></div>
      <div class="product-visual-chip">${meta.emoji || escapeHTML(meta.glyph)}</div>
      <div class="product-visual-copy">
        <span>${escapeHTML(meta.shortLabel)}</span>
        <strong>${escapeHTML(formatPrice(price))}</strong>
      </div>
      <div class="product-visual-footnote">${escapeHTML(formatWholeNumber(impact))} kg CO₂e saved</div>
    </div>
  `;
}

export function productCardHTML(product) {
  const savings = Number(product.savingsVsNew ?? product.savingsVsNewProduct ?? 0);
  const lifecycleScore = Number(product.reusePotential || 0);

  return `
    <article class="product-card" data-product-id="${escapeHTML(product.id)}" tabindex="0" role="button" aria-label="Open ${escapeHTML(product.title)}">
      ${renderProductVisual(product)}
      <div class="product-card-body">
        <div class="product-card-topline">
          ${conditionTag(product.condition)}
          ${renderCategoryBadge(product.category)}
        </div>
        <h3 class="product-card-title">${escapeHTML(product.title)}</h3>
        <p class="product-card-description">${escapeHTML(product.description || 'Lifecycle-aware listing ready for its next owner.')}</p>
        <div class="product-card-price-row">
          <div>
            <strong>${escapeHTML(formatPrice(product.dynamicPrice || product.basePrice))}</strong>
            ${product.dynamicPrice && product.dynamicPrice !== product.basePrice
              ? `<span>${escapeHTML(formatPrice(product.basePrice))}</span>`
              : ''}
          </div>
          <span class="product-card-score">${escapeHTML(formatWholeNumber(lifecycleScore))} reuse score</span>
        </div>
        <div class="product-card-footer">
          <span>${escapeHTML(formatWholeNumber(product.lifecycleData?.carbonSaved || 0))} kg CO2e saved</span>
          <span>${savings > 0 ? `${escapeHTML(formatPercent(savings, 0))} below new` : escapeHTML(formatDate(product.createdAt))}</span>
        </div>
      </div>
    </article>
  `;
}

export function loadingHTML(message = 'Loading') {
  return `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

export function emptyHTML(title, subtitle, action = '') {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(subtitle)}</p>
      ${action}
    </div>
  `;
}

export function progressBarHTML(label, value, max = 100, suffix = '') {
  const ratio = max > 0 ? Math.min(100, Math.max(0, (Number(value || 0) / max) * 100)) : 0;
  return `
    <div class="progress-row">
      <div class="progress-row-header">
        <span>${escapeHTML(label)}</span>
        <strong>${escapeHTML(`${formatWholeNumber(value)}${suffix}`)}</strong>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width:${ratio}%"></div>
      </div>
    </div>
  `;
}

export function attachProductCardHandlers(onSelect) {
  document.querySelectorAll('.product-card').forEach((card) => {
    const handler = () => onSelect(card.dataset.productId);
    card.addEventListener('click', handler);
    card.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler();
      }
    });
  });
}

export function buildSelectOptions(options, placeholder) {
  const placeholderOption = placeholder ? `<option value="">${escapeHTML(placeholder)}</option>` : '';
  return placeholderOption + options.map((option) => `
    <option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>
  `).join('');
}

export const categoryOptions = Object.entries(CATEGORY_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export const conditionOptions = Object.entries(CONDITION_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));
