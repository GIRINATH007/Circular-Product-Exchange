// ─── Create Listing Page ────────────────────────────────────────────
import { api } from '../api.js';
import { router } from '../router.js';
import { showToast } from '../utils.js';

export function renderCreateListingPage() {
  if (!api.isLoggedIn()) { router.navigate('/login'); return; }

  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="container page" style="max-width:720px;margin:0 auto;padding-top:32px">
      <h2 style="margin-bottom:8px">📦 List a Product</h2>
      <p class="text-secondary mb-3">Add lifecycle data and let our engine calculate the sustainable dynamic price.</p>

      <form id="listing-form" class="card" style="padding:32px">
        <div class="auth-form">
          <div class="grid-2">
            <div class="input-group">
              <label for="lst-title">Product Title *</label>
              <input type="text" id="lst-title" class="input" placeholder="e.g. Refurbished Dell Laptop" required />
            </div>
            <div class="input-group">
              <label for="lst-category">Category *</label>
              <select id="lst-category" class="input" required>
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
            </div>
          </div>

          <div class="input-group">
            <label for="lst-description">Description</label>
            <textarea id="lst-description" class="input" placeholder="Describe your product's condition, history, and features..." rows="3"></textarea>
          </div>

          <div class="grid-2">
            <div class="input-group">
              <label for="lst-condition">Condition *</label>
              <select id="lst-condition" class="input" required>
                <option value="like_new">Like New</option>
                <option value="good" selected>Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div class="input-group">
              <label for="lst-price">Base Price ($) *</label>
              <input type="number" id="lst-price" class="input" placeholder="0.00" step="0.01" min="1" required />
            </div>
          </div>

          <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:4px">
            <h3 style="margin-bottom:4px">🔬 Lifecycle Data</h3>
            <p class="text-secondary" style="font-size:0.85rem;margin-bottom:16px">This data powers the dynamic pricing engine.</p>
          </div>

          <div class="grid-2">
            <div class="input-group">
              <label for="lst-mfg-impact">Manufacturing Impact (CO₂ kg)</label>
              <input type="number" id="lst-mfg-impact" class="input" placeholder="100" value="50" min="0" />
            </div>
            <div class="input-group">
              <label for="lst-usage">Usage Months</label>
              <input type="number" id="lst-usage" class="input" placeholder="12" value="12" min="0" />
            </div>
          </div>

          <div class="grid-2">
            <div class="input-group">
              <label for="lst-refurb">Refurbishment Quality (0-100)</label>
              <input type="number" id="lst-refurb" class="input" placeholder="80" value="75" min="0" max="100" />
            </div>
            <div class="input-group">
              <label for="lst-reuse-cycles">Expected Reuse Cycles</label>
              <input type="number" id="lst-reuse-cycles" class="input" placeholder="3" value="3" min="1" max="20" />
            </div>
          </div>

          <div class="grid-2">
            <div class="input-group">
              <label for="lst-recyclability">Material Recyclability (0-100)</label>
              <input type="number" id="lst-recyclability" class="input" placeholder="60" value="60" min="0" max="100" />
            </div>
            <div class="input-group">
              <label for="lst-carbon">Carbon Saved (kg CO₂, 0=auto)</label>
              <input type="number" id="lst-carbon" class="input" placeholder="0" value="0" min="0" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" id="lst-submit">
            🚀 Create Listing
          </button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('listing-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('lst-submit');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
      const product = {
        title: document.getElementById('lst-title').value,
        description: document.getElementById('lst-description').value,
        category: document.getElementById('lst-category').value,
        condition: document.getElementById('lst-condition').value,
        basePrice: parseFloat(document.getElementById('lst-price').value),
        imageUrls: [],
        lifecycleData: {
          manufacturingImpact: parseFloat(document.getElementById('lst-mfg-impact').value) || 50,
          usageMonths: parseInt(document.getElementById('lst-usage').value) || 12,
          refurbishmentQuality: parseInt(document.getElementById('lst-refurb').value) || 75,
          expectedReuseCycles: parseInt(document.getElementById('lst-reuse-cycles').value) || 3,
          materialRecyclability: parseInt(document.getElementById('lst-recyclability').value) || 60,
          carbonSaved: parseFloat(document.getElementById('lst-carbon').value) || 0,
        },
      };

      const created = await api.createProduct(product);
      showToast('Product listed! Dynamic price calculated.', 'success');
      router.navigate(`/product/${created.id}`);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '🚀 Create Listing';
    }
  });
}
