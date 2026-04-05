export function renderFooter() {
  const year = new Date().getFullYear();

  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="/" data-link class="brand" aria-label="Eco Loop home">
              <span class="brand-mark">EL</span>
              <span class="brand-copy">
                <strong>Eco Loop</strong>
                <span>Lifecycle-led exchange marketplace</span>
              </span>
            </a>
            <p class="footer-tagline">Making circular commerce intuitive, transparent, and rewarding for everyone.</p>
          </div>

          <div class="footer-col">
            <h4>Platform</h4>
            <nav class="footer-links">
              <a href="/marketplace" data-link>Marketplace</a>
              <a href="/analytics" data-link>Impact Metrics</a>
              <a href="/leaderboard" data-link>Community</a>
            </nav>
          </div>

          <div class="footer-col">
            <h4>Account</h4>
            <nav class="footer-links">
              <a href="/dashboard" data-link>Dashboard</a>
              <a href="/create-listing" data-link>Create Listing</a>
              <a href="/register" data-link>Join Now</a>
            </nav>
          </div>

          <div class="footer-col">
            <h4>About</h4>
            <nav class="footer-links">
              <a href="/" data-link>How It Works</a>
              <a href="/analytics" data-link>Sustainability</a>
              <a href="/" data-link>Pricing Model</a>
            </nav>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; ${year} Eco Loop. All rights reserved.</p>
          <p>Built with sustainable design principles in mind. 🌱</p>
        </div>
      </div>
    </footer>
  `;
}
