// ─── Login Page ─────────────────────────────────────────────────────
import { api } from '../api.js';
import { router } from '../router.js';
import { showToast } from '../utils.js';

export function renderLoginPage() {
  const app = document.getElementById('page-content');
  app.innerHTML = `
    <div class="auth-page">
      <div class="card auth-card">
        <h2>Welcome Back</h2>
        <p class="auth-subtitle">Sign in to your Circular Exchange account</p>
        <form class="auth-form" id="login-form">
          <div class="input-group">
            <label for="login-email">Email</label>
            <input type="email" id="login-email" class="input" placeholder="you@example.com" required />
          </div>
          <div class="input-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" class="input" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="login-submit">Sign In</button>
        </form>
        <div class="auth-footer">
          Don't have an account? <a href="/register" data-link>Sign up</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-submit');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      await api.login(email, password);
      showToast('Welcome back!', 'success');
      router.navigate('/dashboard');
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}
