import { api } from '../api.js';
import { router } from '../router.js';
import {
  attachProductCardHandlers,
  buildSelectOptions,
  categoryOptions,
  conditionOptions,
  emptyHTML,
  formatNumber,
  loadingHTML,
  productCardHTML,
  renderSectionIntro,
} from '../utils.js';

export async function renderMarketplacePage() {
  const app = document.getElementById('page-content');
  const query = new URLSearchParams(window.location.search);

  app.innerHTML = `
    <div class="container page stack-lg">
      <section class="section-shell">
        ${renderSectionIntro(
          'Marketplace',
          'Find refurbished products with clear lifecycle value',
          'Search listings, compare sustainability signals, and browse inventory priced by reuse potential and environmental savings.'
        )}

        <div class="filter-shell">
          <div class="filter-row">
            <div class="input-group">
              <label for="filter-search">Search</label>
              <input id="filter-search" class="input" type="search" placeholder="Search by title or description" value="${query.get('q') || ''}" />
            </div>

            <div class="input-group">
              <label for="filter-category">Category</label>
              <select id="filter-category" class="input">
                ${buildSelectOptions(categoryOptions, 'All categories')}
              </select>
            </div>

            <div class="input-group">
              <label for="filter-condition">Condition</label>
              <select id="filter-condition" class="input">
                ${buildSelectOptions(conditionOptions, 'All conditions')}
              </select>
            </div>

            <div class="input-group">
              <label for="filter-sort">Sort</label>
              <select id="filter-sort" class="input">
                ${buildSelectOptions([
                  { value: 'newest', label: 'Newest first' },
                  { value: 'price_asc', label: 'Price low to high' },
                  { value: 'price_desc', label: 'Price high to low' },
                  { value: 'sustainability', label: 'Highest reuse score' },
                ])}
              </select>
            </div>

            <button id="filter-apply" class="btn btn-primary" type="button">Apply Filters</button>
          </div>
        </div>
      </section>

      <section class="section-shell">
        <div class="section-intro">
          <div>
            <span class="section-eyebrow">Listings</span>
            <h2>Available products</h2>
            <p id="result-summary">Loading listings from the marketplace.</p>
          </div>
        </div>
        <div id="products-grid" class="grid-3">${loadingHTML('Loading marketplace listings')}</div>
        <div id="pagination" class="action-row mt-3 hidden">
          <button id="prev-page" class="btn btn-secondary" type="button">Previous</button>
          <span id="page-info" class="subtle"></span>
          <button id="next-page" class="btn btn-secondary" type="button">Next</button>
        </div>
      </section>
    </div>
  `;

  document.getElementById('filter-category').value = query.get('category') || '';
  document.getElementById('filter-condition').value = query.get('condition') || '';
  document.getElementById('filter-sort').value = query.get('sortBy') || 'newest';

  let currentPage = Number(query.get('page') || 1);
  const limit = 9;

  async function loadProducts() {
    const grid = document.getElementById('products-grid');
    const summary = document.getElementById('result-summary');
    grid.innerHTML = loadingHTML('Refreshing marketplace results');

    const params = {
      page: currentPage,
      limit,
      q: document.getElementById('filter-search').value.trim(),
      category: document.getElementById('filter-category').value,
      condition: document.getElementById('filter-condition').value,
      sortBy: document.getElementById('filter-sort').value,
    };

    Object.keys(params).forEach((key) => {
      if (!params[key]) delete params[key];
    });

    const nextQuery = new URLSearchParams({ ...params, page: String(currentPage) });
    window.history.replaceState({}, '', `/marketplace?${nextQuery.toString()}`);

    try {
      const data = await api.listProducts(params);
      const products = data.products || [];
      const total = Number(data.total || 0);

      if (!products.length) {
        summary.textContent = 'No listings matched the current filters.';
        grid.innerHTML = emptyHTML(
          'No products found',
          'Try broadening your search or clearing one of the filters.'
        );
        document.getElementById('pagination').classList.add('hidden');
        return;
      }

      summary.textContent = `${formatNumber(total)} ${total === 1 ? 'listing' : 'listings'} available across the marketplace.`;
      grid.innerHTML = products.map((product) => productCardHTML(product)).join('');
      attachProductCardHandlers((productId) => router.navigate(`/product/${productId}`));

      const totalPages = Math.max(1, Math.ceil(total / limit));
      const pagination = document.getElementById('pagination');
      pagination.classList.toggle('hidden', totalPages <= 1);
      document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
      document.getElementById('prev-page').disabled = currentPage <= 1;
      document.getElementById('next-page').disabled = currentPage >= totalPages;
    } catch (error) {
      summary.textContent = 'The marketplace could not be loaded.';
      grid.innerHTML = emptyHTML('Marketplace unavailable', error.message || 'Please try again in a moment.');
      document.getElementById('pagination').classList.add('hidden');
    }
  }

  document.getElementById('filter-apply').addEventListener('click', () => {
    currentPage = 1;
    loadProducts();
  });

  document.getElementById('filter-search').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      currentPage = 1;
      loadProducts();
    }
  });

  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    loadProducts();
  });

  document.getElementById('next-page').addEventListener('click', () => {
    currentPage += 1;
    loadProducts();
  });

  loadProducts();
}
