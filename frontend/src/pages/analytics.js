import { api } from '../api.js';
import {
  emptyHTML,
  formatNumber,
  formatWholeNumber,
  loadingHTML,
  progressBarHTML,
  renderMetricCard,
  renderSectionIntro,
} from '../utils.js';

export async function renderAnalyticsPage() {
  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="container page stack-lg">
      <section class="section-shell">
        ${renderSectionIntro(
          'Impact Analytics',
          'Track the environmental effect of circular exchange',
          'Platform-wide and personal dashboards surface carbon savings, waste reduction, activity patterns, and category-level contribution.'
        )}
        <div class="tabs" id="analytics-tabs"></div>
      </section>

      <section id="analytics-content" class="analytics-layout">${loadingHTML('Loading impact analytics')}</section>
    </div>
  `;

  try {
    const [globalResponse, personalResponse] = await Promise.all([
      api.getGlobalAnalytics(),
      api.isLoggedIn() ? api.getPersonalAnalytics().catch(() => null) : Promise.resolve(null),
    ]);

    const global = globalResponse.analytics || globalResponse;
    const personal = personalResponse?.analytics || personalResponse || null;
    const impactSummary = globalResponse.impactSummary || {};

    const tabs = document.getElementById('analytics-tabs');
    const content = document.getElementById('analytics-content');
    const availableTabs = personal
      ? [
          { id: 'personal', label: 'My Impact' },
          { id: 'global', label: 'Platform Impact' },
        ]
      : [{ id: 'global', label: 'Platform Impact' }];

    tabs.innerHTML = availableTabs.map((tab, index) => `
      <button type="button" class="tab ${index === 0 ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>
    `).join('');

    function renderTab(tabId) {
      if (tabId === 'personal' && personal) {
        content.innerHTML = renderPersonalAnalytics(personal);
      } else {
        content.innerHTML = renderGlobalAnalytics(global, impactSummary);
      }
    }

    tabs.querySelectorAll('.tab').forEach((button) => {
      button.addEventListener('click', () => {
        tabs.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
        button.classList.add('active');
        renderTab(button.dataset.tab);
      });
    });

    renderTab(availableTabs[0].id);
  } catch (error) {
    document.getElementById('analytics-content').innerHTML = emptyHTML(
      'Analytics unavailable',
      error.message || 'Analytics data could not be loaded.'
    );
  }
}

function renderGlobalAnalytics(data, impactSummary) {
  return `
    <section class="section-shell">
      ${renderSectionIntro(
        'Platform Impact',
        'Live sustainability outcomes across the marketplace',
        'These figures summarize the combined results of listings, exchanges, and participation across the platform.'
      )}
      <div class="grid-4">
        ${renderMetricCard('Carbon Saved', `${formatNumber(data.totalCarbonSaved || 0)} kg`, `${impactSummary.treesEquivalent || '0'} trees equivalent`, 'emerald')}
        ${renderMetricCard('Waste Reduced', `${formatNumber(data.totalWasteReduced || 0)} kg`, `${impactSummary.carMilesEquivalent || '0'} car miles avoided`, 'gold')}
        ${renderMetricCard('Total Exchanges', formatNumber(data.totalExchanges || 0), `${formatWholeNumber(data.totalProductsListed || 0)} listings processed`, 'sky')}
        ${renderMetricCard('Active Users', formatNumber(data.totalUsers || 0), `${formatWholeNumber(data.activeListings || 0)} active listings right now`, 'rose')}
      </div>
    </section>
  `;
}

function renderPersonalAnalytics(data) {
  const categoryEntries = Object.entries(data.categoryBreakdown || {}).sort((a, b) => b[1] - a[1]);
  const monthlyEntries = data.monthlyBreakdown || [];
  const monthlyMax = Math.max(...monthlyEntries.map((entry) => entry.carbonSaved || 0), 1);

  return `
    <section class="section-shell">
      ${renderSectionIntro(
        'My Impact',
        'Your measurable contribution to circular commerce',
        'Personal analytics track carbon savings, activity cadence, and the categories where your exchanges are making the biggest difference.'
      )}
      <div class="grid-4">
        ${renderMetricCard('Carbon Saved', `${formatNumber(data.totalCarbonSaved || 0)} kg`, 'Lifetime circular savings', 'emerald')}
        ${renderMetricCard('Waste Reduced', `${formatNumber(data.totalWasteReduced || 0)} kg`, 'Estimated from completed exchanges', 'gold')}
        ${renderMetricCard('Transactions', formatNumber(data.totalTransactions || 0), 'Purchases and sales contributing to impact', 'sky')}
        ${renderMetricCard('Points Earned', formatNumber(data.totalPointsEarned || 0), `${formatWholeNumber(data.sustainabilityScore || 0)} sustainability score`, 'rose')}
      </div>
    </section>

    <section class="grid-2">
      <div class="section-shell">
        ${renderSectionIntro(
          'Category Mix',
          'Where your exchanges create the most value',
          'Higher bars represent categories that have contributed more carbon savings through your activity.'
        )}
        <div class="stack-md">
          ${categoryEntries.length
            ? categoryEntries.map(([category, value]) => progressBarHTML(category, value, Math.max(categoryEntries[0][1], 1), ' kg')).join('')
            : '<p class="subtle">Category impact will appear after your first tracked exchange.</p>'}
        </div>
      </div>

      <div class="section-shell">
        ${renderSectionIntro(
          'Monthly Trend',
          'How your sustainability activity is evolving',
          'Recent months remain visible even when there is little activity, so your progress pattern is easy to read.'
        )}
        <div class="stack-md">
          ${monthlyEntries.map((entry) => progressBarHTML(entry.month, entry.carbonSaved || 0, monthlyMax, ' kg')).join('')}
        </div>
      </div>
    </section>
  `;
}
