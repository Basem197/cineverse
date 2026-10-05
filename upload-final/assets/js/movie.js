/* ============================================================
   CineVerse — Movie Details Page
   ============================================================ */

(function (window, document) {
  'use strict';

  const api     = window.CineVerseAPI;
  const i18n    = window.CineVerseI18n;
  const Trailer = window.CineVerseTrailer;
  const Auth    = window.CineVerseAuth;

  if (!api) {
    console.error('[CineVerse] api.js is not loaded');
    return;
  }

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const state = {
    tmdbId: null,
    data:   null,
  };

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

  function formatRuntime(minutes) {
    if (!minutes || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}د`;
    if (m === 0) return `${h}س`;
    return `${h}س ${m}د`;
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

  function formatNumber(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  // ---------- Render ----------
  function renderHero(d) {
    const posterEl = $('#title-poster');
    if (d.poster) {
      posterEl.src = d.poster;
      posterEl.alt = d.title || '';
    } else {
      posterEl.closest('.title-hero__poster').style.display = 'none';
    }

    if (d.backdrop) {
      $('#title-backdrop').style.backgroundImage = `url("${d.backdrop}")`;
    }

    $('#title-type-eyebrow').innerHTML =
      `<span style="width:28px;height:2px;background:var(--brand);border-radius:2px;"></span> فيلم`;

    $('#title-name').textContent = d.title || 'Untitled';

    if (d.original_title && d.original_title !== d.title) {
      const o = $('#title-original');
      o.textContent = d.original_title;
      o.style.display = 'block';
    }

    const parts = [];
    if (d.year) parts.push(`<span>${d.year}</span>`);
    if (d.release_date) parts.push(`<span>${escapeHtml(formatDate(d.release_date))}</span>`);
    if (d.runtime) parts.push(`<span>${formatRuntime(d.runtime)}</span>`);
    if (d.rating && d.rating > 0) {
      parts.push(`
        <span class="title-hero__rating">
          <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          ${d.rating.toFixed(1)}
        </span>
      `);
    }
    if (d.votes) parts.push(`<span>${formatNumber(d.votes)} تقييم</span>`);
    $('#title-meta').innerHTML = parts.join('');

    if (d.tagline) {
      const t = $('#title-tagline');
      t.textContent = d.tagline;
      t.style.display = 'block';
    }

    if (Array.isArray(d.genres) && d.genres.length) {
      const c = $('#title-genres');
      c.innerHTML = '';
      d.genres.forEach((g) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.cursor = 'default';
        chip.textContent = g.name;
        c.appendChild(chip);
      });
    }
  }

  function renderOverview(d) {
    const o = $('#title-overview');
    if (d.overview) {
      o.textContent = d.overview;
    } else {
      o.textContent = 'لا يوجد وصف متاح لهذا الفيلم.';
      o.style.color = 'var(--text-muted)';
    }
  }

  function renderCast(d) {
    if (!Array.isArray(d.cast) || !d.cast.length) return;
    $('#section-cast').style.display = 'block';
    const list = $('#cast-list');
    list.innerHTML = '';
    d.cast.slice(0, 15).forEach((p) => {
      const div = document.createElement('div');
      div.className = 'cast-card';
      const photoHtml = p.profile
        ? `<img src="${escapeHtml(p.profile)}" alt="${escapeHtml(p.name || '')}" loading="lazy">`
        : `<div class="cast-card__photo--empty">${escapeHtml((p.name || '?').charAt(0))}</div>`;
      div.innerHTML = `
        <div class="cast-card__photo">${photoHtml}</div>
        <div class="cast-card__name">${escapeHtml(p.name || '')}</div>
        <div class="cast-card__role">${escapeHtml(p.character || '')}</div>
      `;
      list.appendChild(div);
    });
  }

  function renderDirectors(d) {
    if (!Array.isArray(d.directors) || !d.directors.length) return;
    $('#section-directors').style.display = 'block';
    const list = $('#directors-list');
    list.innerHTML = '';
    d.directors.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'director-card';
      const photoHtml = p.profile
        ? `<img src="${escapeHtml(p.profile)}" alt="${escapeHtml(p.name || '')}" loading="lazy">`
        : '';
      div.innerHTML = `
        <div class="director-card__photo">${photoHtml}</div>
        <div class="director-card__name">${escapeHtml(p.name || '')}</div>
      `;
      list.appendChild(div);
    });
  }

  function renderSimilar(d) {
    if (!Array.isArray(d.similar) || !d.similar.length) return;
    $('#section-similar').style.display = 'block';
    const list = $('#similar-list');
    list.innerHTML = '';
    d.similar.slice(0, 12).forEach((item) => {
      const isSeries = item.type === 'tv';
      const a = document.createElement('a');
      a.className = 'card';
      a.href = isSeries ? `series.html?id=${item.tmdb_id}` : `movie.html?id=${item.tmdb_id}`;

      const posterHtml = item.poster
        ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title || '')}" loading="lazy">`
        : `<div class="card__poster--empty">لا يوجد غلاف</div>`;

      const ratingHtml = (item.rating > 0)
        ? `<span class="card__rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${item.rating.toFixed(1)}</span>`
        : '';

      a.innerHTML = `
        <div class="card__poster">
          ${posterHtml}
          ${ratingHtml}
        </div>
        <div class="card__body">
          <h3 class="card__title">${escapeHtml(item.title || '')}</h3>
          <div class="card__meta">${item.year ? `<span>${item.year}</span>` : ''}</div>
        </div>
      `;
      list.appendChild(a);
    });
  }

  async function renderAvailability(d) {
    const country = i18n.getCountry();
    const offersEl = $('#watch-offers');
    $('#watch-country-label').textContent = country;

    try {
      const payload = await api.availability(d.tmdb_id, country, { type: 'movie' });
      const data = payload?.data || {};

      if (!Array.isArray(data.offers) || data.offers.length === 0) {
        offersEl.innerHTML = `<p style="color:var(--text-muted);font-size:var(--fs-sm);line-height:1.5;">لا تتوفر بيانات مشاهدة رسمية لهذا العمل في ${escapeHtml(country)} حاليًا.</p>`;
        return;
      }

      const grouped = { flatrate: [], free: [], ads: [], rent: [], buy: [] };
      data.offers.forEach((o) => { if (grouped[o.offer_type]) grouped[o.offer_type].push(o); });

      const labels = {
        flatrate: 'ضمن الاشتراك',
        free:     'مجانًا',
        ads:      'مجانًا بإعلانات',
        rent:     'استئجار',
        buy:      'شراء',
      };

      offersEl.innerHTML = '';
      Object.keys(grouped).forEach((type) => {
        if (!grouped[type].length) return;
        const heading = document.createElement('div');
        heading.style.cssText = 'font-size:var(--fs-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin:var(--sp-4) 0 var(--sp-2);';
        if (offersEl.children.length > 0) heading.style.marginTop = 'var(--sp-5)';
        heading.textContent = labels[type];
        offersEl.appendChild(heading);

        grouped[type].forEach((offer) => {
          const row = document.createElement('div');
          row.className = 'watch-offer';
          const logoHtml = offer.provider.logo
            ? `<img src="${escapeHtml(offer.provider.logo)}" alt="" loading="lazy">`
            : `<span style="font-size:11px;font-weight:700;color:var(--text-secondary);">${escapeHtml((offer.provider.name || '?').slice(0, 3))}</span>`;
          const url = offer.deep_link || offer.provider.official_url || data.link || '#';
          const isExternal = url.startsWith('http');
          row.innerHTML = `
            <div class="watch-offer__info">
              <div class="watch-offer__logo">${logoHtml}</div>
              <div style="min-width:0;">
                <div class="watch-offer__name">${escapeHtml(offer.provider.name || '')}</div>
                <div class="watch-offer__type">${escapeHtml(labels[type])}</div>
              </div>
            </div>
            <a href="${escapeHtml(url)}" class="btn btn--secondary watch-offer__cta"
               ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>اذهب</a>
          `;
          offersEl.appendChild(row);
        });
      });

      if (data.link) {
        const attr = document.createElement('p');
        attr.style.cssText = 'font-size:11px;color:var(--text-disabled);margin-top:var(--sp-5);text-align:center;';
        attr.innerHTML = `بيانات التوفر من <a href="${escapeHtml(data.link)}" target="_blank" rel="noopener" style="color:var(--brand);">TMDB</a>`;
        offersEl.appendChild(attr);
      }
    } catch (err) {
      console.error('[movie] availability:', err);
      offersEl.innerHTML = `<p style="color:var(--text-muted);font-size:var(--fs-sm);">تعذر تحميل بيانات التوفر.</p>`;
    }
  }

  // ---------- Watchlist Button ----------
  async function initWatchlistButton() {
    const btn = document.getElementById('add-watchlist-btn');
    if (!btn || !state.data) return;

    const tmdbId    = state.data.tmdb_id;
    const mediaType = 'movie';

    // Wait for auth
    const user = await new Promise((res) => {
      if (!Auth) return res(null);
      Auth.onReady(res);
    });

    if (!user) {
      btn.addEventListener('click', () => {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?redirect=${redirect}`;
      });
      return;
    }

    // Check current state
    try {
      const r = await api.request(`/api/watchlist/check/${tmdbId}?media_type=${mediaType}`);
      const inList = r?.data?.in_watchlist === true;
      setBtnState(inList);
    } catch (e) {
      console.warn('[watchlist] check failed:', e);
    }

    btn.addEventListener('click', async () => {
      const saved = btn.dataset.saved === '1';
      btn.disabled = true;
      try {
        if (saved) {
          await api.request(`/api/watchlist/${tmdbId}?media_type=${mediaType}`, { method: 'DELETE' });
          setBtnState(false);
        } else {
          await api.request('/api/watchlist', {
            method: 'POST',
            body: {
              tmdb_id:     tmdbId,
              media_type:  mediaType,
              title:       state.data.title,
              poster_path: state.data.poster,   // full URL — we store it as-is
              year:        state.data.year,
              rating:      state.data.rating,
            },
          });
          setBtnState(true);
        }
      } catch (e) {
        console.error('[watchlist] toggle failed:', e);
      } finally {
        btn.disabled = false;
      }
    });

    function setBtnState(saved) {
      btn.dataset.saved = saved ? '1' : '0';
      const span = btn.querySelector('span');
      if (span) span.textContent = saved ? 'محفوظ ✓' : 'حفظ';
      btn.classList.toggle('btn--primary', saved);
      btn.classList.toggle('btn--secondary', !saved);
    }
  }

  // ---------- Load ----------
  async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id') || '0', 10);

    if (!id || isNaN(id)) {
      showError('معرف غير صالح', 'لم يتم توفير معرف فيلم صحيح.');
      return;
    }

    state.tmdbId = id;

    try {
      const payload = await api.title(id, { type: 'movie' });
      const data = payload?.data;
      if (!data) {
        showError('غير موجود', 'لم يتم العثور على هذا الفيلم.');
        return;
      }

      state.data = data;
      document.title = `${data.title || 'Untitled'} — CineVerse`;

      renderHero(data);
      renderOverview(data);
      renderCast(data);
      renderDirectors(data);
      renderSimilar(data);
      renderAvailability(data);

      // Trailer
      const trailerBtn = $('#watch-trailer-btn');
      trailerBtn.style.display = 'inline-flex';
      trailerBtn.addEventListener('click', () => {
        Trailer?.open(data.tmdb_id, 'movie', data.title);
      });

      // Watchlist (after data ready)
      initWatchlistButton();

      $('#loading-state').style.display = 'none';
      $('#content').style.display = 'block';
      $('#main').setAttribute('aria-busy', 'false');

    } catch (err) {
      console.error('[movie] load failed:', err);
      showError('تعذر التحميل', err.message || 'حدث خطأ أثناء تحميل تفاصيل الفيلم.');
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
      select.addEventListener('change', () => {
        i18n.setCountry(select.value);
        if (state.data) renderAvailability(state.data);
      });
    } catch (err) {
      console.error('[movie] countries:', err);
    }
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

  function boot() {
    initMobileMenu();
    initCountrySelector();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);