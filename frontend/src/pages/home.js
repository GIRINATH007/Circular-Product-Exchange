import { api } from '../api.js';
import { router } from '../router.js';
import {
  emptyHTML,
  formatNumber,
  formatWholeNumber,
  loadingHTML,
  renderMetricCard,
  renderProductVisual,
  renderSectionIntro,
} from '../utils.js';

export async function renderHomePage() {
  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="container page stack-lg">
      <section class="hero-shell">
        <div class="hero-grid">
          <div class="hero-copy">
            <span class="section-eyebrow">Circular Commerce Platform</span>
            <h1>Refurbished products priced by lifecycle value, not guesswork.</h1>
            <p>
              CircularX helps buyers, sellers, and recyclers exchange products with transparent
              sustainability metrics, adaptive pricing, and measurable environmental impact.
            </p>
            <div class="hero-actions">
              <a href="/marketplace" data-link class="btn btn-primary">Explore Marketplace</a>
              <a href="/analytics" data-link class="btn btn-ghost">See Impact Metrics</a>
              ${api.isLoggedIn()
                ? '<a href="/create-listing" data-link class="btn btn-ghost">Create a Listing</a>'
                : '<a href="/register" data-link class="btn btn-ghost">Join the Platform</a>'}
            </div>
            <div class="hero-meta">
              <div class="hero-stat">
                <strong>Dynamic</strong>
                <span>Lifecycle-based pricing engine</span>
              </div>
              <div class="hero-stat">
                <strong>Verified</strong>
                <span>Sustainability-aware profiles and badges</span>
              </div>
              <div class="hero-stat">
                <strong>Traceable</strong>
                <span>Impact analytics for every exchange</span>
              </div>
            </div>
          </div>

          <div class="hero-spotlight">
            <div class="hero-spotlight-grid">
              ${renderProductVisual({
                category: 'electronics',
                dynamicPrice: 649,
                lifecycleData: { carbonSaved: 52 },
              })}
              ${renderProductVisual({
                category: 'furniture',
                dynamicPrice: 225,
                lifecycleData: { carbonSaved: 38 },
              })}
            </div>
            <p class="hero-note">
              Every listing can surface reuse score, refurbishment quality, carbon savings,
              and buyer incentives in one clean decision flow.
            </p>
          </div>
        </div>
      </section>

      <section class="section-shell">
        ${renderSectionIntro(
          'Platform Snapshot',
          'A marketplace designed around measurable reuse outcomes',
          'These live metrics come from the platform analytics layer so the homepage always reflects real usage, not brochure stats.'
        )}
        <div class="grid-4" id="home-stats">${loadingHTML('Loading live platform metrics')}</div>
      </section>

      <section class="section-shell">
        ${renderSectionIntro(
          'Why It Works',
          'Circular exchange becomes intuitive when value, trust, and impact are visible',
          'The product experience connects lifecycle data to pricing, decision support, incentives, and community recognition.'
        )}
        <div class="grid-3">
          ${featureCard(
            'Lifecycle-aware pricing',
            'Pricing reflects refurbishment quality, reuse cycles, category demand, and environmental savings instead of a flat resale discount.'
          )}
          ${featureCard(
            'Decision-friendly listings',
            'Buyers can compare condition, sustainability impact, and estimated savings versus buying new in a single scan.'
          )}
          ${featureCard(
            'Motivation beyond checkout',
            'Dashboards, badges, and contribution tracking turn every purchase into a visible sustainability milestone.'
          )}
        </div>
      </section>

      <section class="section-shell">
        ${renderSectionIntro(
          'Product Journey',
          'The full loop from listing to measurable impact',
          'The platform supports circular product exchange for individuals, verified sellers, and refurbishers.'
        )}
        <div class="grid-4">
          ${journeyCard('1', 'List', 'Capture lifecycle inputs such as usage history, refurbishment quality, and recyclability.')}
          ${journeyCard('2', 'Price', 'The pricing engine recalculates value from lifecycle score, demand, and sustainability discount.')}
          ${journeyCard('3', 'Exchange', 'Users browse, compare, and purchase products with impact context visible before checkout.')}
          ${journeyCard('4', 'Track', 'Dashboards convert exchanges into carbon, waste, and community contribution metrics.')}
        </div>
      </section>

      <section class="section-shell">
        ${renderSectionIntro(
          'Browse by Category',
          'Jump into the highest-impact parts of the marketplace',
          'Category tiles stay connected to real listing counts so the entry points remain useful as inventory changes.',
          '<a href="/marketplace" data-link class="btn btn-secondary">View Full Marketplace</a>'
        )}
        <div class="grid-3" id="home-categories">${loadingHTML('Loading active categories')}</div>
      </section>

      <section class="section-shell" id="feedback-section">
        ${renderSectionIntro(
          'Share Your Feedback',
          'Help us improve the CircularX experience',
          'We value your thoughts. Let us know how we can make circular commerce even better for everyone.'
        )}
        <form id="feedback-form" class="feedback-form">
          <div class="form-grid feedback-grid">
            <div class="input-group">
              <label for="feedback-name">Name</label>
              <input type="text" id="feedback-name" class="input" placeholder="Your name" required />
            </div>
            <div class="input-group">
              <label for="feedback-email">Email</label>
              <input type="email" id="feedback-email" class="input" placeholder="you@example.com" required />
            </div>
          </div>
          <div class="input-group">
            <label for="feedback-message">Message</label>
            <textarea id="feedback-message" class="input" placeholder="Tell us what you think..." rows="4" required></textarea>
          </div>
          <div class="feedback-actions">
            <button type="submit" class="btn btn-primary" id="feedback-submit">Send Feedback</button>
          </div>
          <div id="feedback-status" class="feedback-status hidden"></div>
        </form>
      </section>
    </div>
  `;

  if (window.location.hash === '#feedback-section') {
    requestAnimationFrame(() => {
      document.getElementById('feedback-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  try {
    const response = await api.getGlobalAnalytics();
    const analytics = response.analytics || response;
    const impactSummary = response.impactSummary || {};

    document.getElementById('home-stats').innerHTML = [
      renderMetricCard('Carbon Saved', `${formatNumber(analytics.totalCarbonSaved)} kg`, `${impactSummary.treesEquivalent || '0'} trees equivalent`, 'emerald'),
      renderMetricCard('Exchanges', formatNumber(analytics.totalExchanges), 'Completed sustainable transactions', 'gold'),
      renderMetricCard('Active Users', formatNumber(analytics.totalUsers), 'Buyers, sellers, and recyclers participating', 'sky'),
      renderMetricCard('Waste Reduced', `${formatNumber(analytics.totalWasteReduced)} kg`, `${formatWholeNumber(analytics.activeListings)} active listings right now`, 'rose'),
    ].join('');
  } catch (error) {
    document.getElementById('home-stats').innerHTML = emptyHTML(
      'Metrics unavailable',
      error.message || 'Platform analytics could not be loaded right now.'
    );
  }

  try {
    const categories = await api.getCategories();
    const categoryContainer = document.getElementById('home-categories');
    categoryContainer.innerHTML = categories.slice(0, 6).map((category) => `
      <article class="panel-card" data-category="${category.id}" style="cursor:pointer">
        <div class="stack-md">
          <span class="pill pill-emerald">${category.name}</span>
          <h3>${category.name}</h3>
          <p>${formatWholeNumber(category.count)} active listings currently available.</p>
        </div>
      </article>
    `).join('');

    categoryContainer.querySelectorAll('[data-category]').forEach((card) => {
      card.addEventListener('click', () => {
        router.navigate(`/marketplace?category=${card.dataset.category}`);
      });
    });
  } catch (error) {
    document.getElementById('home-categories').innerHTML = emptyHTML(
      'Categories unavailable',
      error.message || 'Category data could not be loaded.'
    );
  }

  // ── Feedback form handler ──────────────────────────────────────────
  const feedbackForm = document.getElementById('feedback-form');
  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('feedback-submit');
    const statusEl = document.getElementById('feedback-status');
    const name = document.getElementById('feedback-name').value.trim();
    const email = document.getElementById('feedback-email').value.trim();
    const message = document.getElementById('feedback-message').value.trim();

    if (!name || !email || !message) {
      statusEl.className = 'feedback-status feedback-error';
      statusEl.textContent = 'Please fill in all fields.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    statusEl.className = 'feedback-status hidden';

    try {
      await api.submitFeedback(name, email, message);
      feedbackForm.reset();
      statusEl.className = 'feedback-status feedback-success';
      statusEl.innerHTML = '<strong>✓ Thank you!</strong> Your feedback has been submitted successfully.';
    } catch (err) {
      statusEl.className = 'feedback-status feedback-error';
      statusEl.textContent = err.message || 'Something went wrong. Please try again.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Feedback';
    }
  });
}

function featureCard(title, copy) {
  return `
    <article class="panel-card">
      <div class="stack-md">
        <span class="pill pill-muted">Feature</span>
        <h3>${title}</h3>
        <p>${copy}</p>
      </div>
    </article>
  `;
}

function journeyCard(step, title, copy) {
  return `
    <article class="panel-card">
      <div class="stack-md">
        <span class="pill pill-gold">Step ${step}</span>
        <h3>${title}</h3>
        <p>${copy}</p>
      </div>
    </article>
  `;
}
