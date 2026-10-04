-- ============================================================
-- CineVerse — Full Database Schema
-- Part 1/4: Core Content Tables (titles, genres, people, cast)
-- ============================================================
-- MySQL 5.7+ / MariaDB 10.3+
-- Charset: utf8mb4 (full Unicode + Arabic + Emoji)
-- Engine: InnoDB (FK + Transactions)
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- Drop in dependency order (dev only) ----------
DROP TABLE IF EXISTS `title_genres`;
DROP TABLE IF EXISTS `title_cast`;
DROP TABLE IF EXISTS `title_directors`;
DROP TABLE IF EXISTS `title_availability`;
DROP TABLE IF EXISTS `provider_affiliate_links`;
DROP TABLE IF EXISTS `affiliate_clicks`;
DROP TABLE IF EXISTS `title_ratings`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `family_guides`;
DROP TABLE IF EXISTS `episodes`;
DROP TABLE IF EXISTS `seasons`;
DROP TABLE IF EXISTS `watchlists`;
DROP TABLE IF EXISTS `watch_history`;
DROP TABLE IF EXISTS `user_preferences`;
DROP TABLE IF EXISTS `user_subscriptions`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `subscription_plans`;
DROP TABLE IF EXISTS `provider_countries`;
DROP TABLE IF EXISTS `streaming_providers`;
DROP TABLE IF EXISTS `countries`;
DROP TABLE IF EXISTS `people`;
DROP TABLE IF EXISTS `genres`;
DROP TABLE IF EXISTS `titles`;
DROP TABLE IF EXISTS `settings`;

-- ============================================================
-- 1) TITLES — Movies & Series (core content)
-- ============================================================
CREATE TABLE `titles` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tmdb_id`         INT UNSIGNED NOT NULL,
  `type`            ENUM('movie','series') NOT NULL,
  `title`           VARCHAR(500) NOT NULL,
  `original_title`  VARCHAR(500) DEFAULT NULL,
  `title_ar`        VARCHAR(500) DEFAULT NULL,
  `overview`        TEXT DEFAULT NULL,
  `overview_ar`     TEXT DEFAULT NULL,
  `release_date`    DATE DEFAULT NULL,
  `runtime`         SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Minutes, movies only',
  `poster_path`     VARCHAR(255) DEFAULT NULL,
  `backdrop_path`   VARCHAR(255) DEFAULT NULL,
  `tmdb_rating`     DECIMAL(3,1) DEFAULT NULL COMMENT 'TMDB vote_average 0-10',
  `tmdb_votes`      INT UNSIGNED DEFAULT NULL,
  `popularity`      DECIMAL(10,3) DEFAULT NULL,
  `original_lang`   VARCHAR(10) DEFAULT NULL,
  `status`          VARCHAR(50) DEFAULT NULL,
  `adult`           TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_titles_tmdb` (`tmdb_id`, `type`),
  KEY `idx_titles_type` (`type`),
  KEY `idx_titles_release` (`release_date`),
  KEY `idx_titles_popularity` (`popularity`),
  KEY `idx_titles_title` (`title`),
  KEY `idx_titles_title_ar` (`title_ar`),
  FULLTEXT KEY `ft_titles_search` (`title`, `original_title`, `title_ar`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2) GENRES
-- ============================================================
CREATE TABLE `genres` (
  `id`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tmdb_id`  INT UNSIGNED NOT NULL,
  `name_en`  VARCHAR(100) NOT NULL,
  `name_ar`  VARCHAR(100) NOT NULL,
  `slug`     VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_genres_tmdb` (`tmdb_id`),
  UNIQUE KEY `uk_genres_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3) TITLE ↔ GENRES (many-to-many)
-- ============================================================
CREATE TABLE `title_genres` (
  `title_id` BIGINT UNSIGNED NOT NULL,
  `genre_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`title_id`, `genre_id`),
  KEY `idx_tg_genre` (`genre_id`),
  CONSTRAINT `fk_tg_title` FOREIGN KEY (`title_id`) REFERENCES `titles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tg_genre` FOREIGN KEY (`genre_id`) REFERENCES `genres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4) PEOPLE — actors & directors
-- ============================================================
CREATE TABLE `people` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tmdb_id`       INT UNSIGNED NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `profile_path`  VARCHAR(255) DEFAULT NULL,
  `known_for`     VARCHAR(255) DEFAULT NULL,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_people_tmdb` (`tmdb_id`),
  KEY `idx_people_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5) TITLE ↔ CAST
-- ============================================================
CREATE TABLE `title_cast` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_id`        BIGINT UNSIGNED NOT NULL,
  `person_id`       BIGINT UNSIGNED NOT NULL,
  `character_name`  VARCHAR(255) DEFAULT NULL,
  `cast_order`      SMALLINT UNSIGNED DEFAULT 999,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tc_title_person` (`title_id`, `person_id`),
  KEY `idx_tc_person` (`person_id`),
  KEY `idx_tc_order` (`title_id`, `cast_order`),
  CONSTRAINT `fk_tc_title`  FOREIGN KEY (`title_id`)  REFERENCES `titles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tc_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6) TITLE ↔ DIRECTORS
-- ============================================================
CREATE TABLE `title_directors` (
  `title_id`   BIGINT UNSIGNED NOT NULL,
  `person_id`  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`title_id`, `person_id`),
  KEY `idx_td_person` (`person_id`),
  CONSTRAINT `fk_td_title`  FOREIGN KEY (`title_id`)  REFERENCES `titles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_td_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END Part 1/4
-- Next: Part 2/4 (seasons, episodes, countries, providers,
--       provider_countries, title_availability)
-- ============================================================

-- ============================================================
-- CineVerse — Full Database Schema
-- Part 2/4: Seasons, Episodes, Countries, Providers, Availability
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 7) SEASONS — for series
-- ============================================================
CREATE TABLE `seasons` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_id`       BIGINT UNSIGNED NOT NULL,
  `tmdb_id`        INT UNSIGNED DEFAULT NULL,
  `season_number`  SMALLINT UNSIGNED NOT NULL,
  `name`           VARCHAR(255) DEFAULT NULL,
  `overview`       TEXT DEFAULT NULL,
  `air_date`       DATE DEFAULT NULL,
  `poster_path`    VARCHAR(255) DEFAULT NULL,
  `episode_count`  SMALLINT UNSIGNED DEFAULT NULL,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_seasons_title_num` (`title_id`, `season_number`),
  KEY `idx_seasons_tmdb` (`tmdb_id`),
  CONSTRAINT `fk_seasons_title` FOREIGN KEY (`title_id`) REFERENCES `titles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8) EPISODES
-- ============================================================
CREATE TABLE `episodes` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id`       BIGINT UNSIGNED NOT NULL,
  `tmdb_id`         INT UNSIGNED DEFAULT NULL,
  `episode_number`  SMALLINT UNSIGNED NOT NULL,
  `name`            VARCHAR(255) DEFAULT NULL,
  `overview`        TEXT DEFAULT NULL,
  `air_date`        DATE DEFAULT NULL,
  `runtime`         SMALLINT UNSIGNED DEFAULT NULL,
  `still_path`      VARCHAR(255) DEFAULT NULL,
  `vote_average`    DECIMAL(3,1) DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_episodes_season_num` (`season_id`, `episode_number`),
  KEY `idx_episodes_tmdb` (`tmdb_id`),
  KEY `idx_episodes_air` (`air_date`),
  CONSTRAINT `fk_episodes_season` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9) COUNTRIES
-- ============================================================
CREATE TABLE `countries` (
  `code`      CHAR(2) NOT NULL COMMENT 'ISO 3166-1 alpha-2',
  `name_en`   VARCHAR(100) NOT NULL,
  `name_ar`   VARCHAR(100) NOT NULL,
  `name_tr`   VARCHAR(100) DEFAULT NULL,
  `flag_emoji` VARCHAR(10) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`code`),
  KEY `idx_countries_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10) STREAMING PROVIDERS — legal platforms only
-- ============================================================
CREATE TABLE `streaming_providers` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tmdb_provider_id`  INT UNSIGNED DEFAULT NULL,
  `name`              VARCHAR(150) NOT NULL,
  `slug`              VARCHAR(150) NOT NULL,
  `logo_path`         VARCHAR(255) DEFAULT NULL,
  `official_url`      VARCHAR(500) DEFAULT NULL COMMENT 'Homepage, not deep link',
  `is_active`         TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_providers_slug` (`slug`),
  UNIQUE KEY `uk_providers_tmdb` (`tmdb_provider_id`),
  KEY `idx_providers_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11) PROVIDER ↔ COUNTRY — where each provider operates
-- ============================================================
CREATE TABLE `provider_countries` (
  `provider_id`   INT UNSIGNED NOT NULL,
  `country_code`  CHAR(2) NOT NULL,
  PRIMARY KEY (`provider_id`, `country_code`),
  KEY `idx_pc_country` (`country_code`),
  CONSTRAINT `fk_pc_provider` FOREIGN KEY (`provider_id`)  REFERENCES `streaming_providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_country`  FOREIGN KEY (`country_code`) REFERENCES `countries` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12) TITLE AVAILABILITY — where to watch, per country
-- ============================================================
-- offer_type meanings:
--   flatrate = included in subscription
--   free     = free with account
--   ads      = free with ads
--   rent     = pay per rental
--   buy      = purchase to own
-- ============================================================
CREATE TABLE `title_availability` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_id`         BIGINT UNSIGNED NOT NULL,
  `provider_id`      INT UNSIGNED NOT NULL,
  `country_code`     CHAR(2) NOT NULL,
  `offer_type`       ENUM('flatrate','free','ads','rent','buy') NOT NULL,
  `price`            DECIMAL(8,2) DEFAULT NULL,
  `currency`         CHAR(3) DEFAULT NULL,
  `quality`          VARCHAR(20) DEFAULT NULL COMMENT 'SD, HD, 4K',
  `deep_link`        VARCHAR(1000) DEFAULT NULL COMMENT 'Direct title URL on provider',
  `source`           VARCHAR(50) NOT NULL DEFAULT 'tmdb' COMMENT 'tmdb | manual | partner',
  `last_verified_at` DATETIME DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_availability` (`title_id`, `provider_id`, `country_code`, `offer_type`),
  KEY `idx_avail_title_country` (`title_id`, `country_code`),
  KEY `idx_avail_provider` (`provider_id`),
  KEY `idx_avail_country` (`country_code`),
  CONSTRAINT `fk_avail_title`    FOREIGN KEY (`title_id`)     REFERENCES `titles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_avail_provider` FOREIGN KEY (`provider_id`)  REFERENCES `streaming_providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_avail_country`  FOREIGN KEY (`country_code`) REFERENCES `countries` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END Part 2/4
-- Next: Part 3/4 (users, auth, watchlist, ratings, reviews,
--       family_guides)
-- ============================================================

-- ============================================================
-- CineVerse — Full Database Schema
-- Part 3/4: Users, Auth, Watchlist, Ratings, Reviews, Family Guide
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 13) USERS
-- ============================================================
CREATE TABLE `users` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`               VARCHAR(255) NOT NULL,
  `password_hash`       VARCHAR(255) NOT NULL COMMENT 'password_hash(), never plain',
  `display_name`        VARCHAR(100) NOT NULL,
  `preferred_language`  VARCHAR(5) NOT NULL DEFAULT 'ar' COMMENT 'ar | en | tr',
  `preferred_country`   CHAR(2) DEFAULT NULL,
  `role`                ENUM('user','admin') NOT NULL DEFAULT 'user',
  `email_verified_at`   DATETIME DEFAULT NULL,
  `is_active`           TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at`       DATETIME DEFAULT NULL,
  `created_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_active` (`is_active`),
  KEY `idx_users_role` (`role`),
  CONSTRAINT `fk_users_country` FOREIGN KEY (`preferred_country`) REFERENCES `countries` (`code`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14) USER PREFERENCES — one row per user
-- ============================================================
CREATE TABLE `user_preferences` (
  `user_id`              BIGINT UNSIGNED NOT NULL,
  `favorite_genres`      JSON DEFAULT NULL COMMENT 'Array of genre IDs',
  `notify_new_seasons`   TINYINT(1) NOT NULL DEFAULT 1,
  `notify_availability`  TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_prefs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15) WATCHLISTS
-- ============================================================
CREATE TABLE `watchlists` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `title_id`   BIGINT UNSIGNED NOT NULL,
  `added_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_watchlist_user_title` (`user_id`, `title_id`),
  KEY `idx_watchlist_title` (`title_id`),
  KEY `idx_watchlist_added` (`added_at`),
  CONSTRAINT `fk_watchlist_user`  FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_watchlist_title` FOREIGN KEY (`title_id`) REFERENCES `titles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16) WATCH HISTORY
-- ============================================================
CREATE TABLE `watch_history` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `title_id`    BIGINT UNSIGNED NOT NULL,
  `watched_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_history_user_title` (`user_id`, `title_id`),
  KEY `idx_history_watched` (`watched_at`),
  CONSTRAINT `fk_history_user`  FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_history_title` FOREIGN KEY (`title_id`) REFERENCES `titles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17) TITLE RATINGS — CineVerse users' own ratings
-- ============================================================
-- NOTE: This is SEPARATE from titles.tmdb_rating (external).
--       Never mix the two in API responses.
-- ============================================================
CREATE TABLE `title_ratings` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_id`    BIGINT UNSIGNED NOT NULL,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `rating`      TINYINT UNSIGNED NOT NULL COMMENT '1-10',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rating_user_title` (`user_id`, `title_id`),
  KEY `idx_rating_title` (`title_id`),
  CONSTRAINT `fk_rating_title` FOREIGN KEY (`title_id`) REFERENCES `titles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rating_user`  FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `chk_rating_range` CHECK (`rating` BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18) REVIEWS — user-written reviews with moderation
-- ============================================================
CREATE TABLE `reviews` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_id`    BIGINT UNSIGNED NOT NULL,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `body`        TEXT NOT NULL,
  `status`      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reported`    TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_review_user_title` (`user_id`, `title_id`) COMMENT 'One review per user per title',
  KEY `idx_review_title_status` (`title_id`, `status`),
  KEY `idx_review_status` (`status`),
  KEY `idx_review_created` (`created_at`),
  CONSTRAINT `fk_review_title` FOREIGN KEY (`title_id`) REFERENCES `titles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_user`  FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19) FAMILY GUIDES — content warnings & age rating
-- ============================================================
-- source: must indicate where this came from (tmdb | manual | partner)
-- Levels: 0=none, 1=mild, 2=moderate, 3=severe
-- ============================================================
CREATE TABLE `family_guides` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_id`        BIGINT UNSIGNED NOT NULL,
  `violence`        TINYINT UNSIGNED DEFAULT NULL COMMENT '0-3',
  `language`        TINYINT UNSIGNED DEFAULT NULL,
  `sexual_content`  TINYINT UNSIGNED DEFAULT NULL,
  `drugs`           TINYINT UNSIGNED DEFAULT NULL,
  `horror`          TINYINT UNSIGNED DEFAULT NULL,
  `mature_themes`   TINYINT UNSIGNED DEFAULT NULL,
  `age_rating`      VARCHAR(20) DEFAULT NULL COMMENT 'e.g. PG-13, R, +12',
  `source`          VARCHAR(50) NOT NULL DEFAULT 'manual',
  `notes`           TEXT DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_family_title` (`title_id`),
  CONSTRAINT `fk_family_title` FOREIGN KEY (`title_id`) REFERENCES `titles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END Part 3/4
-- Next: Part 4/4 (affiliate_clicks, provider_affiliate_links,
--       subscription_plans, user_subscriptions, settings)
-- ============================================================

-- ============================================================
-- CineVerse — Full Database Schema
-- Part 4/4: Affiliate Tracking, Subscriptions, Settings
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 20) PROVIDER AFFILIATE LINKS — official partner links only
-- ============================================================
-- IMPORTANT: Only insert links from verified affiliate programs.
--            Never use unofficial/unauthorized redirect links.
-- ============================================================
CREATE TABLE `provider_affiliate_links` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider_id`    INT UNSIGNED NOT NULL,
  `country_code`   CHAR(2) NOT NULL,
  `affiliate_url`  VARCHAR(1000) NOT NULL,
  `campaign`       VARCHAR(100) DEFAULT NULL,
  `is_active`      TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_affiliate_provider_country_campaign` (`provider_id`, `country_code`, `campaign`),
  KEY `idx_affiliate_active` (`is_active`),
  CONSTRAINT `fk_affiliate_provider` FOREIGN KEY (`provider_id`)  REFERENCES `streaming_providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_affiliate_country`  FOREIGN KEY (`country_code`) REFERENCES `countries` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 21) AFFILIATE CLICKS — privacy-conscious click tracking
-- ============================================================
-- Privacy rules:
--   * No raw IP stored — use ip_hash (sha256 + salt)
--   * No raw user agent — use ua_hash
--   * Retention: purge rows older than N days via cron (future)
-- ============================================================
CREATE TABLE `affiliate_clicks` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_id`      BIGINT UNSIGNED DEFAULT NULL,
  `provider_id`   INT UNSIGNED NOT NULL,
  `country_code`  CHAR(2) DEFAULT NULL,
  `user_id`       BIGINT UNSIGNED DEFAULT NULL,
  `ip_hash`       CHAR(64) DEFAULT NULL COMMENT 'SHA-256 hash, no raw IP',
  `ua_hash`       CHAR(64) DEFAULT NULL COMMENT 'SHA-256 hash of user agent',
  `referrer`      VARCHAR(500) DEFAULT NULL,
  `campaign`      VARCHAR(100) DEFAULT NULL,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clicks_title` (`title_id`),
  KEY `idx_clicks_provider` (`provider_id`),
  KEY `idx_clicks_country` (`country_code`),
  KEY `idx_clicks_created` (`created_at`),
  KEY `idx_clicks_user` (`user_id`),
  CONSTRAINT `fk_clicks_title`    FOREIGN KEY (`title_id`)     REFERENCES `titles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_clicks_provider` FOREIGN KEY (`provider_id`)  REFERENCES `streaming_providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_clicks_country`  FOREIGN KEY (`country_code`) REFERENCES `countries` (`code`) ON DELETE SET NULL,
  CONSTRAINT `fk_clicks_user`     FOREIGN KEY (`user_id`)      REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 22) SUBSCRIPTION PLANS — future VIP tiers (no payment yet)
-- ============================================================
CREATE TABLE `subscription_plans` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(100) NOT NULL,
  `slug`           VARCHAR(100) NOT NULL,
  `description`    TEXT DEFAULT NULL,
  `price`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `currency`       CHAR(3) NOT NULL DEFAULT 'USD',
  `duration_days`  SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  `features`       JSON DEFAULT NULL,
  `is_active`      TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 23) USER SUBSCRIPTIONS — future payment integration
-- ============================================================
CREATE TABLE `user_subscriptions` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NOT NULL,
  `plan_id`      INT UNSIGNED NOT NULL,
  `status`       ENUM('pending','active','expired','cancelled') NOT NULL DEFAULT 'pending',
  `started_at`   DATETIME DEFAULT NULL,
  `expires_at`   DATETIME DEFAULT NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sub_user` (`user_id`),
  KEY `idx_sub_status` (`status`),
  KEY `idx_sub_expires` (`expires_at`),
  CONSTRAINT `fk_sub_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sub_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 24) SETTINGS — key/value app configuration
-- ============================================================
CREATE TABLE `settings` (
  `key`         VARCHAR(100) NOT NULL,
  `value`       TEXT DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END OF SCHEMA — 24 tables total
-- Next steps:
--   1) Import this file in phpMyAdmin
--   2) Import seeds/countries.sql
--   3) Import seeds/genres.sql
--   4) Import seeds/providers.sql
-- ============================================================