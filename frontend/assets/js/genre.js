/* ============================================================
   CineVerse — Genre Browse Page
   ============================================================ */

(function (window, document) {
  'use strict';

  const api  = window.CineVerseAPI;
  const i18n = window.CineVerseI18n;

  if (!api) {
    console.error('[CineVerse] api.js is not loaded');
    return;
  }

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const state = {
    slug:       '',
    type:       'movie',
    sort:       'popularity.desc',
    page:       1,
    totalPages: 1,
    totalResults: 0,
    genre:      null,
    applicable: 'both',   // 'movie' | 'tv' | 'both'
    loading:    false,
  };

  // ---------- URL ----------
  function readStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.slug = (params.get('slug') || '').trim();
    const t = (params.get('type') || '').toLowerCase();
    state.type = ['movie', 'tv'].includes(t) ? t : null;  // null = auto
    state.sort = params.get('sort') || 'popularity.desc';
    const p = parseInt(params.get('page') || '1', 10);
    state.page = isNaN(p) || p < 1 ? 1 : p;
  }

  function writeStateToURL(replace = false) {
    const params = new URLSearchParams();
    if (state.slug) params.set('slug', state.slug);
    if (state.type !== 'movie') params.set('type', state.type);
    if (state.sort !== 'popularity.desc') params.set('sort', state.sort);
    if (state.page > 1) params.set('page', String(state.page));

    const url = `${window.location.pathname}?${params.toString()}`;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', url);
  }

  // ---------- Helpers ----------
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

  // ---------- Card ----------
  function buildCard(item) {
    const isSeries = item.type === 'tv';
    const typeLabel = isSeries ? i18n.t('card.series') : i18n.t('card.movie');
    const rating = (typeof item.rating === 'number' && item.rating > 0)
      ? item.rating.toFixed(1) : null;

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
    if (!items.length) { renderEmpty(); return; }
    el.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((it) => frag.appendChild(buildCard(it)));
    el.appendChild(frag);
  }

  function renderResultsInfo() {
    const info = $('#results-info');
    if (!info) return;
    const lang = i18n.getLang();
    const total = state.totalResults;
    info.textContent =
      lang === 'ar' ? `${total} نتيجة`
      : lang === 'tr' ? `${total} sonuç`
      : `${total} result${total === 1 ? '' : 's'}`;
  }

  // ---------- Header ----------
  function renderPageHeader(genreMeta, type) {
    const name = i18n.getLang() === 'ar'
      ? (genreMeta.name_ar || genreMeta.name_en)
      : genreMeta.name_en;

    const typeLabel = type === 'tv' ? i18n.t('card.series') : i18n.t('card.movie');

    $('#page-title').innerHTML = `${escapeHtml(name)} <span>— ${escapeHtml(typeLabel)}</span>`;
    document.title = `${name} — CineVerse`;

    const meta = $('#page-meta');
    meta.textContent = i18n.getLang() === 'ar'
      ? `تصفح أفضل ${typeLabel} في تصنيف ${name}`
      : `Browse top ${typeLabel} in ${name}`;
  }

  // ---------- Filters — CHANGED: hide incompatible tabs ----------
  function updateFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach((btn) => {
      const t = btn.dataset.type;
      const active = t === state.type;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));

      // Hide incompatible tab
      if (state.applicable === 'movie' && t === 'tv') {
        btn.style.display = 'none';
      } else if (state.applicable === 'tv' && t === 'movie') {
        btn.style.display = 'none';
      } else {
        btn.style.display = '';
      }
    });

    const sortSel = $('#sort-select');
    if (sortSel) sortSel.value = state.sort;
  }

  function initFilters() {
    document.querySelectorAll('.filter-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.type;
        if (t === state.type) return;
        state.type = t;
        state.page = 1;
        writeStateToURL();
        updateFilterTabs();
        loadResults();
      });
    });

    const sortSel = $('#sort-select');
    if (sortSel) {
      sortSel.addEventListener('change', () => {
        state.sort = sortSel.value;
        state.page = 1;
        writeStateToURL();
        loadResults();
      });
    }
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

    el.appendChild(makeBtn('‹', state.page - 1, { disabled: state.page <= 1 }));

    if (state.page > 3) {
      el.appendChild(makeBtn('1', 1));
      if (state.page > 4) {
        const dots = document.createElement('span');
        dots.className = 'pagination__info';
        dots.textContent = '…';
        el.appendChild(dots);
      }
    }

    const start = Math.max(1, state.page - 2);
    const end   = Math.min(state.totalPages, state.page + 2);
    for (let p = start; p <= end; p++) {
      el.appendChild(makeBtn(String(p), p, { active: p === state.page }));
    }

    if (state.page < state.totalPages - 2) {
      if (state.page < state.totalPages - 3) {
        const dots = document.createElement('span');
        dots.className = 'pagination__info';
        dots.textContent = '…';
        el.appendChild(dots);
      }
      el.appendChild(makeBtn(String(state.totalPages), state.totalPages));
    }

    el.appendChild(makeBtn('›', state.page + 1, { disabled: state.page >= state.totalPages }));
  }

  // ---------- Load ----------
  async function loadResults() {
    if (state.loading) return;
    if (!state.slug) {
      renderError('لم يتم تحديد تصنيف في الرابط (?slug=action)');
      return;
    }

    state.loading = true;
    $('#results').setAttribute('aria-busy', 'true');
    renderSkeletons(12);

    try {
      const params = new URLSearchParams({
        type: state.type || 'movie',
        page: String(state.page),
        sort: state.sort,
      });

      const payload = await api.request(`/api/genres/${encodeURIComponent(state.slug)}/titles?${params}`);
      const items = payload?.data || [];
      const meta  = payload?.meta || {};

      // Backend may auto-correct type — respect it
      if (meta.type && meta.type !== state.type) {
        state.type = meta.type;
      }

      // Save genre meta + applicability
      if (meta.genre) {
        state.genre = meta.genre;
        state.applicable = meta.genre.applicable || 'both';
        renderPageHeader(meta.genre, meta.type || state.type);
        updateFilterTabs();   // re-render tabs based on applicability
      }

      state.totalResults = meta.total_results || items.length;
      state.totalPages   = Math.min(meta.total_pages || 1, 500);

      renderCards(items);
      renderResultsInfo();
      renderPagination();
    } catch (err) {
      console.error('[genre] failed:', err);
      renderError(err.message);
      $('#results-info').textContent = '';
      $('#pagination').innerHTML = '';
    } finally {
      state.loading = false;
      $('#results').setAttribute('aria-busy', 'false');
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
    } catch (err) { console.error('[genre] countries:', err); }
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

  // ---------- Back / Forward ----------
  function handlePopState() {
    readStateFromURL();
    updateFilterTabs();
    loadResults();
  }

  // ---------- Boot ----------
  function boot() {
    readStateFromURL();
    // Default type — will be auto-corrected by backend on first load
    if (!state.type) state.type = 'movie';

    updateFilterTabs();
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