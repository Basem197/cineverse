-- ============================================================
-- CineVerse — Seed Data: Countries
-- 6 initial countries (primary audience: Arabic + Turkish)
-- ============================================================

SET NAMES utf8mb4;

INSERT INTO `countries` (`code`, `name_en`, `name_ar`, `name_tr`, `flag_emoji`, `is_active`) VALUES
('EG', 'Egypt',                'مصر',                     'Mısır',                         '🇪🇬', 1),
('SA', 'Saudi Arabia',         'السعودية',                'Suudi Arabistan',               '🇸🇦', 1),
('AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'Birleşik Arap Emirlikleri',    '🇦🇪', 1),
('TR', 'Turkey',               'تركيا',                   'Türkiye',                       '🇹🇷', 1),
('US', 'United States',        'الولايات المتحدة',        'Amerika Birleşik Devletleri',  '🇺🇸', 1),
('GB', 'United Kingdom',       'المملكة المتحدة',          'Birleşik Krallık',             '🇬🇧', 1)
ON DUPLICATE KEY UPDATE
  `name_en`    = VALUES(`name_en`),
  `name_ar`    = VALUES(`name_ar`),
  `name_tr`    = VALUES(`name_tr`),
  `flag_emoji` = VALUES(`flag_emoji`);