/* ============================================================
   CineVerse — Actor (Person) Details Page
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
    personId: null,
    data: null,
    filter: 'all',
  };

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatDate(iso) {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(
        i18n.getLang() === 'ar' ? 'ar-EG' : i18n.getLang() === 'tr' ? 'tr-TR' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
    } catch { return iso; }
  }

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
          ${item.character ? `<span>${escapeHtml(item.character)}</span>` : ''}
        </div>
      </div>
    `;
    return a;
  }

  function renderHero(d) {
    document.title = `${d.name || 'Person'} — CineVerse`;

    const photoEl = $('#actor-photo');
    if (d.profile) {
      photoEl.innerHTML = `<img src="${escapeHtml(d.profile)}" alt="${escapeHtml(d.name || '')}">`;
    } else {
      photoEl.innerHTML = `<div class="actor-hero__photo--empty">${escapeHtml((d.name || '?').charAt(0))}</div>`;
    }

    $('#actor-name').innerHTML = escapeHtml(d.name || 'Unknown');

    if (d.department) {
      const deptEl = $('#actor-dept');
      deptEl.textContent = d.department;
      deptEl.style.display = 'inline-block';
    }

    const meta = [];
    if (d.birthday) {
      meta.push(`<span class="actor-hero__meta-item">🎂 ${escapeHtml(formatDate(d.birthday))}</span>`);
    }
    if (d.place_of_birth) {
      meta.push(`<span class="actor-hero__meta-item">📍 ${escapeHtml(d.place_of_birth)}</span>`);
    }
    if (d.deathday) {
      meta.push(`<span class="actor-hero__meta-item">🕊️ ${escapeHtml(formatDate(d.deathday))}</span>`);
    }
    $('#actor-meta').innerHTML = meta.join('');

    if (d.biography && d.biography.trim().length > 0) {
      const bioEl = $('#actor-bio');
      bioEl.textContent = d.biography;
      bioEl.style.display = 'block';

      if (d.biography.length > 400) {
        const toggle = $('#bio-toggle');
        toggle.style.display = 'inline-block';
        toggle.addEventListener('click', () => {
          const expanded = bioEl.classList.toggle('is-expanded');
          toggle.textContent = expanded ? 'إظهار أقل' : 'اقرأ المزيد';
        });
      }
    }
  }

  function renderWorks() {
    if (!state.data || !Array.isArray(state.data.works)) return;

    const grid = $('#works-grid');
    const filtered = state.filter === 'all'
      ? state.data.works
      : state.data.works.filter((w) => w.type === state.filter);

    if (!filtered.length) {
      grid.innerHTML = `<div class="state" style="grid-column: 1 / -1;">
        <div class="state__title">لا توجد أعمال في هذا القسم</div>
      </div>`;
      return;
    }

    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    filtered.forEach((w) => frag.appendChild(buildCard(w)));
    grid.appendChild(frag);
  }

  function initFilters() {
    document.querySelectorAll('.works-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const f = tab.dataset.filter;
        if (f === state.filter) return;
        state.filter = f;
        document.querySelectorAll('.works-tab').forEach((t) => {
          t.classList.toggle('is-active', t.dataset.filter === f);
        });
        renderWorks();
      });
    });
  }

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id') || '0', 10);

    if (!id || isNaN(id)) {
      showError('معرف غير صالح', 'لم يتم توفير معرف صحيح.');
      return;
    }

    state.personId = id;

    try {
      const payload = await api.request(`/api/persons/${id}`);
      const data = payload?.data;

      if (!data) {
        showError('غير موجود', 'لم يتم العثور على هذا الشخص.');
        return;
      }

      state.data = data;
      renderHero(data);
      renderWorks();

      $('#loading-state').style.display = 'none';
      $('#content').style.display = 'block';
      $('#main').setAttribute('aria-busy', 'false');

    } catch (err) {
      console.error('[actor] load failed:', err);
      showError('تعذر التحميل', err.message || 'حدث خطأ.');
    }
  }

  function showError(title, message) {
    $('#loading-state').style.display = 'none';
    $('#content').style.display = 'none';
    $('#error-state').style.display = 'block';
    $('#error-title').textContent = title;
    $('#error-message').textContent = message;
    $('#main').setAttribute('aria-busy', 'false');
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
    } catch (err) { console.error('[actor] countries:', err); }
  }

  function boot() {
    initFilters();
    initCountrySelector();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);