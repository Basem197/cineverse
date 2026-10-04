/* ============================================================
   CineVerse — Provider Page
   ============================================================ */

(function (window, document) {
  'use strict';

  const api  = window.CineVerseAPI;
  const i18n = window.CineVerseI18n;

  if (!api) { console.error('[CineVerse] api.js missing'); return; }

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const state = {
    slug:       '',
    type:       'movie',
    sort:       'popularity.desc',
    page:       1,
    totalPages: 1,
    totalResults: 0,
    provider:   null,
    loading:    false,
  };

  function readStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.slug = (params.get('slug') || '').trim();
    const t = (params.get('type') || 'movie').toLowerCase();
    state.type = ['movie', 'tv'].includes(t) ? t : 'movie';
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

  function buildCard(item) {
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

  function renderSkeletons(count = 12) {
    const el = $('#results');
    el.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const div = document.createElement('div');
      div.className = 'skeleton skeleton--card';
      el.appendChild(div);
    }
  }

  function renderEmpty(msg) {
    $('#results').innerHTML = `
      <div class="state" style="grid-column: 1 / -1;">
        <div class="state__title">${escapeHtml(msg || i18n.t('state.empty'))}</div>
      </div>
    `;
  }

  function renderError(msg) {
    $('#results').innerHTML = `
      <div class="state state--error" style="grid-column: 1 / -1;">
        <div class="state__title">${escapeHtml(i18n.t('state.error'))}</div>
        <p class="state__message">${escapeHtml(msg || '')}</p>
      </div>
    `;
  }

  function renderCards(items) {
    const el = $('#results');
    if (!items.length) { renderEmpty('لا يوجد محتوى متاح لهذه المنصة في الدولة المختارة حاليًا.'); return; }
    el.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((it) => frag.appendChild(buildCard(it)));
    el.appendChild(frag);
  }

  function renderResultsInfo() {
    const info = $('#results-info');
    if (!info) return;
    const lang = i18n.getLang();
    const t = state.totalResults;
    info.textContent = lang === 'ar' ? `${t} نتيجة`
                     : lang === 'tr' ? `${t} sonuç`
                     : `${t} result${t === 1 ? '' : 's'}`;
  }

  function renderProviderHeader(provider) {
    $('#provider-name').innerHTML = escapeHtml(provider.name) + ' <span>· CineVerse</span>';
    document.title = `${provider.name} — CineVerse`;

    const country = i18n.getCountry();
    $('#provider-meta').textContent = i18n.getLang() === 'ar'
      ? `محتوى رسمي من ${provider.name} في ${country}`
      : `Official titles on ${provider.name} in ${country}`;

    // Try to load logo from TMDB
    const providerLogoEl = $('#provider-logo');
    // Fallback: initial letter
    providerLogoEl.innerHTML = `<span style="font-size:28px;font-weight:800;color:var(--brand);">${escapeHtml(provider.name.charAt(0))}</span>`;

    if (provider.official_url) {
      const btn = $('#provider-official-btn');
      btn.href = provider.official_url;
      btn.style.display = 'inline-flex';
    }
  }

  function updateFilterTabs() {
    document.querySelectorAll('.filter-tab').forEach((btn) => {
      const active = btn.dataset.type === state.type;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
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
        loadTitles();
      });
    });

    const sortSel = $('#sort-select');
    if (sortSel) {
      sortSel.addEventListener('change', () => {
        state.sort = sortSel.value;
        state.page = 1;
        writeStateToURL();
        loadTitles();
      });
    }
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
          loadTitles();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      return btn;
    };

    el.appendChild(makeBtn('‹', state.page - 1, { disabled: state.page <= 1 }));
    const start = Math.max(1, state.page - 2);
    const end   = Math.min(state.totalPages, state.page + 2);
    for (let p = start; p <= end; p++) {
      el.appendChild(makeBtn(String(p), p, { active: p === state.page }));
    }
    el.appendChild(makeBtn('›', state.page + 1, { disabled: state.page >= state.totalPages }));
  }

  async function loadTitles() {
    if (state.loading) return;
    if (!state.slug) {
      renderError('لم يتم تحديد منصة في الرابط (?slug=netflix)');
      return;
    }

    state.loading = true;
    $('#results').setAttribute('aria-busy', 'true');
    renderSkeletons(12);

    try {
      const country = i18n.getCountry();
      const params = new URLSearchParams({
        type: state.type,
        country: country,
        page: String(state.page),
        sort: state.sort,
      });

      const payload = await api.request(`/api/providers/${encodeURIComponent(state.slug)}/titles?${params}`);
      const items = payload?.data || [];
      const meta  = payload?.meta || {};

      if (meta.provider) {
        state.provider = meta.provider;
        renderProviderHeader(meta.provider);
      }

      state.totalResults = meta.total_results || items.length;
      state.totalPages   = Math.min(meta.total_pages || 1, 500);

      renderCards(items);
      renderResultsInfo();
      renderPagination();
    } catch (err) {
      console.error('[provider] failed:', err);
      renderError(err.message);
    } finally {
      state.loading = false;
      $('#results').setAttribute('aria-busy', 'false');
    }
  }

  async function loadProviderInfo() {
    if (!state.slug) return;
    try {
      const payload = await api.request(`/api/providers/${encodeURIComponent(state.slug)}`);
      state.provider = payload?.data || null;
      if (state.provider) renderProviderHeader(state.provider);
    } catch (err) {
      console.error('[provider] info failed:', err);
    }
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
      select.addEventListener('change', () => {
        i18n.setCountry(select.value);
        state.page = 1;
        loadTitles();
      });
    } catch (err) { console.error('[provider] countries:', err); }
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

  function handlePopState() {
    readStateFromURL();
    updateFilterTabs();
    loadTitles();
  }

  function boot() {
    readStateFromURL();
    updateFilterTabs();
    initFilters();
    initMobileMenu();
    initCountrySelector();
    window.addEventListener('popstate', handlePopState);

    loadProviderInfo();
    loadTitles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);