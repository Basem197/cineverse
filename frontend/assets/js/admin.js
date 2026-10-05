/* ============================================================
   CineVerse — Admin Dashboard Controller
   ============================================================ */

(function (window, document) {
  'use strict';

  const api = window.CineVerseAPI;
  if (!api) {
    console.error('[Admin] api.js not loaded');
    return;
  }

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const state = {
    admin: null,
    movies: [],
    currentTitle: null,   // { tmdb_id, ... } when editing
    currentView: 'overview',
  };

  // ============================================================
  // Auth Check
  // ============================================================
  async function checkAuth() {
    try {
      const payload = await api.request('/api/auth/me');
      const user = payload?.data?.user;

      if (!user || user.role !== 'admin') {
        showDenied();
        return null;
      }

      state.admin = user;
      $('#admin-name').textContent = user.display_name || 'Admin';
      $('#admin-email').textContent = user.email || '';
      return user;
    } catch (err) {
      showDenied();
      return null;
    }
  }

  function showDenied() {
    $('#loading-screen').classList.add('hidden');
    $('#denied-screen').classList.remove('hidden');
  }

  function showApp() {
    $('#loading-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
  }

  // ============================================================
  // Navigation
  // ============================================================
  function initNavigation() {
    $$('.nav-item').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view) switchView(view);
      });
    });
  }

  function switchView(view) {
    state.currentView = view;

    // Update nav active state
    $$('.nav-item').forEach((link) => {
      const active = link.dataset.view === view;
      link.classList.toggle('active', active);
      link.classList.toggle('text-white', active);
      link.classList.toggle('bg-dark-800', active);
      link.classList.toggle('text-gray-300', !active);
    });

    // Hide all views
    $$('.view').forEach((v) => v.classList.add('hidden'));

    // Show target view
    const target = $(`#view-${view}`);
    if (target) target.classList.remove('hidden');

    // Update page title
    const titles = {
      overview: ['Overview', 'Welcome back, admin'],
      movies:   ['Movies',   'Manage your movie catalog'],
      series:   ['Series',   'Manage your series catalog'],
      users:    ['Users',    'Manage platform users'],
      settings: ['Settings', 'Platform configuration'],
    };
    const [title, subtitle] = titles[view] || ['Admin', ''];
    $('#page-title').textContent = title;
    $('#page-subtitle').textContent = subtitle;

    // Load data if needed
    if (view === 'movies' && state.movies.length === 0) {
      loadMovies();
    }
    if (view === 'overview') {
      loadStats();
    }
  }

  // ============================================================
  // Stats (Overview)
  // ============================================================
  async function loadStats() {
    try {
      // Movies count
      const moviesRes = await api.request('/api/trending?type=movie');
      const movies = moviesRes?.data || [];
      $('#stat-movies').textContent = movies.length || '—';

      // Series count
      const seriesRes = await api.request('/api/trending?type=tv');
      const series = seriesRes?.data || [];
      $('#stat-series').textContent = series.length || '—';

      // Users count (will be available after Phase 11.3 backend)
      $('#stat-users').textContent = '—';

      // Avg rating
      const all = [...movies, ...series].filter((m) => m.rating > 0);
      if (all.length > 0) {
        const avg = all.reduce((sum, m) => sum + m.rating, 0) / all.length;
        $('#stat-rating').textContent = avg.toFixed(1);
      } else {
        $('#stat-rating').textContent = '—';
      }
    } catch (err) {
      console.error('[Admin] stats failed:', err);
    }
  }

  // ============================================================
  // Movies Table
  // ============================================================
  async function loadMovies() {
    const tbody = $('#movies-table-body');
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-12 text-center text-gray-500">
          <div class="inline-block w-6 h-6 border-2 border-dark-600 border-t-brand rounded-full animate-spin"></div>
          <p class="mt-3 text-sm">Loading movies...</p>
        </td>
      </tr>
    `;

    try {
      // ⚠️ NOTE: For now, we use /api/trending.
      // In Phase 11.2 backend, this becomes: /api/admin/titles?type=movie
      const payload = await api.request('/api/trending?type=movie');
      state.movies = payload?.data || [];

      renderMoviesTable(state.movies);

      const count = $('#movies-count');
      if (count) count.textContent = `${state.movies.length} movies`;
    } catch (err) {
      console.error('[Admin] load movies failed:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-4 py-12 text-center text-red-400">
            Failed to load movies: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  function renderMoviesTable(movies) {
    const tbody = $('#movies-table-body');

    if (!movies.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-4 py-12 text-center text-gray-500">
            No movies yet. Click "Add Movie" to create one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();

    movies.forEach((movie) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-white/[0.02] transition';
      tr.innerHTML = `
        <td class="px-4 py-3">
          <input type="checkbox" class="rounded bg-dark-700 border-surface-border" data-id="${movie.tmdb_id}">
        </td>
        <td class="px-4 py-3">
          ${movie.poster
            ? `<img src="${escapeAttr(movie.poster)}" alt="" class="w-12 h-16 object-cover rounded-md" loading="lazy">`
            : `<div class="w-12 h-16 bg-dark-700 rounded-md flex items-center justify-center text-gray-500 text-xs">—</div>`
          }
        </td>
        <td class="px-4 py-3">
          <div class="font-medium text-white">${escapeHtml(movie.title || 'Untitled')}</div>
          <div class="text-xs text-gray-500 mt-0.5">ID: ${movie.tmdb_id}</div>
        </td>
        <td class="px-4 py-3 text-gray-400">${movie.year || '—'}</td>
        <td class="px-4 py-3">
          ${movie.rating > 0
            ? `<span class="inline-flex items-center gap-1 text-yellow-400 font-medium">
                 ★ ${movie.rating.toFixed(1)}
               </span>`
            : `<span class="text-gray-500">—</span>`
          }
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1.5 px-2 py-1 bg-dark-700 rounded text-xs text-gray-400">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
            None
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-1 bg-dark-700 rounded text-xs text-gray-400">
            Free
          </span>
        </td>
        <td class="px-4 py-3 text-right">
          <div class="inline-flex items-center gap-1">
            <button data-edit="${movie.tmdb_id}" class="w-8 h-8 rounded-lg hover:bg-dark-700 flex items-center justify-center transition" title="Edit">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button data-delete="${movie.tmdb_id}" class="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition" title="Delete">
              <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
              </svg>
            </button>
          </div>
        </td>
      `;
      frag.appendChild(tr);
    });

    tbody.appendChild(frag);

    // Attach row handlers
    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.edit, 10)));
    });
    tbody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(parseInt(btn.dataset.delete, 10)));
    });
  }

  // ============================================================
  // Modal
  // ============================================================
  function openAddModal() {
    state.currentTitle = null;
    $('#modal-title').textContent = 'Add New Title';
    $('#title-form').reset();
    $('#save-btn').innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Save Title
    `;
    showModal();
  }

  function openEditModal(tmdbId) {
    const movie = state.movies.find((m) => m.tmdb_id === tmdbId);
    if (!movie) return;

    state.currentTitle = movie;
    $('#modal-title').textContent = 'Edit Title';

    const form = $('#title-form');
    form.reset();

    // Populate (fields that exist from TMDB)
    form.querySelector('[name="title"]').value = movie.title || '';
    form.querySelector('[name="type"]').value = movie.type || 'movie';
    form.querySelector('[name="tmdb_id"]').value = movie.tmdb_id || '';
    form.querySelector('[name="poster"]').value = movie.poster || '';
    form.querySelector('[name="backdrop"]').value = movie.backdrop || '';
    form.querySelector('[name="overview"]').value = movie.overview || '';
    form.querySelector('[name="year"]').value = movie.year || '';
    form.querySelector('[name="rating"]').value = movie.rating || '';

    // These will be loaded from admin override API later
    form.querySelector('[name="trailer_url"]').value = '';
    form.querySelector('[name="netflix_url"]').value = '';
    form.querySelector('[name="amazon_url"]').value = '';
    form.querySelector('[name="shahid_url"]').value = '';
    form.querySelector('[name="apple_url"]').value = '';
    form.querySelector('[name="is_vip"]').checked = false;

    $('#save-btn').innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Update Title
    `;
    showModal();
  }

  function showModal() {
    const modal = $('#modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    const modal = $('#modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }

  function initModal() {
    // Close on backdrop click
    $('#modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') hideModal();
    });

    // Close on [data-close-modal]
    $$('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', hideModal);
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) {
        hideModal();
      }
    });

    // Form submit
    $('#title-form').addEventListener('submit', handleFormSubmit);
  }

  // ============================================================
  // Form Submit
  // ============================================================
  async function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const data = {
      tmdb_id:     parseInt(formData.get('tmdb_id')) || null,
      title:       formData.get('title')?.trim(),
      type:        formData.get('type'),
      poster:      formData.get('poster')?.trim(),
      backdrop:    formData.get('backdrop')?.trim(),
      overview:    formData.get('overview')?.trim(),
      year:        parseInt(formData.get('year')) || null,
      rating:      parseFloat(formData.get('rating')) || null,
      runtime:     parseInt(formData.get('runtime')) || null,
      trailer_url: formData.get('trailer_url')?.trim(),
      netflix_url: formData.get('netflix_url')?.trim(),
      amazon_url:  formData.get('amazon_url')?.trim(),
      shahid_url:  formData.get('shahid_url')?.trim(),
      apple_url:   formData.get('apple_url')?.trim(),
      is_vip:      formData.get('is_vip') === 'on',
      hide_ads:    formData.get('hide_ads') === 'on',
    };

    const saveBtn = $('#save-btn');
    const originalHTML = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      Saving...
    `;

    try {
      const isEdit = !!state.currentTitle;
      const endpoint = isEdit
        ? `/api/admin/titles/${state.currentTitle.tmdb_id}`
        : '/api/admin/titles';
      const method = isEdit ? 'PUT' : 'POST';

      // ⚠️ NOTE: These endpoints will exist after Phase 11.2 backend.
      // For now, they'll return 404 — that's expected.
      await api.request(endpoint, { method, body: data });

      toast(isEdit ? 'Title updated successfully' : 'Title created successfully', 'success');
      hideModal();

      // Refresh
      await loadMovies();
    } catch (err) {
      // If endpoint doesn't exist yet, show a helpful message
      if (err.status === 404) {
        toast('Backend endpoint not built yet. Coming in Phase 11.2.', 'warning');
      } else {
        toast(err.message || 'Failed to save', 'error');
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHTML;
    }
  }

  // ============================================================
  // Delete
  // ============================================================
  async function handleDelete(tmdbId) {
    const movie = state.movies.find((m) => m.tmdb_id === tmdbId);
    if (!movie) return;

    if (!confirm(`Delete "${movie.title}"?\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      // ⚠️ NOTE: This endpoint will exist after Phase 11.2 backend.
      await api.request(`/api/admin/titles/${tmdbId}?type=${movie.type}`, {
        method: 'DELETE',
      });

      toast('Title deleted', 'success');
      await loadMovies();
    } catch (err) {
      if (err.status === 404) {
        toast('Backend endpoint not built yet. Coming in Phase 11.2.', 'warning');
      } else {
        toast(err.message || 'Failed to delete', 'error');
      }
    }
  }

  // ============================================================
  // Toast
  // ============================================================
  function toast(message, type = 'info') {
    const container = $('#toast-container');
    const colors = {
      success: 'bg-green-500/10 border-green-500/30 text-green-400',
      error:   'bg-red-500/10 border-red-500/30 text-red-400',
      warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
      info:    'bg-blue-500/10 border-blue-500/30 text-blue-400',
    };

    const el = document.createElement('div');
    el.className = `px-4 py-3 rounded-lg border backdrop-blur-sm text-sm font-medium shadow-lg transition-all duration-300 ${colors[type] || colors.info}`;
    el.textContent = message;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';

    container.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  // ============================================================
  // Quick Actions
  // ============================================================
  function initQuickActions() {
    $$('[data-action="add-title"]').forEach((btn) => {
      btn.addEventListener('click', openAddModal);
    });

    $$('[data-action="sync"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toast('Sync from TMDB will be available in Phase 11.2', 'info');
      });
    });

    $$('[data-action="flush-cache"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Clear cache? This may slow down the site temporarily.')) return;
        toast('Cache flush will be available in Phase 11.2', 'info');
      });
    });
  }

  // ============================================================
  // Logout
  // ============================================================
  function initLogout() {
    $('#logout-btn').addEventListener('click', async () => {
      if (!confirm('Logout from admin panel?')) return;
      try {
        await api.request('/api/auth/logout', { method: 'POST' });
      } catch {}
      window.location.href = 'login.html';
    });
  }

  // ============================================================
  // Helpers
  // ============================================================
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // ============================================================
  // Boot
  // ============================================================
  async function boot() {
    const user = await checkAuth();
    if (!user) return;

    showApp();

    initNavigation();
    initModal();
    initQuickActions();
    initLogout();

    // Load initial data
    loadStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);