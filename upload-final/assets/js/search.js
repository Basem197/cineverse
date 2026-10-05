/* ============================================================
   CineVerse — Search Page (with People support)
   ============================================================ */

(function (window, document) {
  'use strict';

  const api  = window.CineVerseAPI;
  const i18n = window.CineVerseI18n;

  if (!api) { console.error('[CineVerse] api.js missing'); return; }

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const state = {
    query: '',
    type: 'all',
    page: 1,
    totalPages: 1,
    totalResults: 0,
    loading: false,
  };

  function readStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.query = (params.get('q') || '').trim();
    const t = (params.get('type') || 'all').toLowerCase();
    state.type = ['all', 'movie', 'tv', 'person'].includes(t) ? t : 'all';
    const p = parseInt(params.get('page') || '1', 10);
    state.page = isNaN(p) || p < 1 ? 1 : p;
  }

  function writeStateToURL(replace = false) {
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.type !== 'all') params.set('type', state.type);
    if (state.page > 1) params.set('page', String(state.page));
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatNumber(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  function buildTitleCard(item) {
    const isSeries = item.type === 'tv';
    const typeLabel = isSeries ? i18n.t('card.series') : i18n.t('card.movie');
    const rating = (typeof item.rating === 'number' && item.rating > 0) ? item.rating.toFixed(1) : null;

    const a = document.createElement('a');
    a.className = 'card';
    a.href = isSeries ? `series.html?id=${item.tmdb_id}` : `movie.html?id=${item.tmdb_id}`;

    const posterHtml = item.poster
      ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title || '')}" loading="lazy">`
      : `<div class="card__poster--empty">${i18n.t('card.no.poster')}</div>`;

    const ratingHtml = rating
      ? `<span class="card__rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${rating}</span>`
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

  function buildPersonCard(item) {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = `actor.html?id=${item.tmdb_id}`;

    const photoHtml = item.profile
      ? `<img src="${escapeHtml(item.profile)}" alt="${escapeHtml(item.name || '')}" loading="lazy">`
      : `<div class="card__poster--empty">${escapeHtml((item.name || '?').charAt(0))}</div>`;

    const kf = (item.known_for || []).slice(0, 2)
      .map((k) => escapeHtml(k.title || '')).filter(Boolean).join(' \u00B7 ');

    a.innerHTML = `
      <div class="card__poster">
        ${photoHtml}
        <span class="card__type">\u0634\u062E\u0635</span>
      </div>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(item.name || '')}</h3>
        <div class="card__meta">
          ${item.department ? `<span>${escapeHtml(item.department)}</span>` : ''}
        </div>
        ${kf ? `<div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;">${kf}</div>` : ''}
      </div>
    `;
    return a;
  }

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
    $('#results').innerHTML = `
      <div class="state" style="grid-column: 1 / -1;">
        <div class="state__title">${escapeHtml(message || i18n.t('state.empty'))}</div>
      </div>
    `;
  }

  function renderError(message) {
    $('#results').innerHTML = `
      <div class="state state--error" style="grid-column: 1 / -1;">
        <div class="state__title">${escapeHtml(i18n.t('state.error'))}</div>
        <p class="state__message">${escapeHtml(message || '')}</p>
        <button class="btn btn--primary" id="retry-btn">${escapeHtml(i18n.t('state.retry'))}</button>
      </div>
    `;
    $('#retry-btn')?.addEventListener('click', () => loadResults());
  }

  function renderCards(items, isPersonMode) {
    const el = $('#results');
    if (!items.length) { renderEmpty(); return; }
    el.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((it) => frag.appendChild(isPersonMode ? buildPersonCard(it) : buildTitleCard(it)));
    el.appendChild(frag);
  }

  function renderResultsInfo() {
    const info = $('#results-info');
    if (!info) return;
    if (!state.query) { info.textContent = ''; return; }
    const lang = i18n.getLang();
    const t = state.totalResults;
    const arWord = '\u0646\u062A\u064A\u062C\u0629';
    info.textContent =
      lang === 'ar' ? `${t} ${arWord}`
      : lang === 'tr' ? `${t} sonu\u00E7`
      : `${t} result${t === 1 ? '' : 's'}`;
  }

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

    el.appendChild(makeBtn('\u2039', state.page - 1, { disabled: state.page <= 1 }));
    const start = Math.max(1, state.page - 2);
    const end   = Math.min(state.totalPages, state.page + 2);
    for (let p = start; p <= end; p++) {
      el.appendChild(makeBtn(String(p), p, { active: p === state.page }));
    }
    el.appendChild(makeBtn('\u203A', state.page + 1, { disabled: state.page >= state.totalPages }));
  }

  function updateFilterTabs() {
    document.querySelectorAll('.filter-tab').forEach((btn) => {
      const active = btn.dataset.type === state.type;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
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

  function updatePageTitle() {
    const el = $('#page-title');
    const searchWord = i18n.t('nav.search');
    if (!state.query) {
      el.innerHTML = `<span>${escapeHtml(searchWord)}</span>`;
      document.title = `${searchWord} \u2014 CineVerse`;
      return;
    }
    const personWord = '\u0623\u0634\u062E\u0627\u0635';
    const typeLabel = state.type === 'movie' ? i18n.t('card.movie')
                   : state.type === 'tv' ? i18n.t('card.series')
                   : state.type === 'person' ? personWord
                   : '';
    const suffix = typeLabel ? ` \u00B7 ${typeLabel}` : '';
    el.innerHTML = `<span>${escapeHtml(searchWord)}</span> \u2014 "${escapeHtml(state.query)}"${escapeHtml(suffix)}`;
    document.title = `${state.query} \u2014 CineVerse`;
  }

  function initSearchBox() {
    const form = $('#search-form');
    const input = $('#search-input');
    if (!form || !input) return;
    input.value = state.query;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q || q === state.query) return;
      state.query = q;
      state.page = 1;
      writeStateToURL();
      updatePageTitle();
      loadResults();
    });
  }

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
    } catch (err) { console.error('[search] countries:', err); }
  }

  function initMobileMenu() {
    const btn = $('#menu-toggle');
    const nav = $('#primary-nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  async function loadResults() {
    if (state.loading) return;
    if (!state.query) {
      const emptyMsg = i18n.getLang() === 'ar'
        ? '\u0627\u0643\u062A\u0628 \u0641\u064A \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0628\u062D\u062B \u0644\u0644\u0628\u062F\u0621'
        : i18n.getLang() === 'tr'
        ? 'Ba\u015Flamak i\u00E7in arama kutusuna yaz\u0131n'
        : 'Type in the search box to start';
      renderEmpty(emptyMsg);
      $('#results-info').textContent = '';
      $('#pagination').innerHTML = '';
      return;
    }

    state.loading = true;
    $('#results').setAttribute('aria-busy', 'true');
    renderSkeletons(12);

    try {
      const isPersonMode = state.type === 'person';

      const payload = isPersonMode
        ? await api.request(`/api/search/people?q=${encodeURIComponent(state.query)}&page=${state.page}`)
        : await api.search(state.query, { type: state.type, page: state.page });

      const items = payload?.data || [];
      const meta  = payload?.meta || {};

      state.totalResults = meta.total_results || items.length;
      state.totalPages   = Math.min(meta.total_pages || 1, 500);

      renderCards(items, isPersonMode);
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

  function handlePopState() {
    readStateFromURL();
    updateFilterTabs();
    updatePageTitle();
    const input = $('#search-input');
    if (input) input.value = state.query;
    loadResults();
  }

  function boot() {
    readStateFromURL();
    updateFilterTabs();
    updatePageTitle();
    initSearchBox();
    initFilters();
    initMobileMenu();
    initCountrySelector();
    window.addEventListener('popstate', handlePopState);
    loadResults();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);