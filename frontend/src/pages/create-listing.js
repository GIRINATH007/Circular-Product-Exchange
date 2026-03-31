import { api } from '../api.js';
import { router } from '../router.js';
import {
  buildSelectOptions,
  categoryOptions,
  conditionOptions,
  formatPrice,
  showToast,
} from '../utils.js';

const usageIntensityOptions = [
  { value: 'light', label: 'Light use' },
  { value: 'moderate', label: 'Moderate use' },
  { value: 'heavy', label: 'Heavy use' },
];

export function renderCreateListingPage() {
  if (!api.isLoggedIn()) {
    router.navigate('/login');
    return;
  }

  if (api.getUser()?.role !== 'seller') {
    showToast('Only seller accounts can create listings.', 'error');
    router.navigate('/dashboard');
    return;
  }

  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="container page stack-lg">
      <section class="section-shell">
        <span class="section-eyebrow">Create Listing</span>
        <h1 style="font-size:3rem">List a product without guessing technical sustainability values.</h1>
        <p class="mt-2">
          You provide the details any normal seller would know. The platform estimates the lifecycle metrics behind the scenes and calculates the dynamic price after submission.
        </p>
      </section>

      <div class="split-layout">
        <section class="section-shell form-shell">
          <form id="listing-form" class="stack-lg">
            <div class="stack-md">
              <div class="section-intro">
                <div>
                  <span class="section-eyebrow">Basic Listing</span>
                  <h2>What are you selling?</h2>
                  <p>Keep the form close to real seller language so listing creation stays fast and understandable.</p>
                </div>
              </div>

              <div class="form-grid form-grid-2">
                <div class="input-group">
                  <label for="lst-title">Product title</label>
                  <input id="lst-title" class="input" type="text" placeholder="Refurbished Dell XPS 13" required />
                </div>
                <div class="input-group">
                  <label for="lst-category">Category</label>
                  <select id="lst-category" class="input" required>
                    ${buildSelectOptions(categoryOptions)}
                  </select>
                </div>
              </div>

              <div class="input-group">
                <label for="lst-description">Description</label>
                <textarea id="lst-description" class="input" placeholder="Describe the item, what's included, visible wear, and any upgrades or repairs." required></textarea>
              </div>

              <div class="form-grid form-grid-2">
                <div class="input-group">
                  <label for="lst-condition">Condition</label>
                  <select id="lst-condition" class="input" required>
                    ${buildSelectOptions(conditionOptions)}
                  </select>
                </div>
                <div class="input-group">
                  <label for="lst-price">Base price</label>
                  <input id="lst-price" class="input" type="number" min="1" step="0.01" placeholder="0.00" required />
                </div>
              </div>
            </div>

            <div class="stack-md">
              <div class="section-intro">
                <div>
                  <span class="section-eyebrow">Easy Lifecycle Inputs</span>
                  <h2>Tell us only what you actually know</h2>
                  <p>These answers are used to estimate the deeper sustainability metrics automatically.</p>
                </div>
              </div>

              <div class="form-grid form-grid-2">
                <div class="input-group">
                  <label for="lst-usage-months">Approximate age in months</label>
                  <input id="lst-usage-months" class="input" type="number" min="0" value="12" />
                  <span class="field-help">Rough age is enough. Users do not need exact technical dates.</span>
                </div>
                <div class="input-group">
                  <label for="lst-usage-intensity">Usage level</label>
                  <select id="lst-usage-intensity" class="input">
                    ${buildSelectOptions(usageIntensityOptions)}
                  </select>
                  <span class="field-help">Choose the closest everyday description.</span>
                </div>
              </div>

              <div class="form-grid form-grid-2">
                <div class="input-group">
                  <label for="lst-weight">Product weight (kg)</label>
                  <input id="lst-weight" class="input" type="number" min="0.01" step="0.01" placeholder="e.g. 1.5" />
                  <span class="field-help">Approximate weight improves carbon accuracy. Check product specs or weigh on a kitchen scale.</span>
                </div>
              </div>

              <div class="form-grid form-grid-2">
                <label class="panel-card" style="display:flex;gap:0.9rem;align-items:flex-start;cursor:pointer">
                  <input id="lst-refurbished" type="checkbox" style="margin-top:0.35rem" />
                  <div>
                    <strong>Professionally refurbished or restored</strong>
                    <p class="mt-1">Check this if the product was cleaned up, rebuilt, reconditioned, or restored for resale.</p>
                  </div>
                </label>

                <label class="panel-card" style="display:flex;gap:0.9rem;align-items:flex-start;cursor:pointer">
                  <input id="lst-repairs" type="checkbox" style="margin-top:0.35rem" />
                  <div>
                    <strong>Repairs or upgrades completed</strong>
                    <p class="mt-1">Use this when key components were repaired, replaced, or improved.</p>
                  </div>
                </label>
              </div>
            </div>

            <article class="panel-card">
              <h3>How is CO2 calculated?</h3>
              <p class="mt-1">Our estimates use the <strong>avoided-burden method</strong> from ISO 14044 lifecycle assessment standards. Each category has a research-backed CO2 baseline from published LCA studies (EPA WARM Model, EU Ecodesign, WRAP UK). Your product's weight, condition, and reuse potential adjust this baseline to produce a per-item estimate.</p>
              <p class="mt-1" style="font-size:0.82rem;color:var(--text-soft)">Sources: Apple Environmental Reports, EU JRC, EPA WARM v15, WRAP "Valuing Our Clothes", Quantis World Apparel LCA, Green Press Initiative.</p>
            </article>

            <button id="lst-submit" class="btn btn-primary btn-full" type="submit">Create Listing</button>
          </form>
        </section>

        <aside class="section-shell">
          <span class="section-eyebrow">How It Works</span>
          <h2>The system estimates the technical layer for the user</h2>
          <div class="stack-md mt-3">
            <article class="panel-card">
              <h3>No expert carbon knowledge required</h3>
              <p>The listing flow turns simple answers like condition, age, and refurbishment status into lifecycle estimates behind the scenes.</p>
            </article>
            <article class="panel-card">
              <h3>Transparency stays visible</h3>
              <p>After creation, buyers still see reuse score, carbon savings, and pricing breakdown on the product page.</p>
            </article>
            <article class="panel-card">
              <h3>Base price preview</h3>
              <p id="listing-price-preview">${formatPrice(0)}</p>
            </article>
          </div>
        </aside>
      </div>
    </div>
  `;

  const basePriceInput = document.getElementById('lst-price');
  const preview = document.getElementById('listing-price-preview');
  basePriceInput.addEventListener('input', () => {
    preview.textContent = formatPrice(basePriceInput.value || 0);
  });

  document.getElementById('listing-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('lst-submit');
    button.disabled = true;
    button.textContent = 'Creating listing';

    try {
      const payload = {
        title: document.getElementById('lst-title').value.trim(),
        description: document.getElementById('lst-description').value.trim(),
        category: document.getElementById('lst-category').value,
        condition: document.getElementById('lst-condition').value,
        basePrice: Number(document.getElementById('lst-price').value),
        imageUrls: [],
        lifecycleHints: {
          usageMonths: Number(document.getElementById('lst-usage-months').value || 0),
          usageIntensity: document.getElementById('lst-usage-intensity').value,
          refurbished: document.getElementById('lst-refurbished').checked,
          hasRepairs: document.getElementById('lst-repairs').checked,
          weightKg: Number(document.getElementById('lst-weight').value || 0),
        },
      };

      if (payload.title.length < 3 || payload.description.length < 10 || !payload.basePrice) {
        throw new Error('Please complete the listing title, description, and price before submitting.');
      }

      const created = await api.createProduct(payload);
      showToast('Listing created with generated sustainability metrics.', 'success');
      router.navigate(`/product/${created.id}`);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Create Listing';
      showToast(error.message || 'Unable to create the listing.', 'error');
    }
  });
}
