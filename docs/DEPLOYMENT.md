# CineVerse — Deployment Guide

## Architecture (Production)

| Component | Host | URL |
|---|---|---|
| Frontend | Vercel | https://cineverse.vercel.app |
| Backend API | AlwaysData | https://cineverse.alwaysdata.net/api/public |
| Database | AlwaysData MySQL | mysql-cineverse.alwaysdata.net |

**Cross-origin note:** Frontend and API are on different domains.
- CORS must allow the Vercel domain
- Session cookies use `SameSite=None; Secure`

---

## Pre-Deployment Checklist

- [ ] All tests passing (Phase 9 report)
- [ ] `api/.env.production` filled with real values locally
- [ ] Backup created (`scripts/backup.ps1`)
- [ ] Git repo up-to-date and pushed
- [ ] `frontend/assets/js/api.js` updated with production API URL
- [ ] TMDB v4 token valid
- [ ] Database schema & seeds ready to import

---

## Deployment Steps

### 1. Backend (AlwaysData)

See `docs/deploy-alwaysdata.md`

### 2. Frontend (Vercel)

See `docs/deploy-vercel.md`

### 3. Post-Deployment

See `docs/deploy-post.md`

---

## Rollback Plan

If production fails:

1. **Frontend**: Vercel → Deployments → Promote previous build
2. **Backend**: Restore files from `backups/` + re-upload via SFTP
3. **Database**: 
   - AlwaysData Panel → Databases → Import backup
   - Or run: `mysql -u user -p dbname < backup.sql`
4. **DNS**: If domain points wrong, update in registrar
5. **Cache**: Clear `api/storage/cache/*` on server

---

## Environment Variables (Production)

Copy `api/.env.production` → `api/.env` on server, then fill:

| Key | Example | Notes |
|---|---|---|
| APP_ENV | production | Locks debug mode |
| APP_DEBUG | false | Never show errors |
| APP_URL | https://cineverse.alwaysdata.net | API's public URL |
| DB_HOST | mysql-cineverse.alwaysdata.net | From AlwaysData panel |
| DB_NAME | cineverse_db | |
| DB_USER | cineverse | |
| DB_PASS | (strong) | |
| TMDB_API_KEY | eyJ... | v4 token |
| CORS_ALLOWED_ORIGINS | https://cineverse.vercel.app | Exact origins |
| SESSION_LIFETIME | 604800 | 7 days |

---

## Logs & Monitoring

- **PHP errors**: `api/storage/logs/` (or AlwaysData's error log)
- **Apache logs**: AlwaysData panel → Sites → Logs
- **Vercel logs**: Vercel dashboard → Deployments → Functions
- **Rate limit**: `api/storage/cache/ratelimit/`

---

*Last updated: 2026-10-03*