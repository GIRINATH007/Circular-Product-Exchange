import { api } from '../api.js';
import { router } from '../router.js';
import { showToast } from '../utils.js';

export function renderRegisterPage() {
  if (api.isLoggedIn()) {
    router.navigate('/dashboard');
    return;
  }

  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="auth-layout">
      <div class="auth-wrap">
        <section class="auth-panel">
          <span class="section-eyebrow" style="color:#d7f4e4">Create Account</span>
          <h1 style="font-size:3rem">Join buyers and sellers building a circular economy.</h1>
          <p class="mt-2">
            The platform connects verified participation, lifecycle-aware pricing, and impact tracking so every exchange can be more transparent and more meaningful.
          </p>
          <div class="stack-md mt-3">
            <div class="panel-card">
              <h3>For buyers</h3>
              <p>Compare products by sustainability metrics and price confidence, not just condition labels.</p>
            </div>
            <div class="panel-card">
              <h3>For sellers</h3>
              <p>Show refurbishment quality, reuse potential, and environmental savings directly in each listing.</p>
            </div>
          </div>
        </section>

        <section class="auth-card">
          <span class="section-eyebrow">Register</span>
          <h2>Start your profile</h2>
          <p class="mt-1">Create a role-based account and begin contributing to the exchange network.</p>

          <form id="register-form">
            <div class="input-group">
              <label for="reg-name">Display name</label>
              <input id="reg-name" class="input" type="text" placeholder="Your full name or team name" minlength="2" required />
            </div>
            <div class="input-group">
              <label for="reg-email">Email</label>
              <input id="reg-email" class="input" type="email" placeholder="you@example.com" required />
            </div>
            <div class="input-group">
              <label for="reg-password">Password</label>
              <input id="reg-password" class="input" type="password" placeholder="At least 8 characters" minlength="8" required />
            </div>
            <div class="input-group">
              <label for="reg-role">Role</label>
              <select id="reg-role" class="input" required>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </div>
            <button id="reg-submit" class="btn btn-primary btn-full" type="submit">Create Account</button>
          </form>

          <p class="auth-footer">
            Already registered? <a href="/login" data-link>Sign in instead</a>
          </p>
        </section>
      </div>
    </div>
  `;

  document.getElementById('register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('reg-submit');
    const displayName = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    button.disabled = true;
    button.textContent = 'Creating account';

    try {
      await api.register(email, password, displayName, role);
      showToast('Account created successfully.', 'success');
      router.navigate('/dashboard');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Create Account';
      showToast(error.message || 'Unable to create the account.', 'error');
    }
  });
}
