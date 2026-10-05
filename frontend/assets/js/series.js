/* ============================================================
   CineVerse — Series Details Page
   ============================================================ */

(function (window, document) {
  'use strict';

  const api     = window.CineVerseAPI;
  const i18n    = window.CineVerseI18n;
  const Trailer = window.CineVerseTrailer;
  const Auth    = window.CineVerseAuth;

  if (!api) { console.error('[CineVerse] api.js is not loaded'); return; }

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const state = {
    tmdbId: null,
    data:   null,
    currentSeason: null,
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
        { year: 'numeric', month: 'short', day: 'numeric' }
      );
    } catch { return iso; }
  }

  function formatNumber(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  function formatRuntime(min) { if (!min) return null; return `${min}د`; }

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
      `<span style="width:28px;height:2px;background:var(--brand);border-radius:2px;"></span> مسلسل`;

    $('#title-name').textContent = d.title || 'Untitled';

    if (d.original_title && d.original_title !== d.title) {
      const o = $('#title-original');
      o.textContent = d.original_title;
      o.style.display = 'block';
    }

    const parts = [];
    if (d.year) parts.push(`<span>${d.year}</span>`);
    if (d.release_date) parts.push(`<span>${escapeHtml(formatDate(d.release_date))}</span>`);
    if (d.status) parts.push(`<span>${escapeHtml(d.status)}</span>`);
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
      o.textContent = 'لا يوجد وصف متاح.';
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

  function renderCreators(d) {
    const creators = d.creators || d.created_by || [];
    if (!Array.isArray(creators) || !creators.length) return;
    $('#section-creators').style.display = 'block';
    const list = $('#creators-list');
    list.innerHTML = '';
    creators.forEach((p) => {
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

  // ---------- Admin Data ----------
  function renderAdminData(d) {
    const vipBadge = $('#vip-badge');
    if (vipBadge) {
      vipBadge.style.display = d.is_vip ? 'inline-flex' : 'none';
    }

    if (d.hide_ads) {
      document.querySelectorAll('.ad-slot').forEach((el) => { el.style.display = 'none'; });
    }

    const section = $('#section-watch-options');
    const list = $('#watch-options-list');
    if (!section || !list) return;

    if (!Array.isArray(d.watch_options) || d.watch_options.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    list.innerHTML = '';

    d.watch_options.forEach((opt) => {
      const row = document.createElement('a');
      row.href = opt.url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      row.className = 'watch-offer';
      row.style.textDecoration = 'none';
      row.style.cursor = 'pointer';

      row.innerHTML = `
        <div class="watch-offer__info">
          <div class="watch-offer__logo" style="background:${escapeHtml(opt.color)}; color:#fff; font-weight:800; font-size:14px;">
            ${escapeHtml(opt.logo || opt.name.charAt(0))}
          </div>
          <div>
            <div class="watch-offer__name">${escapeHtml(opt.name)}</div>
            <div class="watch-offer__type">مشاهدة رسمية</div>
          </div>
        </div>
        <span class="btn btn--primary watch-offer__cta">شاهد</span>
      `;

      list.appendChild(row);
    });
  }

  function renderSeasonsTabs(seasons) {
    const tabs = $('#seasons-tabs');
    tabs.innerHTML = '';
    const real = seasons.filter((s) => s.season_number > 0);
    const list = real.length ? real : seasons;
    if (!list.length) { $('#section-seasons').style.display = 'none'; return; }
    list.forEach((s) => {
      const btn = document.createElement('button');
      btn.className = 'season-tab';
      btn.dataset.num = s.season_number;
      btn.textContent = s.name || `الموسم ${s.season_number}`;
      btn.addEventListener('click', () => loadSeason(s.season_number));
      tabs.appendChild(btn);
    });
  }

  async function loadSeason(seasonNumber) {
    if (state.currentSeason === seasonNumber) return;
    state.currentSeason = seasonNumber;

    document.querySelectorAll('.season-tab').forEach((b) => {
      b.classList.toggle('is-active', parseInt(b.dataset.num, 10) === seasonNumber);
    });

    const list = $('#episodes-list');
    list.innerHTML = `<div class="episodes-loading"><div class="spinner"></div></div>`;

    try {
      const payload = await api.season(state.tmdbId, seasonNumber);
      const episodes = payload?.data || [];

      if (!episodes.length) {
        list.innerHTML = `<p style="color:var(--text-muted);padding:var(--sp-6) 0;">لا توجد حلقات متاحة لهذا الموسم.</p>`;
        return;
      }

      list.innerHTML = '';
      episodes.forEach((ep) => {
        const div = document.createElement('div');
        div.className = 'episode';
        const stillHtml = ep.still
          ? `<img src="${escapeHtml(ep.still)}" alt="" loading="lazy">`
          : `<div class="episode__still--empty">لا توجد صورة</div>`;
        const ratingHtml = (ep.rating > 0)
          ? `<span class="episode__rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${ep.rating.toFixed(1)}</span>`
          : '';
        div.innerHTML = `
          <div class="episode__still">
            ${stillHtml}
            <span class="episode__num">حلقة ${ep.episode_number}</span>
          </div>
          <div class="episode__body">
            <h3 class="episode__title">${escapeHtml(ep.name || `حلقة ${ep.episode_number}`)}</h3>
            <div class="episode__meta">
              ${ep.air_date ? `<span>${escapeHtml(formatDate(ep.air_date))}</span>` : ''}
              ${ep.runtime ? `<span>${formatRuntime(ep.runtime)}</span>` : ''}
              ${ratingHtml}
            </div>
            <p class="episode__overview">${escapeHtml(ep.overview || 'لا يوجد وصف للحلقة.')}</p>
          </div>
        `;
        list.appendChild(div);
      });
    } catch (err) {
      console.error('[series] season load failed:', err);
      list.innerHTML = `<p style="color:var(--error);padding:var(--sp-6) 0;">تعذر تحميل الحلقات: ${escapeHtml(err.message)}</p>`;
    }
  }

  async function renderAvailability(d) {
    const country = i18n.getCountry();
    const offersEl = $('#watch-offers');
    $('#watch-country-label').textContent = country;

    try {
      const payload = await api.availability(d.tmdb_id, country, { type: 'tv' });
      const data = payload?.data || {};

      if (!Array.isArray(data.offers) || data.offers.length === 0) {
        offersEl.innerHTML = `<p style="color:var(--text-muted);font-size:var(--fs-sm);line-height:1.5;">لا تتوفر بيانات مشاهدة رسمية لهذا المسلسل في ${escapeHtml(country)} حاليًا.</p>`;
        return;
      }

      const grouped = { flatrate: [], free: [], ads: [], rent: [], buy: [] };
      data.offers.forEach((o) => { if (grouped[o.offer_type]) grouped[o.offer_type].push(o); });
      const labels = { flatrate: 'ضمن الاشتراك', free: 'مجانًا', ads: 'مجانًا بإعلانات', rent: 'استئجار', buy: 'شراء' };

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
    } catch (err) { console.error('[series] availability:', err); }
  }

  async function initWatchlistButton() {
    const btn = document.getElementById('add-watchlist-btn');
    if (!btn || !state.data) return;

    const tmdbId    = state.data.tmdb_id;
    const mediaType = 'tv';

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

    try {
      const r = await api.request(`/api/watchlist/check/${tmdbId}?media_type=${mediaType}`);
      setBtnState(r?.data?.in_watchlist === true);
    } catch (e) { console.warn(e); }

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
              tmdb_id: tmdbId, media_type: mediaType,
              title: state.data.title, poster_path: state.data.poster,
              year: state.data.year, rating: state.data.rating,
            },
          });
          setBtnState(true);
        }
      } catch (e) { console.error(e); }
      finally { btn.disabled = false; }
    });

    function setBtnState(saved) {
      btn.dataset.saved = saved ? '1' : '0';
      const span = btn.querySelector('span');
      if (span) span.textContent = saved ? 'محفوظ ✓' : 'حفظ';
      btn.classList.toggle('btn--primary', saved);
      btn.classList.toggle('btn--secondary', !saved);
    }
  }

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id') || '0', 10);

    if (!id || isNaN(id)) { showError('معرف غير صالح', 'لم يتم توفير معرف مسلسل صحيح.'); return; }

    state.tmdbId = id;

    try {
      const payload = await api.title(id, { type: 'tv' });
      const data = payload?.data;
      if (!data) { showError('غير موجود', 'لم يتم العثور على هذا المسلسل.'); return; }

      state.data = data;
      document.title = `${data.title || 'Untitled'} — CineVerse`;

      renderHero(data);
      renderOverview(data);
      renderCast(data);
      renderCreators(data);
      renderSimilar(data);
      renderAvailability(data);
      renderAdminData(data);

      const seasons = Array.isArray(data.seasons) ? data.seasons : [];
      renderSeasonsTabs(seasons);
      const first = seasons.find((s) => s.season_number > 0) || seasons[0];
      if (first) loadSeason(first.season_number);
      else $('#section-seasons').style.display = 'none';

      const btn = $('#watch-trailer-btn');
      btn.style.display = 'inline-flex';
      btn.addEventListener('click', () => Trailer?.open(data.tmdb_id, 'tv', data.title));

      initWatchlistButton();

      $('#loading-state').style.display = 'none';
      $('#content').style.display = 'block';
      $('#main').setAttribute('aria-busy', 'false');

    } catch (err) {
      console.error('[series] load failed:', err);
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
        const name = lang === 'ar' ? c.name_ar : lang === 'tr' ? (c.name_tr || c.name_en) : c.name_en;
        opt.textContent = `${c.flag_emoji || ''} ${name}`.trim();
        select.appendChild(opt);
      });
      select.value = i18n.getCountry();
      select.addEventListener('change', () => {
        i18n.setCountry(select.value);
        if (state.data) renderAvailability(state.data);
      });
    } catch (err) { console.error(err); }
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