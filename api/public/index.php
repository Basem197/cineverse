<?php
declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix  = 'CineVerse\\';
    $baseDir = dirname(__DIR__) . '/app/';
    if (!str_starts_with($class, $prefix)) return;
    $relative = substr($class, strlen($prefix));
    $file     = $baseDir . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) require $file;
});

require __DIR__ . '/../app/Config/config.php';

use CineVerse\Controllers\AdminController;
use CineVerse\Controllers\AuthController;
use CineVerse\Controllers\AvailabilityController;
use CineVerse\Controllers\CountryController;
use CineVerse\Controllers\DiscoverController;
use CineVerse\Controllers\FamilyGuideController;
use CineVerse\Controllers\GenreController;
use CineVerse\Controllers\HealthController;
use CineVerse\Controllers\PersonController;
use CineVerse\Controllers\ProviderController;
use CineVerse\Controllers\SearchController;
use CineVerse\Controllers\SeasonController;
use CineVerse\Controllers\TitleController;
use CineVerse\Controllers\TrailerController;
use CineVerse\Controllers\TrendingController;
use CineVerse\Controllers\WatchlistController;
use CineVerse\Core\Env;
use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Core\Router;
use CineVerse\Middleware\CorsMiddleware;

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

if ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['SERVER_PORT'] ?? '') === '443')) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

CorsMiddleware::handle();

$router  = new Router();
$request = new Request();

// Health & root
$router->get('/api/health', [HealthController::class, 'index']);
$router->get('/api', static function (): void {
    Response::ok(['message' => 'CineVerse API', 'version' => '0.9.0']);
});

// Reference data
$router->get('/api/countries', [CountryController::class, 'index']);
$router->get('/api/genres',    [GenreController::class,    'index']);

// Providers
$router->get('/api/providers',                [ProviderController::class, 'index']);
$router->get('/api/providers/{slug}',         [ProviderController::class, 'show']);
$router->get('/api/providers/{slug}/titles',  [ProviderController::class, 'titles']);

// Discovery
$router->get('/api/search',        [SearchController::class, 'search']);
$router->get('/api/search/people', [PersonController::class, 'search']);
$router->get('/api/trending',      [TrendingController::class, 'index']);

// Titles
$router->get('/api/titles/{id}',               [TitleController::class,        'show']);
$router->get('/api/titles/{id}/trailer',       [TrailerController::class,      'show']);
$router->get('/api/titles/{id}/availability',  [AvailabilityController::class, 'show']);
$router->get('/api/titles/{id}/family-guide',  [FamilyGuideController::class,  'show']);
$router->get('/api/titles/{id}/season/{num}',  [SeasonController::class,       'show']);

// People
$router->get('/api/persons/{id}', [PersonController::class, 'show']);

// Genre browsing
$router->get('/api/genres/{slug}/titles', [DiscoverController::class, 'byGenre']);

// Auth
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login',    [AuthController::class, 'login']);
$router->post('/api/auth/logout',   [AuthController::class, 'logout']);
$router->get ('/api/auth/me',       [AuthController::class, 'me']);

// Watchlist
$router->get   ('/api/watchlist',                 [WatchlistController::class, 'index']);
$router->post  ('/api/watchlist',                 [WatchlistController::class, 'store']);
$router->delete('/api/watchlist/{tmdbId}',        [WatchlistController::class, 'destroy']);
$router->get   ('/api/watchlist/check/{tmdbId}',  [WatchlistController::class, 'check']);

// ============================================================
// Admin (all require admin role)
// ============================================================
$router->get   ('/api/admin/stats',                 [AdminController::class, 'stats']);
$router->get   ('/api/admin/activity',              [AdminController::class, 'activity']);
$router->get   ('/api/admin/titles',                [AdminController::class, 'listTitles']);
$router->get   ('/api/admin/titles/{tmdbId}',       [AdminController::class, 'getTitle']);
$router->post  ('/api/admin/titles',                [AdminController::class, 'saveTitle']);
$router->put   ('/api/admin/titles/{tmdbId}',       [AdminController::class, 'saveTitle']);
$router->delete('/api/admin/titles/{tmdbId}',       [AdminController::class, 'deleteTitle']);

$router->dispatch($request);