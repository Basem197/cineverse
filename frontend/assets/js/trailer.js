/* ============================================================
   CineVerse — Trailer Modal
   Reusable trailer player with keyboard support & focus trap
   ============================================================ */

(function (window, document) {
  'use strict';

  const api = window.CineVerseAPI;
  if (!api) {
    console.error('[CineVerse] api.js is not loaded');
    return;
  }

  // ---------- Modal elements ----------
  const modal       = document.getElementById('trailer-modal');
  const container   = document.getElementById('trailer-video-container');
  const titleEl     = document.getElementById('trailer-title');

  if (!modal || !container) {
    console.warn('[trailer] modal elements not found');
    return;
  }

  let lastFocus = null;
  let isOpen = false;

  // ---------- Public API ----------
  const Trailer = {
    /**
     * Open the trailer modal for a given TMDB title.
     *
     * @param {number} tmdbId
     * @param {'movie'|'tv'} type
     * @param {string} titleName — displayed in the modal header
     */
    async open(tmdbId, type, titleName) {
      if (!tmdbId) return;

      lastFocus = document.activeElement;
      isOpen = true;

      // Render loading state
      container.innerHTML = `
        <div style="position:absolute;inset:0;display:grid;place-items:center;background:#000;">
          <div class="spinner"></div>
        </div>
      `;
      titleEl.textContent = titleName ? `${titleName} — الإعلان` : 'الإعلان الرسمي';

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Focus close button
      const closeBtn = modal.querySelector('.modal__close');
      closeBtn?.focus();

      // Fetch trailer
      try {
        const payload = await api.trailer(tmdbId, { type });
        const data = payload?.data || {};

        if (!data.available || !data.embed_url) {
          container.innerHTML = `
            <div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;background:#000;">
              <div>
                <p style="color:var(--text-secondary);font-size:1rem;">لا يوجد إعلان رسمي متاح لهذا العمل حاليًا.</p>
              </div>
            </div>
          `;
          return;
        }

        titleEl.textContent = data.name || 'الإعلان الرسمي';

        // Auto-play only if user clicked the button
        const url = data.embed_url + '&autoplay=1';
        container.innerHTML = `
          <iframe
            src="${url}"
            title="${escapeAttr(data.name || 'Trailer')}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        `;
      } catch (err) {
        console.error('[trailer] failed:', err);
        container.innerHTML = `
          <div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;background:#000;">
            <div>
              <p style="color:var(--error);font-size:1rem;margin-bottom:8px;">تعذر تحميل الإعلان</p>
              <p style="color:var(--text-muted);font-size:0.875rem;">${escapeHtml(err.message || '')}</p>
            </div>
          </div>
        `;
      }
    },

    close() {
      if (!isOpen) return;
      isOpen = false;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      container.innerHTML = '';
      document.body.style.overflow = '';
      lastFocus?.focus?.();
      lastFocus = null;
    },

    isOpen() { return isOpen; },
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

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  // ---------- Event Listeners ----------
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-modal]')) {
      Trailer.close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      Trailer.close();
    }
  });

  // Expose globally
  window.CineVerseTrailer = Trailer;
})(window, document);