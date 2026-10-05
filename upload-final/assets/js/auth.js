/* ============================================================
   CineVerse — Auth Helper
   Loaded on every page. Manages session state + Header menu.
   ============================================================ */

(function (window, document) {
  'use strict';

  const api = window.CineVerseAPI;
  if (!api) {
    console.error('[CineVerse] api.js is not loaded');
    return;
  }

  // ---------- State ----------
  let currentUser = null;
  let ready = false;
  const readyCallbacks = [];

  // ---------- Public API ----------
  const Auth = {
    async init() {
      try {
        const payload = await api.request('/api/auth/me');
        currentUser = payload?.data?.user || null;
      } catch {
        currentUser = null;
      }
      ready = true;
      renderHeaderUser();
      readyCallbacks.forEach((cb) => { try { cb(currentUser); } catch (e) { console.error(e); } });
      window.dispatchEvent(new CustomEvent('cineverse:auth-ready', { detail: { user: currentUser } }));
      return currentUser;
    },

    onReady(cb) {
      if (ready) return cb(currentUser);
      readyCallbacks.push(cb);
    },

    user() { return currentUser; },
    isLoggedIn() { return currentUser !== null; },

    async register({ email, password, display_name, country, lang }) {
      const payload = await api.request('/api/auth/register', {
        method: 'POST',
        body: { email, password, display_name, country, lang },
      });
      currentUser = payload?.data?.user || null;
      renderHeaderUser();
      window.dispatchEvent(new CustomEvent('cineverse:auth-change', { detail: { user: currentUser } }));
      return currentUser;
    },

    async login({ email, password }) {
      const payload = await api.request('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      currentUser = payload?.data?.user || null;
      renderHeaderUser();
      window.dispatchEvent(new CustomEvent('cineverse:auth-change', { detail: { user: currentUser } }));
      return currentUser;
    },

    async logout() {
      try {
        await api.request('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        console.warn('[auth] logout error:', e);
      }
      currentUser = null;
      renderHeaderUser();
      window.dispatchEvent(new CustomEvent('cineverse:auth-change', { detail: { user: null } }));
    },
  };

  // ---------- Header integration ----------
  function renderHeaderUser() {
    const slot = document.getElementById('header-user-slot');
    if (!slot) return;

    if (currentUser) {
      const name = currentUser.display_name || currentUser.email || 'User';
      const initial = name.charAt(0).toUpperCase();

      slot.innerHTML = `
        <div class="user-menu">
          <button class="user-menu__trigger" id="user-menu-trigger" aria-haspopup="true" aria-expanded="false">
            <span class="user-menu__avatar">${escapeHtml(initial)}</span>
            <span class="user-menu__name">${escapeHtml(name)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <div class="user-menu__dropdown" id="user-menu-dropdown" hidden>
            <a href="profile.html">الملف الشخصي</a>
            <a href="watchlist.html">قائمة المشاهدة</a>
            <button type="button" id="user-logout-btn">تسجيل الخروج</button>
          </div>
        </div>
      `;

      const trigger   = document.getElementById('user-menu-trigger');
      const dropdown  = document.getElementById('user-menu-dropdown');
      const logoutBtn = document.getElementById('user-logout-btn');

      trigger?.addEventListener('click', (e) => {
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
        dropdown?.setAttribute('hidden', '');
        trigger?.setAttribute('aria-expanded', 'false');
      });

      logoutBtn?.addEventListener('click', async () => {
        await Auth.logout();
        window.location.href = 'index.html';
      });
    } else {
      slot.innerHTML = `
        <a href="login.html" class="btn btn--ghost btn--sm" style="height:38px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <span>دخول</span>
        </a>
      `;
    }
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

  // ---------- Inject user-menu styles (once) ----------
  function injectStyles() {
    if (document.getElementById('auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'auth-styles';
    style.textContent = `
      .user-menu { position: relative; }
      .user-menu__trigger {
        display: inline-flex; align-items: center; gap: 8px;
        height: 38px; padding-inline: 6px 12px;
        background-color: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: var(--radius-full);
        color: var(--text-primary);
        font-size: var(--fs-sm); font-weight: var(--fw-medium);
        cursor: pointer;
        transition: background-color var(--t-fast), border-color var(--t-fast);
      }
      .user-menu__trigger:hover { background-color: var(--bg-hover); border-color: var(--border-strong); }
      .user-menu__avatar {
        width: 26px; height: 26px; border-radius: 50%;
        background: var(--gradient-brand);
        color: #fff; font-weight: var(--fw-bold);
        display: grid; place-items: center;
        font-size: 12px;
      }
      .user-menu__name {
        max-width: 100px; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap;
      }
      .user-menu__dropdown {
        position: absolute; top: calc(100% + 8px);
        inset-inline-end: 0;
        min-width: 200px;
        background-color: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        padding: var(--sp-2);
        z-index: 200;
        animation: menu-in 180ms ease;
      }
      .user-menu__dropdown a,
      .user-menu__dropdown button {
        display: block; width: 100%;
        padding: 10px 14px;
        font-size: var(--fs-sm);
        text-align: start;
        background: none; border: none;
        color: var(--text-primary);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background-color var(--t-fast);
      }
      .user-menu__dropdown a:hover,
      .user-menu__dropdown button:hover { background-color: var(--bg-hover); }
      .user-menu__dropdown button#user-logout-btn { color: var(--error); }
      @keyframes menu-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- Auto-init ----------
  function boot() {
    injectStyles();
    Auth.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CineVerseAuth = Auth;
})(window, document);