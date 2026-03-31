import { api } from '../api.js';
import { router } from '../router.js';
import { showToast } from '../utils.js';

export function renderLoginPage() {
  if (api.isLoggedIn()) {
    router.navigate('/dashboard');
    return;
  }

  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="auth-layout">
      <div class="auth-wrap">
        <section class="auth-panel">
          <span class="section-eyebrow" style="color:#d7f4e4">Member Access</span>
          <h1 style="font-size:3rem">Return to the circular marketplace.</h1>
          <p class="mt-2">
            Sign in to manage listings, track lifecycle impact, and continue building your sustainability reputation.
          </p>
          <div class="stack-md mt-3">
            <div class="panel-card">
              <h3>Seller dashboard</h3>
              <p>Review live pricing outputs, listing performance, and exchange activity.</p>
            </div>
            <div class="panel-card">
              <h3>Buyer insights</h3>
              <p>Keep your personal carbon savings, points, and badge progress in one place.</p>
            </div>
          </div>
        </section>

        <section class="auth-card">
          <span class="section-eyebrow">Sign In</span>
          <h2>Welcome back</h2>
          <p class="mt-1">Use your account credentials to access the marketplace dashboard.</p>

          <form id="login-form">
            <div class="input-group">
              <label for="login-email">Email</label>
              <input id="login-email" class="input" type="email" placeholder="you@example.com" required />
            </div>
            <div class="input-group">
              <label for="login-password">Password</label>
              <input id="login-password" class="input" type="password" placeholder="Enter your password" required />
            </div>
            <button id="login-submit" class="btn btn-primary btn-full" type="submit">Sign In</button>
          </form>

          <p class="auth-footer">
            Need an account? <a href="/register" data-link>Register here</a>
          </p>
        </section>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('login-submit');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    button.disabled = true;
    button.textContent = 'Signing in';

    try {
      await api.login(email, password);
      showToast('Signed in successfully.', 'success');
      router.navigate('/dashboard');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Sign In';
      showToast(error.message || 'Unable to sign in.', 'error');
    }
  });
}
