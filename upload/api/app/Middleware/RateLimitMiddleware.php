<?php
declare(strict_types=1);

namespace CineVerse\Middleware;

use CineVerse\Core\Env;
use CineVerse\Core\Response;

/**
 * RateLimitMiddleware — file-based rate limiter.
 *
 * Uses a sliding window per (scope + identity).
 * No Redis required — works on shared hosting.
 */
final class RateLimitMiddleware
{
    /**
     * Enforce a rate limit. Sends 429 if exceeded.
     *
     * @param string $scope    e.g. 'auth_login', 'watchlist_write'
     * @param int    $max      max requests allowed in window
     * @param int    $window   window in seconds
     */
    public static function enforce(string $scope, ?int $max = null, ?int $window = null): void
    {
        $max    = $max    ?? Env::int('RATE_LIMIT_MAX', 60);
        $window = $window ?? Env::int('RATE_LIMIT_WINDOW', 60);

        $identity = self::identity();
        $key      = $scope . '|' . $identity;

        $dir = dirname(__DIR__, 2) . '/storage/cache/ratelimit';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $file = $dir . '/' . hash('sha256', $key) . '.json';

        $now = time();
        $data = ['hits' => []];

        if (is_file($file)) {
            $raw = @file_get_contents($file);
            if ($raw !== false && $raw !== '') {
                $decoded = @json_decode($raw, true);
                if (is_array($decoded) && isset($decoded['hits']) && is_array($decoded['hits'])) {
                    $data = $decoded;
                }
            }
        }

        // Drop old hits
        $cutoff = $now - $window;
        $data['hits'] = array_values(array_filter(
            $data['hits'],
            static fn($t) => is_int($t) && $t > $cutoff
        ));

        // Enforce
        if (count($data['hits']) >= $max) {
            $oldest = min($data['hits']);
            $retry  = max(1, $window - ($now - $oldest));

            header('Retry-After: ' . $retry);
            header('X-RateLimit-Limit: ' . $max);
            header('X-RateLimit-Remaining: 0');
            header('X-RateLimit-Reset: ' . ($oldest + $window));

            Response::error('عدد الطلبات كبير جدًا. يرجى المحاولة بعد قليل.', 429);
        }

        // Record this hit
        $data['hits'][] = $now;
        @file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);

        // (Optional) Headers for success
        $remaining = max(0, $max - count($data['hits']));
        header('X-RateLimit-Limit: ' . $max);
        header('X-RateLimit-Remaining: ' . $remaining);
    }

    /**
     * Identity for rate-limiting: hashed IP + (user_id if present).
     */
    private static function identity(): string
    {
        $ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $uid = $_SESSION['user_id'] ?? '';
        return hash('sha256', $ip . '|' . (string) $uid);
    }
}