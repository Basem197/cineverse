-- ============================================================
-- CineVerse — Seed Data: Genres
-- Uses TMDB official genre IDs (movies + TV combined)
-- Arabic names are curated translations
-- ============================================================

SET NAMES utf8mb4;

-- Note: Movies & TV share some IDs but not all.
-- We use a single unified table with TMDB's canonical IDs.
INSERT INTO `genres` (`tmdb_id`, `name_en`, `name_ar`, `slug`) VALUES
-- Movie genres
(28,    'Action',           'أكشن',            'action'),
(12,    'Adventure',        'مغامرة',          'adventure'),
(16,    'Animation',        'رسوم متحركة',     'animation'),
(35,    'Comedy',           'كوميديا',         'comedy'),
(80,    'Crime',            'جريمة',           'crime'),
(99,    'Documentary',      'وثائقي',          'documentary'),
(18,    'Drama',            'دراما',           'drama'),
(10751, 'Family',           'عائلي',           'family'),
(14,    'Fantasy',          'فانتازيا',        'fantasy'),
(36,    'History',          'تاريخي',          'history'),
(27,    'Horror',           'رعب',             'horror'),
(10402, 'Music',            'موسيقي',          'music'),
(9648,  'Mystery',          'غموض',            'mystery'),
(10749, 'Romance',          'رومانسي',         'romance'),
(878,   'Science Fiction',  'خيال علمي',       'science-fiction'),
(10770, 'TV Movie',         'فيلم تلفزيوني',   'tv-movie'),
(53,    'Thriller',         'إثارة',           'thriller'),
(10752, 'War',              'حرب',             'war'),
(37,    'Western',          'غربي',            'western'),

-- TV-specific genres
(10759, 'Action & Adventure', 'أكشن ومغامرة',   'action-adventure'),
(10762, 'Kids',             'أطفال',           'kids'),
(10763, 'News',             'أخبار',           'news'),
(10764, 'Reality',          'واقعي',           'reality'),
(10765, 'Sci-Fi & Fantasy', 'خيال علمي وفانتازيا', 'sci-fi-fantasy'),
(10766, 'Soap',             'دراما صابونية',   'soap'),
(10767, 'Talk',             'حوار',            'talk'),
(10768, 'War & Politics',   'حرب وسياسة',      'war-politics')

ON DUPLICATE KEY UPDATE
  `name_en` = VALUES(`name_en`),
  `name_ar` = VALUES(`name_ar`),
  `slug` = VALUES(`slug`);