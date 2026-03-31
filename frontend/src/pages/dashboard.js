import { api } from '../api.js';
import { router } from '../router.js';
import {
  attachProductCardHandlers,
  emptyHTML,
  formatDate,
  formatNumber,
  productCardHTML,
  progressBarHTML,
  renderMetricCard,
  renderSectionIntro,
  showToast,
} from '../utils.js';

export async function renderDashboardPage() {
  if (!api.isLoggedIn()) {
    router.navigate('/login');
    return;
  }

  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="container page stack-lg">
      <section class="dashboard-header">
        <div class="dashboard-avatar" id="dashboard-avatar">CX</div>
        <div class="stack-md">
          <div>
            <span class="section-eyebrow" style="color:#d7f4e4">Member Dashboard</span>
            <h1 id="dashboard-name" style="font-size:2.4rem">Loading your profile</h1>
            <p id="dashboard-role">Preparing your listings, points, and sustainability progress.</p>
          </div>
          <div class="action-row" id="dashboard-highlights"></div>
        </div>
      </section>

      <section class="section-shell">
        ${renderSectionIntro(
          'Personal Metrics',
          'Your circular exchange performance at a glance',
          'This dashboard combines profile, gamification, and listing data to show how your activity translates into impact.'
        )}
        <div class="grid-4" id="dashboard-metrics"></div>
      </section>

      <section class="grid-2">
        <div class="section-shell" id="progress-panel"></div>
        <div class="section-shell" id="badges-panel"></div>
      </section>

      <section class="section-shell" id="listings-section">
        <div id="listings-intro"></div>
        <div id="my-listings-grid" class="grid-3"></div>
      </section>

      <section class="section-shell" id="archived-section" style="display:none">
        ${renderSectionIntro(
          'Archived Listings',
          'Products you have removed from the marketplace',
          'These listings are no longer visible to buyers but remain in your history.'
        )}
        <div id="archived-listings-grid" class="grid-3"></div>
      </section>

      <section class="section-shell">
        <div id="feedback-history-panel"></div>
      </section>
    </div>
  `;

  try {
    const [profile, progress, personalAnalytics, myListingsResponse, myFeedbackResponse] = await Promise.all([
      api.getProfile(),
      api.getMyProgress().catch(() => null),
      api.getPersonalAnalytics().catch(() => null),
      api.myListings().catch(() => ({ products: [] })),
      api.getMyFeedback().catch(() => ({ feedback: [] })),
    ]);

    const personal = personalAnalytics?.analytics || personalAnalytics || {};
    const badges = progress?.earnedBadges || [];
    const allMyProducts = myListingsResponse.products || [];
    const myFeedback = myFeedbackResponse?.feedback || [];
    const myProducts = allMyProducts.filter((p) => p.status === 'active' || p.status === 'sold');
    const archivedProducts = allMyProducts.filter((p) => p.status === 'archived');
    const initials = (profile.displayName || 'Circular User')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const currentPoints = progress?.currentPoints || profile.totalPoints || 0;
    const nextLevelPoints = progress?.nextLevelPoints || Math.max(currentPoints, 100);
    const nextLevelDelta = Math.max(0, nextLevelPoints - currentPoints);

    document.getElementById('dashboard-avatar').textContent = initials;
    document.getElementById('dashboard-name').textContent = profile.displayName || 'Circular Member';
    document.getElementById('dashboard-role').textContent = `${profile.email} | ${profile.role || 'member'}`;
    document.getElementById('dashboard-highlights').innerHTML = `
      <span class="pill pill-emerald">${profile.sustainabilityScore || 0} sustainability score</span>
      <span class="pill pill-muted">${profile.totalPoints || 0} points earned</span>
      <span class="pill pill-gold">${badges.length} badges unlocked</span>
    `;

    const listingNoun = myProducts.length === 1 ? 'listing' : 'listings';

    document.getElementById('dashboard-metrics').innerHTML = [
      renderMetricCard('Carbon Saved', `${formatNumber(personal.totalCarbonSaved || 0)} kg`, 'Measured across your exchanges', 'emerald'),
      renderMetricCard('Transactions', formatNumber(personal.totalTransactions || 0), 'Circular exchanges completed', 'gold'),
      renderMetricCard('Points', formatNumber(profile.totalPoints || 0), 'Gamification rewards accumulated', 'sky'),
      renderMetricCard('Waste Reduced', `${formatNumber(personal.totalWasteReduced || 0)} kg`, `${myProducts.length} ${listingNoun} currently yours`, 'rose'),
    ].join('');

    document.getElementById('listings-intro').innerHTML = renderSectionIntro(
      'Your Listings',
      'Manage the products currently represented in the marketplace',
      'Listings below are loaded from live product data and remain clickable for deeper pricing and lifecycle details.',
      profile?.role === 'seller' ? '<a href="/create-listing" data-link class="btn btn-primary">Create Listing</a>' : ''
    );

    document.getElementById('progress-panel').innerHTML = `
      ${renderSectionIntro(
        'Growth',
        progress?.levelName || 'Member Progress',
        nextLevelDelta > 0
          ? `${nextLevelDelta} more points to reach the next level.`
          : 'You are already at the current top progression threshold.'
      )}
      <div class="stack-md">
        ${progressBarHTML('Current points', currentPoints, nextLevelPoints)}
        ${progressBarHTML('Sustainability score', profile.sustainabilityScore || 0, 500)}
        ${progressBarHTML('Unlocked badges', badges.length, Math.max(badges.length + 1, 5))}
      </div>
    `;

    document.getElementById('badges-panel').innerHTML = `
      ${renderSectionIntro(
        'Recognition',
        badges.length ? 'Achievements earned so far' : 'No badges yet',
        badges.length
          ? 'Badges reward long-term contribution, repeated exchanges, and verified sustainability impact.'
          : 'Your first sustainable exchange can unlock the first badge.'
      )}
      <div class="stack-md">
        ${badges.length
          ? badges.map((badge) => `
            <article class="panel-card">
              <div class="stack-md">
                <span class="pill pill-emerald">${badge.tier}</span>
                <h3>${badge.name}</h3>
                <p>${badge.description}</p>
              </div>
            </article>
          `).join('')
          : emptyHTML('Badges will appear here', 'Complete exchanges and increase your impact to start unlocking milestones.')}
      </div>
    `;

    const listingContainer = document.getElementById('my-listings-grid');
    if (myProducts.length) {
      listingContainer.innerHTML = myProducts.map((product) => productCardHTML(product)).join('');
      attachProductCardHandlers((productId) => router.navigate(`/product/${productId}`));
    } else {
      listingContainer.innerHTML = emptyHTML(
        'No active listings',
        profile.role === 'seller'
          ? 'Create your first listing to start contributing to the circular marketplace.'
          : 'You are registered as a buyer. Browse the marketplace to find products.',
        profile.role === 'seller' ? '<a href="/create-listing" data-link class="btn btn-primary">Create Listing</a>' : '<a href="/marketplace" data-link class="btn btn-primary">Browse Marketplace</a>'
      );
    }

    if (archivedProducts.length) {
      document.getElementById('archived-section').style.display = '';
      const archivedContainer = document.getElementById('archived-listings-grid');
      archivedContainer.innerHTML = archivedProducts.map((product) => `
        <div class="archived-listing">
          <div class="archived-listing-card">
            ${productCardHTML(product)}
            <span class="pill pill-rose archived-badge">Archived</span>
          </div>
        </div>
      `).join('');
      attachProductCardHandlers((productId) => router.navigate(`/product/${productId}`));
    }

    document.getElementById('feedback-history-panel').innerHTML = `
      ${renderSectionIntro(
        'Your Feedback',
        myFeedback.length ? 'A record of the feedback you submitted while signed in' : 'No feedback submitted yet',
        myFeedback.length
          ? 'Use this history to avoid reporting the same issue twice and to keep track of ideas you have already shared.'
          : 'The homepage form is ready whenever you want to suggest an improvement or report a problem.',
        '<a href="/#feedback-section" data-link class="btn btn-secondary">Open Feedback Form</a>'
      )}
      <div class="stack-md">
        ${myFeedback.length
          ? myFeedback.map((entry) => `
            <article class="panel-card">
              <div class="stack-md">
                <div class="feedback-entry-meta">
                  <span class="pill pill-emerald">${formatDate(entry.createdAt)}</span>
                  <span class="pill pill-muted">${entry.email}</span>
                </div>
                <h3>${entry.name}</h3>
                <p>${entry.message}</p>
              </div>
            </article>
          `).join('')
          : emptyHTML(
            'No feedback history yet',
            'Once you send feedback while logged in, it will show up here.'
          )}
      </div>
    `;
  } catch (error) {
    showToast(error.message || 'Dashboard failed to load.', 'error');
    app.innerHTML = `<div class="container page">${emptyHTML('Dashboard unavailable', error.message || 'Please try again shortly.')}</div>`;
  }
}
