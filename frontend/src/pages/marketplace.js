// ─── Marketplace Page ───────────────────────────────────────────────
import { api } from '../api.js';
import { router } from '../router.js';
import { productCardHTML, loadingHTML, emptyHTML, showToast } from '../utils.js';

export async function renderMarketplacePage() {
  const app = document.getElementById('page-content');

  // Parse query params for pre-filtering
  const params = new URLSearchParams(window.location.search);
  const initCategory = params.get('category') || '';

  app.innerHTML = `
    <div class="container page">
      <div class="section-header">
        <h2>🛒 Marketplace</h2>
      </div>
      <div class="filter-bar">
        <input type="text" id="filter-search" class="input" placeholder="Search products..." />
        <select id="filter-category" class="input">
          <option value="">All Categories</option>
          <option value="electronics">💻 Electronics</option>
          <option value="furniture">🪑 Furniture</option>
          <option value="clothing">👕 Clothing</option>
          <option value="appliances">🔌 Appliances</option>
          <option value="books">📚 Books</option>
          <option value="sports">⚽ Sports</option>
          <option value="toys">🧸 Toys</option>
          <option value="automotive">🚗 Automotive</option>
          <option value="other">📦 Other</option>
        </select>
        <select id="filter-condition" class="input">
          <option value="">All Conditions</option>
          <option value="like_new">Like New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
        <button id="filter-apply" class="btn btn-primary btn-sm">Search</button>
      </div>
      <div id="products-grid" class="grid-3">${loadingHTML('Loading products...')}</div>
      <div id="pagination" class="flex justify-between items-center mt-3" style="display:none">
        <button id="prev-page" class="btn btn-secondary btn-sm">← Previous</button>
        <span id="page-info" class="text-secondary"></span>
        <button id="next-page" class="btn btn-secondary btn-sm">Next →</button>
      </div>
    </div>
  `;

  if (initCategory) document.getElementById('filter-category').value = initCategory;

  let currentPage = 1;
  const limit = 12;

  async function loadProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = loadingHTML('Loading products...');

    try {
      const category = document.getElementById('filter-category').value;
      const condition = document.getElementById('filter-condition').value;
      const params = { page: currentPage, limit };
      if (category) params.category = category;
      if (condition) params.condition = condition;

      const data = await api.listProducts(params);
      const products = data.products || [];

      if (products.length === 0) {
        grid.innerHTML = emptyHTML('🔍', 'No products found', 'Try adjusting your filters');
        document.getElementById('pagination').style.display = 'none';
        return;
      }

      grid.innerHTML = products.map(p => productCardHTML(p)).join('');

      // Pagination
      const totalPages = Math.ceil((data.total || 0) / limit);
      const pagination = document.getElementById('pagination');
      if (totalPages > 1) {
        pagination.style.display = 'flex';
        document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prev-page').disabled = currentPage <= 1;
        document.getElementById('next-page').disabled = currentPage >= totalPages;
      } else {
        pagination.style.display = 'none';
      }

      // Click handlers for product cards
      grid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
          router.navigate(`/product/${card.dataset.productId}`);
        });
      });
    } catch (err) {
      grid.innerHTML = emptyHTML('⚠️', 'Error loading products', err.message);
    }
  }

  document.getElementById('filter-apply').addEventListener('click', () => {
    currentPage = 1;
    loadProducts();
  });
  document.getElementById('filter-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { currentPage = 1; loadProducts(); }
  });
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; loadProducts(); }
  });
  document.getElementById('next-page').addEventListener('click', () => {
    currentPage++; loadProducts();
  });

  loadProducts();
}
