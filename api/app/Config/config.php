<?php
declare(strict_types=1);

/**
 * CineVerse — Global Configuration
 *
 * Loads the .env file and sets up error handling + sessions.
 */

require_once __DIR__ . '/../Core/Env.php';

use CineVerse\Core\Env;

// Load environment
Env::load();

// Error reporting — never show errors to users unless APP_DEBUG=true
$debug = Env::bool('APP_DEBUG', false);

if ($debug) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

// Timezone
$tz = Env::get('APP_TIMEZONE', 'UTC');
if (is_string($tz) && $tz !== '') {
    date_default_timezone_set($tz);
}

// ---------- Sessions ----------
if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443')
        || ((string) Env::get('APP_ENV', 'local') === 'production'); // AlwaysData is HTTPS

    // SameSite policy:
    //  - local dev (LTR same-origin): Lax
    //  - production cross-origin (Vercel ↔ AlwaysData): None + Secure
    $sameSite = $isHttps ? 'None' : 'Lax';

    session_set_cookie_params([
        'lifetime' => (int) Env::get('SESSION_LIFETIME', '604800'),
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);

    session_name('CINEVERSE_SESS');
    session_start();
}

// Basic app constants
define('CINEVERSE_APP_NAME', Env::get('APP_NAME', 'CineVerse'));
define('CINEVERSE_ENV',      Env::get('APP_ENV', 'local'));
define('CINEVERSE_DEBUG',    $debug);