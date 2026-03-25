// ─── Leaderboard Page ───────────────────────────────────────────────
import { api } from '../api.js';
import { loadingHTML, emptyHTML } from '../utils.js';

export async function renderLeaderboardPage() {
  const app = document.getElementById('page-content');
  app.innerHTML = `<div class="container page">${loadingHTML('Loading leaderboard...')}</div>`;

  try {
    const [leaderboard, badges] = await Promise.all([
      api.getLeaderboard(),
      api.getBadges(),
    ]);

    app.innerHTML = `
      <div class="container page">
        <div class="tabs mb-3" id="lb-tabs">
          <button class="tab active" data-tab="rankings">🏆 Rankings</button>
          <button class="tab" data-tab="badges">🎖️ All Badges</button>
        </div>

        <div id="rankings-section">
          ${renderRankings(leaderboard)}
        </div>

        <div id="badges-section" class="hidden">
          ${renderBadgesGrid(badges)}
        </div>
      </div>
    `;

    // Tab switching
    document.querySelectorAll('#lb-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#lb-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.getElementById('rankings-section').classList.toggle('hidden', target !== 'rankings');
        document.getElementById('badges-section').classList.toggle('hidden', target !== 'badges');
      });
    });
  } catch (err) {
    app.innerHTML = `<div class="container page">${emptyHTML('⚠️', 'Error', err.message)}</div>`;
  }
}

function renderRankings(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    return emptyHTML('🏆', 'No rankings yet', 'Be the first to earn sustainability points!');
  }

  return `
    <div class="card" style="overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid var(--border)">
        <h3>🏆 Sustainability Leaderboard</h3>
      </div>
      ${leaderboard.map((entry, i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const initials = (entry.displayName || 'U').charAt(0).toUpperCase();
        return `
          <div class="leaderboard-row">
            <div class="leaderboard-rank ${rankClass}">${medal || entry.rank}</div>
            <div class="dashboard-avatar" style="width:40px;height:40px;font-size:1rem">${initials}</div>
            <div style="flex:1">
              <div style="font-weight:600">${entry.displayName}</div>
              <div class="text-muted" style="font-size:0.8rem">🏆 ${entry.badgeCount || 0} badges · 🌱 ${(entry.totalCarbonSaved || 0).toFixed(1)} kg CO₂</div>
            </div>
            <div style="text-align:right">
              <div class="text-accent" style="font-weight:700">${entry.sustainabilityScore} pts</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderBadgesGrid(badges) {
  if (!badges || badges.length === 0) {
    return emptyHTML('🎖️', 'No badges defined', 'Badges are coming soon!');
  }

  const tierColors = {
    bronze: 'amber', silver: 'blue', gold: 'green', platinum: 'purple'
  };

  return `
    <div class="section-header"><h2>🎖️ All Available Badges</h2></div>
    <div class="grid-3">
      ${badges.map(b => `
        <div class="card" style="padding:24px;text-align:center">
          <div style="font-size:3rem;margin-bottom:12px">${b.icon}</div>
          <h3 style="margin-bottom:4px">${b.name}</h3>
          <span class="tag tag-${tierColors[b.tier] || 'blue'}" style="margin-bottom:8px">${b.tier}</span>
          <p class="text-secondary" style="font-size:0.85rem;margin-top:8px">${b.description}</p>
        </div>
      `).join('')}
    </div>
  `;
}
