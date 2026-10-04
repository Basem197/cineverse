<?php
declare(strict_types=1);

namespace CineVerse\Middleware;

use CineVerse\Core\Env;

/**
 * CorsMiddleware — production-ready CORS handling.
 *
 * - Reads allowed origins from .env (comma-separated).
 * - Allows local dev origins even if not listed (only in local env).
 * - Never uses "*" when credentials are involved.
 * - Handles preflight requests.
 */
final class CorsMiddleware
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Build allowed origins list
        $allowed = self::allowedOrigins();

        $isAllowed = $origin !== '' && in_array($origin, $allowed, true);

        if ($isAllowed) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
            header('Access-Control-Max-Age: 86400');
        } else {
            // No CORS headers for unauthorized origins — browser blocks it.
            header('Vary: Origin');
        }

        // Preflight — short-circuit
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code($isAllowed ? 204 : 403);
            exit;
        }
    }

    /**
     * @return array<int,string>
     */
    private static function allowedOrigins(): array
    {
        $raw = (string) Env::get('CORS_ALLOWED_ORIGINS', '');
        $list = array_values(array_filter(array_map('trim', explode(',', $raw))));

        // Always allow local development origins in local env
        if (Env::get('APP_ENV', 'local') === 'local') {
            $local = [
                'http://localhost',
                'http://127.0.0.1',
                'http://localhost:5500',
                'http://127.0.0.1:5500',
                'http://localhost:8080',
                'http://127.0.0.1:8080',
            ];
            foreach ($local as $o) {
                if (!in_array($o, $list, true)) {
                    $list[] = $o;
                }
            }
        }

        return $list;
    }
}