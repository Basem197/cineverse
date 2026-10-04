<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Database;
use CineVerse\Core\Env;
use CineVerse\Core\Request;
use CineVerse\Core\Response;

/**
 * HealthController — reports system status.
 * Safe to expose publicly: no secrets in the response.
 */
final class HealthController
{
    /**
     * GET /api/health
     */
    public function index(Request $request): void
    {
        $dbOk     = Database::isHealthy();
        $dbName   = Database::name();
        $dbVer    = Database::version();

        $status = $dbOk ? 'ok' : 'degraded';

        Response::json([
            'status'      => $status,
            'app'         => Env::get('APP_NAME', 'CineVerse'),
            'env'         => Env::get('APP_ENV', 'local'),
            'php_version' => PHP_VERSION,
            'database'    => [
                'connected' => $dbOk,
                'name'      => $dbName,
                'version'   => $dbVer,
            ],
            'timestamp'   => gmdate('c'),
        ], $dbOk ? 200 : 503);
    }
}