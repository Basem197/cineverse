# 🎬 CineVerse

> منصة لاكتشاف الأفلام والمسلسلات — اعرف ما يستحق المشاهدة، وأين تشاهده قانونيًا.

[![Live](https://img.shields.io/badge/status-live-success)](https://cineverse-api.infinityfreeapp.com)
[![PHP](https://img.shields.io/badge/PHP-8.4-blue)](https://php.net)
[![MariaDB](https://img.shields.io/badge/MariaDB-11.4-blue)](https://mariadb.org)

## 🌐 Live Demo

**Frontend + API:** https://cineverse-api.infinityfreeapp.com

## 🎯 ما هي CineVerse؟

CineVerse منصة **اكتشاف** الأفلام والمسلسلات (وليست خدمة بث). تتيح للمستخدم:

- 🔍 **البحث** عن الأفلام والمسلسلات بعربي/إنجليزي/تركي
- 📖 **قراءة التفاصيل** — القصة، الطاقم، التقييم، المواسم والحلقات
- 🎬 **مشاهدة الإعلانات الرسمية** — Trailers داخل الصفحة
- 📺 **معرفة أين تشاهدها قانونيًا** — حسب الدولة
- 📌 **حفظ في قوائم شخصية** — Watchlist
- 🌍 **3 لغات** — عربي، إنجليزي، تركي

## 🛠️ التقنيات

| الطبقة | التقنية |
|---|---|
| **Backend** | PHP 8.4 (بدون Framework) |
| **Database** | MySQL / MariaDB |
| **Frontend** | HTML5 + CSS3 + Vanilla JS |
| **APIs** | TMDB (The Movie Database) |
| **Hosting** | InfinityFree |

## 📁 هيكل المشروع
cineverse/
├── api/ # Backend API
│ ├── app/
│ │ ├── Config/
│ │ ├── Controllers/ # 15 controller
│ │ ├── Core/ # Env, Database, Router, Request, Response
│ │ ├── Middleware/ # CORS, RateLimit, Auth
│ │ ├── Repositories/
│ │ └── Services/ # TMDB, Auth, Trailer, Cache, Availability
│ ├── database/ # Schema + Seeds
│ ├── public/ # نقطة الدخول
│ └── storage/
├── frontend/ # واجهة المستخدم
│ ├── assets/
│ └── *.html # 17 صفحة
└── docs/

## 🚀 التشغيل المحلي

### المتطلبات
- XAMPP (Apache + MySQL + PHP 8.2+)
- TMDB API Key من [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

### الخطوات

```bash
git clone https://github.com/Basem197/cineverse.git
cd cineverse

**في VS Code:**
- اضغط **`Ctrl + V`** (لصق)

---

## 3. احفظ

اضغط **`Ctrl + S`**

**خلاص! الملف اتحفظ.**

---

## 📋 ابعتلي:
