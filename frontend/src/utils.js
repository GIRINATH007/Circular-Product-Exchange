// ─── Utility Helpers ────────────────────────────────────────────────

// Toast notification system
let toastContainer = null;

export function showToast(message, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Format currency
export function formatPrice(n) {
  return '$' + Number(n).toFixed(2);
}

// Format large numbers
export function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// Category icon mapping
export const categoryIcons = {
  electronics: '💻', furniture: '🪑', clothing: '👕',
  appliances: '🔌', books: '📚', sports: '⚽',
  toys: '🧸', automotive: '🚗', other: '📦',
};

// Condition labels
export const conditionLabels = {
  like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor'
};

// Condition styling
export function conditionTag(condition) {
  const map = { like_new: 'green', good: 'blue', fair: 'amber', poor: 'red' };
  const label = conditionLabels[condition] || condition;
  return `<span class="tag tag-${map[condition] || 'blue'}">${label}</span>`;
}

// Render a product card
export function productCardHTML(product) {
  const icon = categoryIcons[product.category] || '📦';
  const savings = product.savingsVsNewProduct
    ? `<span class="tag tag-green">🌱 ${product.savingsVsNewProduct.toFixed(0)}% saved</span>`
    : '';
  return `
    <div class="card card-hover product-card" data-product-id="${product.id}">
      <div class="product-card-image">${icon}</div>
      <div class="product-card-body">
        <div class="product-card-title">${product.title}</div>
        <div class="product-card-meta">
          ${conditionTag(product.condition)}
          <span class="tag tag-purple">${product.category}</span>
        </div>
        <div class="product-card-prices">
          <span class="dynamic-price">${formatPrice(product.dynamicPrice || product.basePrice)}</span>
          ${product.dynamicPrice && product.dynamicPrice !== product.basePrice
            ? `<span class="base-price">${formatPrice(product.basePrice)}</span>` : ''}
        </div>
        <div class="product-card-footer">
          <span class="text-secondary" style="font-size:0.8rem">♻️ Reuse: ${product.reusePotential || 0}%</span>
          ${savings}
        </div>
      </div>
    </div>`;
}

// Loading state
export function loadingHTML(msg = 'Loading...') {
  return `<div class="loading-overlay"><div class="spinner"></div><p>${msg}</p></div>`;
}

// Empty state
export function emptyHTML(icon, title, subtitle) {
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <h3>${title}</h3>
    <p>${subtitle}</p>
  </div>`;
}
