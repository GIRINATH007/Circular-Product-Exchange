import { api } from '../api.js';
import { emptyHTML, formatWholeNumber, loadingHTML, renderSectionIntro } from '../utils.js';

export async function renderLeaderboardPage() {
  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="container page stack-lg">
      <section class="section-shell">
        ${renderSectionIntro(
          'Community',
          'Recognition for the people moving products into their next life',
          'Leaderboard rankings and badge definitions help make the gamification layer feel accountable, aspirational, and useful.'
        )}
        <div class="tabs" id="community-tabs">
          <button type="button" class="tab active" data-tab="rankings">Rankings</button>
          <button type="button" class="tab" data-tab="badges">Badge Library</button>
        </div>
      </section>

      <section id="community-content" class="stack-lg">${loadingHTML('Loading community data')}</section>
    </div>
  `;

  try {
    const [leaderboard, badges] = await Promise.all([
      api.getLeaderboard(),
      api.getBadges(),
    ]);

    const content = document.getElementById('community-content');
    const tabs = document.querySelectorAll('#community-tabs .tab');

    function renderView(tabId) {
      content.innerHTML = tabId === 'badges'
        ? renderBadges(badges)
        : renderRankings(leaderboard);
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        renderView(tab.dataset.tab);
      });
    });

    renderView('rankings');
  } catch (error) {
    document.getElementById('community-content').innerHTML = emptyHTML(
      'Community data unavailable',
      error.message || 'We could not load rankings or badges right now.'
    );
  }
}

function renderRankings(entries) {
  if (!entries?.length) {
    return emptyHTML('No rankings yet', 'The leaderboard will populate as members complete sustainable exchanges.');
  }

  return `
    <section class="section-shell">
      ${renderSectionIntro(
        'Rankings',
        'Top contributors by sustainability score',
        'Scores are shaped by verified exchange activity and lifecycle impact, not simple account age.'
      )}
      <div class="leaderboard-table">
        ${entries.map((entry, index) => `
          <article class="leaderboard-row">
            <div class="leaderboard-rank ${rankClass(index)}">${index + 1}</div>
            <div class="dashboard-avatar" style="width:52px;height:52px;font-size:1.05rem">${initials(entry.displayName)}</div>
            <div class="stack-md" style="gap:0.35rem">
              <h3>${entry.displayName}</h3>
              <p>${formatWholeNumber(entry.totalCarbonSaved || 0)} kg CO2e saved | ${entry.badgeCount || 0} badges</p>
            </div>
            <strong>${entry.sustainabilityScore || 0} pts</strong>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderBadges(badges) {
  if (!badges?.length) {
    return emptyHTML('No badges found', 'Badge definitions are not available right now.');
  }

  return `
    <section class="section-shell">
      ${renderSectionIntro(
        'Badge Library',
        'Milestones that reinforce circular behavior',
        'Each badge describes a threshold the platform can use to encourage repeat contribution and higher-impact exchange activity.'
      )}
      <div class="grid-3">
        ${badges.map((badge) => `
          <article class="panel-card">
            <div class="stack-md">
              <span class="pill pill-${tierTone(badge.tier)}">${badge.tier}</span>
              <h3>${badge.name}</h3>
              <p>${badge.description}</p>
              <p class="subtle">${badge.criteria}</p>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function rankClass(index) {
  if (index === 0) return 'gold';
  if (index === 1) return 'silver';
  if (index === 2) return 'bronze';
  return '';
}

function initials(name = 'User') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function tierTone(tier = '') {
  if (tier === 'gold' || tier === 'platinum') return 'gold';
  if (tier === 'silver') return 'sky';
  if (tier === 'bronze') return 'amber';
  return 'muted';
}
