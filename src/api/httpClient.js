const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
const TOKEN_KEY = 'gestorj2.api_token';

const parseError = async (response) => {
  const body = await response.json().catch(() => ({}));
  return body.error?.message || body.message || body.error || `Erro HTTP ${response.status}`;
};

export const httpClient = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else this.clearToken();
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request(path, options = {}) {
    const headers = {
      ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
      const refreshed = await this._tryRefresh();
      if (refreshed) {
        const retryHeaders = {
          ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
          authorization: `Bearer ${this.token}`,
          ...options.headers,
        };
        const retry = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          credentials: 'include',
          headers: retryHeaders,
        });
        if (!retry.ok) throw new Error(await parseError(retry));
        if (retry.status === 204) return null;
        return retry.json();
      }
      this.clearToken();
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    if (response.status === 204) return null;
    return response.json();
  },

  async _tryRefresh() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.accessToken) {
        this.setToken(data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  get(path) {
    return this.request(path);
  },

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  patch(path, body) {
    return this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(body ?? {}),
    });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },
};

