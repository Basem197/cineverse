<?php
declare(strict_types=1);

namespace CineVerse\Services;

use CineVerse\Core\Env;

/**
 * CacheService — simple file-based cache.
 *
 * Usage:
 *   $cache = new CacheService();
 *   $data = $cache->remember('tmdb:movie:27205', 86400, fn() => fetchFromTmdb());
 */
final class CacheService
{
    private string $cacheDir;
    private bool   $enabled;
    private int    $defaultTtl;

    public function __construct()
    {
        $this->enabled    = Env::bool('CACHE_ENABLED', true);
        $this->defaultTtl = Env::int('CACHE_TTL', 86400);

        $relative = Env::get('CACHE_PATH', 'storage/cache');
        // Resolve relative to api root (api/app/Services → api/)
        $base     = dirname(__DIR__, 2);
        $this->cacheDir = rtrim($base . DIRECTORY_SEPARATOR . $relative, '/\\');

        if ($this->enabled && !is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0775, true);
        }
    }

    /**
     * Get a cached value, or run the callback and cache its result.
     *
     * @param string   $key      Cache key (will be hashed)
     * @param int|null $ttl      Time to live in seconds; null = default
     * @param callable $callback Producer — returns mixed
     */
    public function remember(string $key, ?int $ttl, callable $callback): mixed
    {
        if (!$this->enabled) {
            return $callback();
        }

        $cached = $this->get($key);
        if ($cached !== null) {
            return $cached;
        }

        $value = $callback();

        // Don't cache null — could be a transient TMDB failure.
        if ($value !== null) {
            $this->set($key, $value, $ttl ?? $this->defaultTtl);
        }

        return $value;
    }

    /**
     * Get a value from cache. Returns null if missing or expired.
     */
    public function get(string $key): mixed
    {
        if (!$this->enabled) {
            return null;
        }

        $file = $this->path($key);
        if (!is_file($file)) {
            return null;
        }

        $raw = @file_get_contents($file);
        if ($raw === false || $raw === '') {
            return null;
        }

        $payload = @json_decode($raw, true);
        if (!is_array($payload) || !isset($payload['expires_at'], $payload['value'])) {
            @unlink($file);
            return null;
        }

        if ((int) $payload['expires_at'] < time()) {
            @unlink($file);
            return null;
        }

        return $payload['value'];
    }

    /**
     * Store a value in cache.
     */
    public function set(string $key, mixed $value, int $ttl): bool
    {
        if (!$this->enabled) {
            return false;
        }

        $payload = [
            'expires_at' => time() + max(1, $ttl),
            'created_at' => time(),
            'value'      => $value,
        ];

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            return false;
        }

        $file = $this->path($key);
        $tmp  = $file . '.tmp.' . bin2hex(random_bytes(4));

        // Atomic write
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            return false;
        }

        return @rename($tmp, $file);
    }

    /**
     * Delete one key.
     */
    public function forget(string $key): bool
    {
        $file = $this->path($key);
        return is_file($file) ? @unlink($file) : true;
    }

    /**
     * Delete all cached files.
     */
    public function flush(): int
    {
        if (!is_dir($this->cacheDir)) {
            return 0;
        }

        $count = 0;
        foreach (glob($this->cacheDir . DIRECTORY_SEPARATOR . '*.cache') ?: [] as $file) {
            if (@unlink($file)) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Map a cache key to a filesystem path.
     */
    private function path(string $key): string
    {
        $hash = hash('sha256', $key);
        return $this->cacheDir . DIRECTORY_SEPARATOR . $hash . '.cache';
    }
}