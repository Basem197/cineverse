/* ============================================================
   CineVerse — API Client
   Single entry point for all backend calls.
   ============================================================ */

(function (window) {
  'use strict';

  // ---------- Configuration ----------
  // Auto-detect base URL from the current page location.
  //
  // Local dev:   http://localhost/cineverse/frontend/  → /cineverse/api/public
  // Production:  https://cineverse-api.infinityfreeapp.com/  → /public (same origin!)
  const API_BASE = (() => {
    const { protocol, hostname, port } = window.location;

    // Local XAMPP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}${port ? ':' + port : ''}/cineverse/api/public`;
    }

    // Production (InfinityFree) — same origin, no CORS
    return '/public';
  })();

  // ---------- Core fetch wrapper ----------
  async function request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {}),
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      method: options.method || 'GET',
      headers,
      credentials: 'include',
    };

    if (options.body) {
      config.body = options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body);
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      throw new ApiError('network_error', 'Unable to reach the server', 0, err);
    }

    let payload = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new ApiError('invalid_json', 'Server returned an invalid response', response.status);
      }
    }

    if (!response.ok || (payload && payload.success === false)) {
      const msg = payload?.error?.message || `HTTP ${response.status}`;
      throw new ApiError(
        payload?.error?.code || 'http_error',
        msg,
        response.status,
        payload?.error
      );
    }

    return payload;
  }

  // ---------- Error class ----------
  class ApiError extends Error {
    constructor(code, message, status, details) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.status = status;
      this.details = details;
    }
  }

  // ---------- Public API ----------
  const api = {
    API_BASE,
    request,

    // Health / status
    health: () => request('/api/health'),

    // Reference data
    countries: () => request('/api/countries'),
    genres: () => request('/api/genres'),
    providers: () => request('/api/providers'),

    // Search
    search: (q, opts = {}) => {
      const params = new URLSearchParams({ q });
      if (opts.type) params.set('type', opts.type);
      if (opts.page) params.set('page', opts.page);
      if (opts.lang) params.set('lang', opts.lang);
      return request(`/api/search?${params}`);
    },

    // Trending
    trending: (type = 'all', window = 'week', opts = {}) => {
      const params = new URLSearchParams({ type, window });
      if (opts.lang) params.set('lang', opts.lang);
      return request(`/api/trending?${params}`);
    },

    // Title details
    title: (id, opts = {}) => {
      const params = new URLSearchParams();
      if (opts.type) params.set('type', opts.type);
      if (opts.lang) params.set('lang', opts.lang);
      const qs = params.toString();
      return request(`/api/titles/${id}${qs ? '?' + qs : ''}`);
    },

    // Trailer
    trailer: (id, opts = {}) => {
      const params = new URLSearchParams();
      if (opts.type) params.set('type', opts.type);
      if (opts.lang) params.set('lang', opts.lang);
      const qs = params.toString();
      return request(`/api/titles/${id}/trailer${qs ? '?' + qs : ''}`);
    },

    // Availability (where to watch)
    availability: (id, countryCode, opts = {}) => {
      const params = new URLSearchParams({ country: countryCode });
      if (opts.type) params.set('type', opts.type);
      return request(`/api/titles/${id}/availability?${params}`);
    },

    // Family guide
    familyGuide: (id) => request(`/api/titles/${id}/family-guide`),

    // Season episodes
    season: (titleId, seasonNumber, opts = {}) => {
      const params = new URLSearchParams();
      if (opts.lang) params.set('lang', opts.lang);
      const qs = params.toString();
      return request(`/api/titles/${titleId}/season/${seasonNumber}${qs ? '?' + qs : ''}`);
    },
  };

  window.CineVerseAPI = api;
  window.CineVerseApiError = ApiError;
})(window);