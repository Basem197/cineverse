/* ============================================================
   CineVerse — Search Page
   ============================================================ */

(function (window, document) {
  'use strict';

  const api  = window.CineVerseAPI;
  const i18n = window.CineVerseI18n;

  if (!api) {
    console.error('[CineVerse] api.js is not loaded');
    return;
  }

  // ---------- DOM ----------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const state = {
    query:     '',
    type:      'all',   // all | movie | tv
    page:      1,
    totalPages: 1,
    totalResults: 0,
    loading:   false,
  };

  // ---------- URL <-> state ----------
  function readStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.query = (params.get('q') || '').trim();
    const t = (params.get('type') || 'all').toLowerCase();
    state.type = ['all', 'movie', 'tv'].includes(t) ? t : 'all';
    const p = parseInt(params.get('page') || '1', 10);
    state.page = isNaN(p) || p < 1 ? 1 : p;
  }

  function writeStateToURL(replace = false) {
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.type !== 'all') params.set('type', state.type);
    if (state.page > 1) params.set('page', String(state.page));

    const url = `${window.location.pathname}?${params.toString()}`;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', url);
  }

  // ---------- Helpers ----------
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

  // ---------- Renderers ----------
  function renderSkeletons(count = 12) {
    const el = $('#results');
    el.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const div = document.createElement('div');
      div.className = 'skeleton skeleton--card';
      el.appendChild(div);
    }
  }

  function renderEmpty(message) {
    const el = $('#results');
    el.innerHTML = `
      <div class="state" style="grid-column: 1 / -1;">
        <svg class="state__icon" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="11" cy="11" r="7"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <div class="state__title">${escapeHtml(message || i18n.t('state.empty'))}</div>
      </div>
    `;
  }

  function renderError(message) {
    const el = $('#results');
    el.innerHTML = `
      <div class="state state--error" style="grid-column: 1 / -1;">
        <div class="state__title">${escapeHtml(i18n.t('state.error'))}</div>
        <p class="state__message">${escapeHtml(message || '')}</p>
        <button class="btn btn--primary" id="retry-btn">${escapeHtml(i18n.t('state.retry'))}</button>
      </div>
    `;
    $('#retry-btn')?.addEventListener('click', () => loadResults());
  }

  function renderCards(items) {
    const el = $('#results');
    if (!items.length) {
      renderEmpty();
      return;
    }
    el.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((item) => frag.appendChild(buildCard(item)));
    el.appendChild(frag);
  }

  // ---------- Results Info ----------
  function renderResultsInfo() {
    const info = $('#results-info');
    if (!state.query) {
      info.textContent = '';
      return;
    }
    const tpl = i18n.getLang() === 'ar'
      ? `${state.totalResults} نتيجة`
      : i18n.getLang() === 'tr'
      ? `${state.totalResults} sonuç`
      : `${state.totalResults} result${state.totalResults === 1 ? '' : 's'}`;
    info.textContent = tpl;
  }

  // ---------- Pagination ----------
  function renderPagination() {
    const el = $('#pagination');
    el.innerHTML = '';

    if (state.totalPages <= 1) return;

    const makeBtn = (label, page, opts = {}) => {
      const btn = document.createElement('button');
      btn.className = 'pagination__btn' + (opts.active ? ' is-active' : '');
      btn.textContent = label;
      btn.disabled = !!opts.disabled;
      btn.addEventListener('click', () => {
        if (!opts.disabled && page !== state.page) {
          state.page = page;
          writeStateToURL();
          loadResults();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      return btn;
    };

    // Prev
    el.appendChild(makeBtn('‹', state.page - 1, { disabled: state.page <= 1 }));

    // First
    if (state.page > 3) {
      el.appendChild(makeBtn('1', 1));
      if (state.page > 4) {
        const dots = document.createElement('span');
        dots.className = 'pagination__info';
        dots.textContent = '…';
        el.appendChild(dots);
      }
    }

    // Around current
    const start = Math.max(1, state.page - 2);
    const end   = Math.min(state.totalPages, state.page + 2);
    for (let p = start; p <= end; p++) {
      el.appendChild(makeBtn(String(p), p, { active: p === state.page }));
    }

    // Last
    if (state.page < state.totalPages - 2) {
      if (state.page < state.totalPages - 3) {
        const dots = document.createElement('span');
        dots.className = 'pagination__info';
        dots.textContent = '…';
        el.appendChild(dots);
      }
      el.appendChild(makeBtn(String(state.totalPages), state.totalPages));
    }

    // Next
    el.appendChild(makeBtn('›', state.page + 1, { disabled: state.page >= state.totalPages }));
  }

  // ---------- Filters ----------
  function updateFilterTabs() {
    document.querySelectorAll('.filter-tab').forEach((btn) => {
      const isActive = btn.dataset.type === state.type;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
  }

  function initFilters() {
    document.querySelectorAll('.filter-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const newType = btn.dataset.type;
        if (newType === state.type) return;
        state.type = newType;
        state.page = 1;
        writeStateToURL();
        updateFilterTabs();
        if (state.query) loadResults();
      });
    });
  }

  // ---------- Page Title ----------
  function updatePageTitle() {
    const el = $('#page-title');
    const searchWord = i18n.t('nav.search');

    if (!state.query) {
      el.innerHTML = `<span>${escapeHtml(searchWord)}</span>`;
      document.title = `${searchWord} — CineVerse`;
      return;
    }

    const typeLabel = state.type === 'movie' ? i18n.t('card.movie')
                   : state.type === 'tv'    ? i18n.t('card.series')
                   : '';
    const suffix = typeLabel ? ` · ${typeLabel}` : '';

    el.innerHTML = `<span>${escapeHtml(searchWord)}</span> — "${escapeHtml(state.query)}"${escapeHtml(suffix)}`;
    document.title = `${state.query} — CineVerse`;
  }

  // ---------- Search Box ----------
  function initSearchBox() {
    const form = $('#search-form');
    const input = $('#search-input');
    if (!form || !input) return;

    input.value = state.query;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      if (q === state.query) return;
      state.query = q;
      state.page = 1;
      writeStateToURL();
      updatePageTitle();
      loadResults();
    });
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
      console.error('[search] countries:', err);
    }
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

  // ---------- Load Results ----------
  async function loadResults() {
    if (state.loading) return;
    if (!state.query) {
      renderEmpty(i18n.getLang() === 'ar'
        ? 'اكتب في صندوق البحث للبدء'
        : i18n.getLang() === 'tr'
        ? 'Başlamak için arama kutusuna yazın'
        : 'Type in the search box to start');
      $('#results-info').textContent = '';
      $('#pagination').innerHTML = '';
      return;
    }

    state.loading = true;
    $('#results').setAttribute('aria-busy', 'true');
    renderSkeletons(12);

    try {
      const payload = await api.search(state.query, {
        type: state.type,
        page: state.page,
      });

      const items = payload.data || [];
      const meta  = payload.meta || {};

      state.totalResults = meta.total_results || items.length;
      state.totalPages   = Math.min(meta.total_pages || 1, 500); // TMDB caps at 500

      renderCards(items);
      renderResultsInfo();
      renderPagination();
    } catch (err) {
      console.error('[search] failed:', err);
      renderError(err.message);
      $('#results-info').textContent = '';
      $('#pagination').innerHTML = '';
    } finally {
      state.loading = false;
      $('#results').setAttribute('aria-busy', 'false');
    }
  }

  // ---------- Re-run on language change ----------
  function hookLanguageChanges() {
    // Re-render texts when language switches (i18n.applyLang does most of it)
    const observer = new MutationObserver(() => {
      // update page title/meta
      updatePageTitle();
      renderResultsInfo();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });
  }

  // ---------- Handle back/forward ----------
  function handlePopState() {
    readStateFromURL();
    updateFilterTabs();
    updatePageTitle();
    const input = $('#search-input');
    if (input) input.value = state.query;
    loadResults();
  }

  // ---------- Boot ----------
  function boot() {
    readStateFromURL();
    updateFilterTabs();
    updatePageTitle();
    initSearchBox();
    initFilters();
    initMobileMenu();
    initCountrySelector();
    hookLanguageChanges();

    window.addEventListener('popstate', handlePopState);

    loadResults();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);