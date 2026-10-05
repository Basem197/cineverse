<?php
declare(strict_types=1);

/**
 * CineVerse — Direct health check.
 * Visit: /public/health.php
 *
 * This is an alternative to /public/api/health (via the router).
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Autoload
spl_autoload_register(static function (string $class): void {
    $prefix  = 'CineVerse\\';
    $baseDir = dirname(__DIR__) . '/app/';
    if (!str_starts_with($class, $prefix)) return;
    $relative = substr($class, strlen($prefix));
    $file     = $baseDir . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) require $file;
});

require __DIR__ . '/../app/Config/config.php';

use CineVerse\Core\Database;
use CineVerse\Core\Env;

$dbOk   = Database::isHealthy();
$dbName = Database::name();
$dbVer  = Database::version();

echo json_encode([
    'status'      => $dbOk ? 'ok' : 'degraded',
    'app'         => Env::get('APP_NAME', 'CineVerse'),
    'env'         => Env::get('APP_ENV', 'local'),
    'php_version' => PHP_VERSION,
    'database'    => [
        'connected' => $dbOk,
        'name'      => $dbName,
        'version'   => $dbVer,
    ],
    'timestamp'   => gmdate('c'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);