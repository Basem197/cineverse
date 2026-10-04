<?php
declare(strict_types=1);

require __DIR__ . '/../app/Config/config.php';

use CineVerse\Core\Env;

header('Content-Type: application/json; charset=utf-8');

$key = Env::get('TMDB_API_KEY', 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmYjBmMjEyOGNjYjM2Y2Q2NTFlOTFiYjkyNTVmOGRkYiIsIm5iZiI6MTc5MDI0MDk4NS4yNDE5OTk5LCJzdWIiOiI2YWI0ZThkOTNlYTgwNTdmYjZmZGE4YjMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.eYRhnfjuXbV_EhWH-S8Wec_DrLB_kkn4taynPNlRKXE');

echo json_encode([
    'env_loaded'    => true,
    'key_present'   => $key !== '',
    'key_length'    => strlen((string) $key),
    'key_preview'   => $key !== '' ? substr((string) $key, 0, 4) . '...' . substr((string) $key, -4) : null,
    'db_host'       => Env::get('DB_HOST'),
    'db_name'       => Env::get('DB_NAME'),
    'env_file_path' => dirname(__DIR__) . '/.env',
    'env_readable'  => is_readable(dirname(__DIR__) . '/.env'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);