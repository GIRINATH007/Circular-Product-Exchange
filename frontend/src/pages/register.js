// ─── Register Page ──────────────────────────────────────────────────
import { api } from '../api.js';
import { router } from '../router.js';
import { showToast } from '../utils.js';

export function renderRegisterPage() {
  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="auth-page">
      <div class="card auth-card">
        <h2>Join the Movement</h2>
        <p class="auth-subtitle">Create your account and start trading sustainably</p>
        <form class="auth-form" id="register-form">
          <div class="input-group">
            <label for="reg-name">Display Name</label>
            <input type="text" id="reg-name" class="input" placeholder="Your name" required minlength="2" />
          </div>
          <div class="input-group">
            <label for="reg-email">Email</label>
            <input type="email" id="reg-email" class="input" placeholder="you@example.com" required />
          </div>
          <div class="input-group">
            <label for="reg-password">Password</label>
            <input type="password" id="reg-password" class="input" placeholder="Min 8 characters" required minlength="8" />
          </div>
          <div class="input-group">
            <label for="reg-role">I want to</label>
            <select id="reg-role" class="input" required>
              <option value="buyer">Buy sustainable products</option>
              <option value="seller">Sell refurbished items</option>
              <option value="recycler">Recycle and refurbish</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="reg-submit">Create Account</button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="/login" data-link>Sign in</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-submit');
    const displayName = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      await api.register(email, password, displayName, role);
      showToast('Account created! Welcome to Circular Exchange 🌱', 'success');
      router.navigate('/dashboard');
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}
