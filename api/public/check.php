<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

// Autoloader
spl_autoload_register(static function (string $class): void {
    $prefix  = 'CineVerse\\';
    $baseDir = dirname(__DIR__) . '/app/';
    if (!str_starts_with($class, $prefix)) return;
    $relative = substr($class, strlen($prefix));
    $file     = $baseDir . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) require $file;
});

require __DIR__ . '/../app/Config/config.php';

$result = [];

// Check TmdbService
$file = dirname(__DIR__) . '/app/Services/TmdbService.php';
$result['tmdb_file_exists'] = is_file($file);
$result['tmdb_file_size']   = is_file($file) ? filesize($file) : 0;

if (is_file($file)) {
    $content = file_get_contents($file);
    $result['tmdb_has_searchPerson'] = strpos($content, 'function searchPerson') !== false;
    $result['tmdb_has_personDetails'] = strpos($content, 'function personDetails') !== false;
    $result['tmdb_first_50_bytes'] = bin2hex(substr($content, 0, 50));
}

// Try to load class
$result['class_exists'] = class_exists('CineVerse\\Services\\TmdbService');

if ($result['class_exists']) {
    try {
        $tmdb = new \CineVerse\Services\TmdbService();
        $result['construct'] = 'SUCCESS';
        
        try {
            $r = $tmdb->searchPerson('leonardo', 1);
            $result['searchPerson'] = 'SUCCESS: ' . count($r['results'] ?? []) . ' results';
        } catch (Throwable $e) {
            $result['searchPerson'] = 'FAILED: ' . $e->getMessage();
        }
    } catch (Throwable $e) {
        $result['construct'] = 'FAILED: ' . $e->getMessage();
        $result['construct_class'] = get_class($e);
    }
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);