-- ============================================================
-- CineVerse — Seed Data: Streaming Providers
-- ONLY legal, official platforms
-- ============================================================
-- tmdb_provider_id values are from TMDB's /watch/providers/movie
-- If a provider has NULL tmdb_id, we'll fill it during sync.
-- ============================================================

SET NAMES utf8mb4;

INSERT INTO `streaming_providers`
  (`tmdb_provider_id`, `name`, `slug`, `official_url`, `is_active`)
VALUES
-- Global majors
(8,    'Netflix',            'netflix',      'https://www.netflix.com',             1),
(9,    'Amazon Prime Video', 'prime-video',  'https://www.primevideo.com',          1),
(337,  'Disney Plus',        'disney-plus',  'https://www.disneyplus.com',          1),
(350,  'Apple TV Plus',      'apple-tv-plus','https://tv.apple.com',                1),

-- MENA region
(97,   'Shahid VIP',         'shahid-vip',   'https://shahid.mbc.net',              1),
(1923, 'WATCH IT',           'watch-it',     'https://watchit.com',                 1),
(1273, 'OSN Plus',           'osn-plus',     'https://www.osn.com',                 1),
(1899, 'TOD',                'tod',          'https://www.tod.tv',                  1),
(1886, 'stc tv',             'stc-tv',       'https://www.stc.tv',                  1),
(1926, 'Jawwy TV',           'jawwy-tv',     'https://www.jawwytv.com',             1),
(1914, 'Yango Play',         'yango-play',   'https://yango.play',                  1),

-- Asia / Turkey
(151,  'Viu',                'viu',          'https://www.viu.com',                 1),
(1893, 'Exxen',              'exxen',        'https://www.exxen.com',               1),
(1867, 'BluTV',              'blutv',        'https://www.blutv.com',               1)

ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `official_url` = VALUES(`official_url`),
  `tmdb_provider_id` = VALUES(`tmdb_provider_id`);