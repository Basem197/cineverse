/* ============================================================
   CineVerse — Home Page Controller
   ============================================================ */

(function (window, document) {
  'use strict';

  const api  = window.CineVerseAPI;
  const i18n = window.CineVerseI18n;

  if (!api) {
    console.error('[CineVerse] api.js is not loaded');
    return;
  }

  // ---------- DOM helpers ----------
  const $  = (sel, ctx = document) => ctx.querySelector(sel);

  // ---------- Card builder ----------
  function buildCard(item) {
    const isSeries = item.type === 'tv' || item.type === 'series';
    const typeLabel = isSeries ? i18n.t('card.series') : i18n.t('card.movie');
    const rating = typeof item.rating === 'number' && item.rating > 0
      ? item.rating.toFixed(1)
      : null;

    const a = document.createElement('a');
    a.className = 'card';
    a.href = isSeries
      ? `series.html?id=${item.tmdb_id}`
      : `movie.html?id=${item.tmdb_id}`;
    a.setAttribute('aria-label', item.title || 'Untitled');

    const posterHtml = item.poster
      ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title || '')}" loading="lazy">`
      : `<div class="card__poster--empty">${i18n.t('card.no.poster')}</div>`;

    const ratingHtml = rating
      ? `<span class="card__rating">
           <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
           ${rating}
         </span>`
      : '';

    a.innerHTML = `
      <div class="card__poster">
        ${posterHtml}
        <span class="card__type">${typeLabel}</span>
        ${ratingHtml}
      </div>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(item.title || 'Untitled')}</h3>
        <div class="card__meta">
          ${item.year ? `<span>${item.year}</span>` : ''}
          ${item.votes ? `<span>${formatNumber(item.votes)}</span>` : ''}
        </div>
      </div>
    `;

    return a;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  // ---------- Renderers ----------
  function renderSkeletons(container, count = 6) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const div = document.createElement('div');
      div.className = 'skeleton skeleton--card';
      container.appendChild(div);
    }
  }

  function renderEmpty(container, message) {
    container.innerHTML = `
      <div class="state" style="grid-column: 1 / -1;">
        <div class="state__title">${escapeHtml(message || i18n.t('state.empty'))}</div>
      </div>
    `;
  }

  function renderError(container, message) {
    container.innerHTML = `
      <div class="state state--error" style="grid-column: 1 / -1;">
        <div class="state__title">${escapeHtml(i18n.t('state.error'))}</div>
        <p class="state__message">${escapeHtml(message || '')}</p>
      </div>
    `;
  }

  function renderCards(container, items) {
    if (!items.length) {
      renderEmpty(container);
      return;
    }
    container.innerHTML = '';
    items.forEach((item) => container.appendChild(buildCard(item)));
  }

  // ---------- Loaders ----------
  async function loadTrendingMovies() {
    const el = $('#trending-movies');
    if (!el) return;
    renderSkeletons(el, 6);
    try {
      const data = await api.trending('movie', 'week');
      const results = (data.data || []).slice(0, 12);
      renderCards(el, results);
    } catch (err) {
      console.error('[home] trending movies:', err);
      renderError(el, err.message);
    }
  }

  async function loadTrendingSeries() {
    const el = $('#trending-series');
    if (!el) return;
    renderSkeletons(el, 6);
    try {
      const data = await api.trending('tv', 'week');
      const results = (data.data || []).slice(0, 12);
      renderCards(el, results);
    } catch (err) {
      console.error('[home] trending series:', err);
      renderError(el, err.message);
    }
  }

  async function loadGenres() {
    const el = $('#genres-list');
    if (!el) return;
    console.log('[home] loading genres…');
    try {
      const data = await api.genres();
      console.log('[home] genres response:', data);
      const genres = (data && Array.isArray(data.data)) ? data.data.slice(0, 14) : [];
      console.log('[home] genres count:', genres.length);

      el.innerHTML = '';
      if (genres.length === 0) {
        el.innerHTML = `<p class="text-muted">${i18n.t('state.empty')}</p>`;
        return;
      }

      const lang = i18n.getLang();
      genres.forEach((g) => {
        const a = document.createElement('a');
        a.className = 'chip';
        a.href = `genre.html?slug=${encodeURIComponent(g.slug)}`;
        a.textContent = lang === 'ar' ? g.name_ar : g.name_en;
        el.appendChild(a);
      });
      console.log('[home] genres rendered:', el.children.length);
    } catch (err) {
      console.error('[home] genres failed:', err);
      el.innerHTML = `<p class="text-muted">Genres error: ${escapeHtml(err.message)}</p>`;
    }
  }

  async function loadProviders() {
    const el = $('#providers-list');
    if (!el) return;
    try {
      const data = await api.providers();
      const list = (data.data || []).slice(0, 18);
      el.innerHTML = '';
      list.forEach((p) => {
        const a = document.createElement('a');
        a.className = 'provider-chip';
        a.href = p.official_url || '#';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = p.name;
        el.appendChild(a);
      });
    } catch (err) {
      console.error('[home] providers:', err);
      el.innerHTML = `<p class="text-muted">${escapeHtml(err.message)}</p>`;
    }
  }

  // ---------- Country selector ----------
  async function initCountrySelector() {
    const select = $('#country-select');
    if (!select) return;

    try {
      const data = await api.countries();
      const countries = data.data || [];
      select.innerHTML = '';

      countries.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.code;
        const lang = i18n.getLang();
        const name = lang === 'ar' ? c.name_ar
                   : lang === 'tr' ? (c.name_tr || c.name_en)
                   : c.name_en;
        opt.textContent = `${c.flag_emoji || ''} ${name}`.trim();
        select.appendChild(opt);
      });

      select.value = i18n.getCountry();
      select.addEventListener('change', () => i18n.setCountry(select.value));
    } catch (err) {
      console.error('[home] countries:', err);
    }
  }

  // ---------- Search ----------
  function initSearch() {
    const form = $('#hero-search-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#hero-search-input')?.value?.trim();
      if (q) {
        window.location.href = `search.html?q=${encodeURIComponent(q)}`;
      }
    });
  }

  // ---------- Mobile menu ----------
  function initMobileMenu() {
    const btn = $('#menu-toggle');
    const nav = $('#primary-nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  // ---------- Bootstrap ----------
  function boot() {
    initSearch();
    initMobileMenu();
    initCountrySelector();

    loadTrendingMovies();
    loadTrendingSeries();
    loadGenres();
    loadProviders();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);