const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('ce_token') || null;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('ce_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('ce_token');
    localStorage.removeItem('ce_user');
  }

  getUser() {
    try {
      const data = localStorage.getItem('ce_user');
      return data ? JSON.parse(data) : null;
    } catch {
      localStorage.removeItem('ce_user');
      return null;
    }
  }

  setUser(user) {
    localStorage.setItem('ce_user', JSON.stringify(user));
  }

  isLoggedIn() {
    return Boolean(this.token);
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, options);
    } catch {
      throw new Error('Unable to reach the server. Check that the backend is running.');
    }

    const isJSON = response.headers.get('content-type')?.includes('application/json');
    const data = response.status === 204 ? null : (isJSON ? await response.json() : null);

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
      }
      throw new Error(data?.error || `Request failed (${response.status})`);
    }

    return data;
  }

  async register(email, password, displayName, role) {
    const data = await this.request('POST', '/auth/register', { email, password, displayName, role });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  logout() {
    this.clearToken();
  }

  async getProfile() {
    return this.request('GET', '/auth/profile');
  }

  async updateProfile(updates) {
    return this.request('PUT', '/auth/profile', updates);
  }

  async listProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id) {
    return this.request('GET', `/products/${id}`);
  }

  async createProduct(product) {
    return this.request('POST', '/products', product);
  }

  async updateProduct(id, updates) {
    return this.request('PUT', `/products/${id}`, updates);
  }

  async deleteProduct(id) {
    return this.request('DELETE', `/products/${id}`);
  }

  async purchaseProduct(id) {
    return this.request('POST', `/products/${id}/purchase`);
  }

  async getCategories() {
    return this.request('GET', '/products/categories');
  }

  async myListings() {
    return this.request('GET', '/products/my-listings');
  }

  async getGlobalAnalytics() {
    return this.request('GET', '/analytics/global');
  }

  async getPersonalAnalytics() {
    return this.request('GET', '/analytics/personal');
  }

  async getBadges() {
    return this.request('GET', '/gamification/badges');
  }

  async getLeaderboard() {
    return this.request('GET', '/gamification/leaderboard');
  }

  async getMyProgress() {
    return this.request('GET', '/gamification/my-progress');
  }
}

export const api = new ApiClient();
