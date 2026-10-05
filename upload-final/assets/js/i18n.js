/* ============================================================
   CineVerse — i18n & Preferences
   Language + Country management with localStorage persistence
   ============================================================ */

(function (window, document) {
  'use strict';

  const STORAGE_KEY_LANG    = 'cineverse.lang';
  const STORAGE_KEY_COUNTRY = 'cineverse.country';

  const SUPPORTED_LANGS = ['ar', 'en', 'tr'];
  const DEFAULT_LANG    = 'ar';
  const DEFAULT_COUNTRY = 'EG';

  const TRANSLATIONS = {
    ar: {
      // Nav
      'nav.home': 'الرئيسية',
      'nav.movies': 'أفلام',
      'nav.series': 'مسلسلات',
      'nav.genres': 'التصنيفات',
      'nav.providers': 'المنصات',
      'nav.watchlist': 'قائمتي',
      'nav.login': 'دخول',
      'nav.logout': 'خروج',
      'nav.search': 'بحث',
      'nav.profile': 'ملفي',
      'nav.language': 'اللغة',

      // Hero
      'hero.eyebrow': 'استكشف · اكتشف · شاهد',
      'hero.title.1': 'عالم السينما',
      'hero.title.2': 'في مكان واحد',
      'hero.subtitle': 'اكتشف الأفلام والمسلسلات، اقرأ التفاصيل، اعرف أين تشاهدها قانونيًا، وشاهد الإعلانات الرسمية.',
      'hero.search.placeholder': 'ابحث عن فيلم أو مسلسل...',
      'hero.search.btn': 'ابحث',

      // Sections
      'section.trending.movies': 'أفلام رائجة',
      'section.trending.series': 'مسلسلات رائجة',
      'section.popular': 'الأكثر شعبية',
      'section.new.trailers': 'أحدث الإعلانات',
      'section.browse.genres': 'تصفح حسب التصنيف',
      'section.providers': 'منصات المشاهدة الرسمية',
      'section.view.all': 'عرض الكل',

      // Cards
      'card.movie': 'فيلم',
      'card.series': 'مسلسل',
      'card.rating': 'التقييم',
      'card.no.poster': 'لا يوجد غلاف',

      // States
      'state.loading': 'جارٍ التحميل...',
      'state.empty': 'لا توجد نتائج',
      'state.error': 'حدث خطأ',
      'state.retry': 'إعادة المحاولة',

      // Footer
      'footer.tagline': 'منصة لاكتشاف الأفلام والمسلسلات القانونية',
      'footer.browse': 'تصفح',
      'footer.about': 'عن CineVerse',
      'footer.legal': 'قانوني',
      'footer.privacy': 'سياسة الخصوصية',
      'footer.terms': 'شروط الاستخدام',
      'footer.affiliate': 'الإفصاح التابع',
      'footer.contact': 'اتصل بنا',
      'footer.rights': 'جميع الحقوق محفوظة',

      // Actions
      'country.select': 'اختر الدولة',
      'trailer.watch': 'شاهد الإعلان الرسمي',
      'trailer.close': 'إغلاق',
      'watchlist.save': 'حفظ',
      'watchlist.saved': 'محفوظ ✓',
      'auth.login': 'تسجيل الدخول',
      'auth.register': 'حساب جديد',
      'auth.logout': 'تسجيل الخروج',

      // Static pages
      'about.title': 'عن CineVerse',
      'about.intro': 'منصة لاكتشاف الأفلام والمسلسلات القانونية',
      'contact.title': 'اتصل بنا',
      'privacy.title': 'سياسة الخصوصية',
      'terms.title': 'شروط الاستخدام',
      'affiliate.title': 'الإفصاح التابع',
    },

    en: {
      // Nav
      'nav.home': 'Home',
      'nav.movies': 'Movies',
      'nav.series': 'Series',
      'nav.genres': 'Genres',
      'nav.providers': 'Providers',
      'nav.watchlist': 'My List',
      'nav.login': 'Sign In',
      'nav.logout': 'Sign Out',
      'nav.search': 'Search',
      'nav.profile': 'Profile',
      'nav.language': 'Language',

      // Hero
      'hero.eyebrow': 'Explore · Discover · Watch',
      'hero.title.1': 'The world of cinema',
      'hero.title.2': 'in one place',
      'hero.subtitle': 'Discover movies and series, read details, find where to watch them legally, and play official trailers.',
      'hero.search.placeholder': 'Search for a movie or series...',
      'hero.search.btn': 'Search',

      // Sections
      'section.trending.movies': 'Trending Movies',
      'section.trending.series': 'Trending Series',
      'section.popular': 'Most Popular',
      'section.new.trailers': 'Latest Trailers',
      'section.browse.genres': 'Browse by Genre',
      'section.providers': 'Official Streaming Providers',
      'section.view.all': 'View All',

      // Cards
      'card.movie': 'Movie',
      'card.series': 'Series',
      'card.rating': 'Rating',
      'card.no.poster': 'No poster',

      // States
      'state.loading': 'Loading...',
      'state.empty': 'No results found',
      'state.error': 'An error occurred',
      'state.retry': 'Try Again',

      // Footer
      'footer.tagline': 'A legal movie & series discovery platform',
      'footer.browse': 'Browse',
      'footer.about': 'About CineVerse',
      'footer.legal': 'Legal',
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Use',
      'footer.affiliate': 'Affiliate Disclosure',
      'footer.contact': 'Contact Us',
      'footer.rights': 'All rights reserved',

      // Actions
      'country.select': 'Select country',
      'trailer.watch': 'Watch Official Trailer',
      'trailer.close': 'Close',
      'watchlist.save': 'Save',
      'watchlist.saved': 'Saved ✓',
      'auth.login': 'Sign In',
      'auth.register': 'Sign Up',
      'auth.logout': 'Sign Out',

      // Static pages
      'about.title': 'About CineVerse',
      'about.intro': 'A legal movie & series discovery platform',
      'contact.title': 'Contact Us',
      'privacy.title': 'Privacy Policy',
      'terms.title': 'Terms of Use',
      'affiliate.title': 'Affiliate Disclosure',
    },

    tr: {
      // Nav
      'nav.home': 'Ana Sayfa',
      'nav.movies': 'Filmler',
      'nav.series': 'Diziler',
      'nav.genres': 'Türler',
      'nav.providers': 'Platformlar',
      'nav.watchlist': 'Listem',
      'nav.login': 'Giriş',
      'nav.logout': 'Çıkış',
      'nav.search': 'Ara',
      'nav.profile': 'Profil',
      'nav.language': 'Dil',

      // Hero
      'hero.eyebrow': 'Keşfet · Bul · İzle',
      'hero.title.1': 'Sinema dünyası',
      'hero.title.2': 'tek bir yerde',
      'hero.subtitle': 'Filmleri ve dizileri keşfedin, detayları okuyun, yasal olarak nerede izleyeceğinizi öğrenin ve resmi fragmanları izleyin.',
      'hero.search.placeholder': 'Film veya dizi ara...',
      'hero.search.btn': 'Ara',

      // Sections
      'section.trending.movies': 'Popüler Filmler',
      'section.trending.series': 'Popüler Diziler',
      'section.popular': 'En Popüler',
      'section.new.trailers': 'Son Fragmanlar',
      'section.browse.genres': 'Türe Göre Gözat',
      'section.providers': 'Resmi Yayın Platformları',
      'section.view.all': 'Tümünü Gör',

      // Cards
      'card.movie': 'Film',
      'card.series': 'Dizi',
      'card.rating': 'Puan',
      'card.no.poster': 'Poster yok',

      // States
      'state.loading': 'Yükleniyor...',
      'state.empty': 'Sonuç bulunamadı',
      'state.error': 'Bir hata oluştu',
      'state.retry': 'Yeniden Dene',

      // Footer
      'footer.tagline': 'Yasal film ve dizi keşif platformu',
      'footer.browse': 'Gözat',
      'footer.about': 'CineVerse Hakkında',
      'footer.legal': 'Yasal',
      'footer.privacy': 'Gizlilik Politikası',
      'footer.terms': 'Kullanım Şartları',
      'footer.affiliate': 'Ortaklık Açıklaması',
      'footer.contact': 'Bize Ulaşın',
      'footer.rights': 'Tüm hakları saklıdır',

      // Actions
      'country.select': 'Ülke seçin',
      'trailer.watch': 'Resmi Fragmanı İzle',
      'trailer.close': 'Kapat',
      'watchlist.save': 'Kaydet',
      'watchlist.saved': 'Kaydedildi ✓',
      'auth.login': 'Giriş Yap',
      'auth.register': 'Kayıt Ol',
      'auth.logout': 'Çıkış Yap',

      // Static pages
      'about.title': 'CineVerse Hakkında',
      'about.intro': 'Yasal film ve dizi keşif platformu',
      'contact.title': 'Bize Ulaşın',
      'privacy.title': 'Gizlilik Politikası',
      'terms.title': 'Kullanım Şartları',
      'affiliate.title': 'Ortaklık Açıklaması',
    },
  };

  // ---------- Helpers ----------
  function getLang() {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const browser = (navigator.language || 'ar').slice(0, 2).toLowerCase();
    return SUPPORTED_LANGS.includes(browser) ? browser : DEFAULT_LANG;
  }

  function getCountry() {
    return localStorage.getItem(STORAGE_KEY_COUNTRY) || DEFAULT_COUNTRY;
  }

  function setLang(lang, options = {}) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    const changed = getLang() !== lang;
    localStorage.setItem(STORAGE_KEY_LANG, lang);
    applyLang();
    if (changed && options.reload !== false) {
      // Reload to re-render dynamic content cleanly
      window.location.reload();
    }
  }

  function setCountry(code) {
    if (!code || code.length !== 2) return;
    localStorage.setItem(STORAGE_KEY_COUNTRY, code.toUpperCase());
    window.dispatchEvent(new CustomEvent('cineverse:country-changed', {
      detail: { country: code.toUpperCase() },
    }));
  }

  function t(key, fallback) {
    const lang = getLang();
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.ar;
    return dict[key] ?? fallback ?? key;
  }

  function applyLang() {
    const lang = getLang();
    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const translated = t(key);
      if (translated) {
        if (el.hasAttribute('data-i18n-attr')) {
          el.setAttribute(el.getAttribute('data-i18n-attr'), translated);
        } else {
          el.textContent = translated;
        }
      }
    });

    document.documentElement.classList.toggle('is-rtl', dir === 'rtl');
    document.documentElement.classList.toggle('is-ltr', dir === 'ltr');

    // Update select [data-lang-select] if present
    document.querySelectorAll('[data-lang-select]').forEach((sel) => {
      sel.value = lang;
    });
  }

  // ---------- Public API ----------
  window.CineVerseI18n = {
    t,
    getLang,
    setLang,
    getCountry,
    setCountry,
    applyLang,
    supportedLangs: SUPPORTED_LANGS,
    translations: TRANSLATIONS,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLang);
  } else {
    applyLang();
  }
})(window, document);