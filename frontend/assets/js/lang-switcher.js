/* ============================================================
   CineVerse — Language Switcher
   Injects a language dropdown into the site header automatically.
   ============================================================ */

(function (window, document) {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  const LANGS = [
    { code: 'ar', label: 'العربية', short: 'AR', flag: '🇸🇦' },
    { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
    { code: 'tr', label: 'Türkçe',  short: 'TR', flag: '🇹🇷' },
  ];

  function injectStyles() {
    if (document.getElementById('lang-switcher-styles')) return;
    const style = document.createElement('style');
    style.id = 'lang-switcher-styles';
    style.textContent = `
      .lang-switcher { position: relative; }
      .lang-switcher__trigger {
        display: inline-flex; align-items: center; gap: 6px;
        height: 40px; padding-inline: 12px;
        background-color: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--fs-sm); font-weight: var(--fw-semibold);
        cursor: pointer;
        transition: background-color var(--t-fast), border-color var(--t-fast);
      }
      .lang-switcher__trigger:hover {
        background-color: var(--bg-hover);
        border-color: var(--border-strong);
      }
      .lang-switcher__flag { font-size: 16px; line-height: 1; }
      .lang-switcher__short { min-width: 24px; text-align: center; }
      .lang-switcher__dropdown {
        position: absolute; top: calc(100% + 8px);
        inset-inline-end: 0;
        min-width: 160px;
        background-color: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        padding: var(--sp-2);
        z-index: 300;
        animation: lang-in 160ms ease;
      }
      .lang-switcher__dropdown[hidden] { display: none; }
      .lang-switcher__option {
        display: flex; align-items: center; gap: 10px;
        width: 100%; padding: 10px 12px;
        background: none; border: none; cursor: pointer;
        color: var(--text-primary);
        border-radius: var(--radius-sm);
        font-size: var(--fs-sm);
        text-align: start;
        transition: background-color var(--t-fast);
      }
      .lang-switcher__option:hover { background-color: var(--bg-hover); }
      .lang-switcher__option.is-active {
        background-color: var(--brand-soft);
        color: var(--brand);
        font-weight: var(--fw-semibold);
      }
      .lang-switcher__option-check {
        margin-inline-start: auto;
        color: var(--brand);
        font-weight: var(--fw-bold);
      }
      @keyframes lang-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @media (max-width: 640px) {
        .lang-switcher__short { display: none; }
        .lang-switcher__trigger { padding-inline: 8px; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildSwitcher() {
    const i18n = window.CineVerseI18n;
    if (!i18n) {
      console.error('[lang-switcher] i18n.js not loaded');
      return null;
    }

    const current = i18n.getLang();
    const currentMeta = LANGS.find((l) => l.code === current) || LANGS[0];

    const wrap = document.createElement('div');
    wrap.className = 'lang-switcher';
    wrap.innerHTML = `
      <button type="button" class="lang-switcher__trigger"
              id="lang-trigger" aria-haspopup="true" aria-expanded="false" title="Language">
        <span class="lang-switcher__flag">${currentMeta.flag}</span>
        <span class="lang-switcher__short">${currentMeta.short}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      <div class="lang-switcher__dropdown" id="lang-dropdown" hidden>
        ${LANGS.map((l) => `
          <button type="button" class="lang-switcher__option ${l.code === current ? 'is-active' : ''}"
                  data-lang="${l.code}">
            <span class="lang-switcher__flag">${l.flag}</span>
            <span>${escapeHtml(l.label)}</span>
            ${l.code === current ? '<span class="lang-switcher__option-check">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
    `;

    // Events
    const trigger  = wrap.querySelector('#lang-trigger');
    const dropdown = wrap.querySelector('#lang-dropdown');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = dropdown.hasAttribute('hidden');
      if (isHidden) {
        dropdown.removeAttribute('hidden');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        dropdown.setAttribute('hidden', '');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', () => {
      dropdown.setAttribute('hidden', '');
      trigger.setAttribute('aria-expanded', 'false');
    });

    dropdown.querySelectorAll('.lang-switcher__option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (lang && lang !== current) {
          i18n.setLang(lang); // will reload page
        }
      });
    });

    return wrap;
  }

  function mount() {
    injectStyles();

    // Find the actions container
    const actions = document.querySelector('.site-header__actions');
    if (!actions) {
      return;
    }

    // Insert before the user slot or at end (best-effort)
    const switcher = buildSwitcher();
    if (!switcher) return;

    const userSlot = actions.querySelector('#header-user-slot');
    if (userSlot) {
      actions.insertBefore(switcher, userSlot);
    } else {
      actions.appendChild(switcher);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(window, document);