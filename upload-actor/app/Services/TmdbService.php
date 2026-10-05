<?php
declare(strict_types=1);

namespace CineVerse\Services;

use CineVerse\Core\Env;
use RuntimeException;

/**
 * TmdbService — thin wrapper over The Movie Database API.
 * Supports v3 (api_key) and v4 (Bearer token).
 */
final class TmdbService
{
    private string $apiKey;
    private bool   $isV4;
    private string $baseUrl;
    private string $imageBase;
    private string $defaultLang;
    private int    $timeout;
    private CacheService $cache;

    public function __construct()
    {
        $key = trim((string) Env::get('TMDB_API_KEY', ''));
        if ($key === '') {
            throw new RuntimeException('TMDB_API_KEY is not configured');
        }

        $this->apiKey      = $key;
        $this->isV4        = str_starts_with($key, 'eyJ');
        $this->baseUrl     = rtrim((string) Env::get('TMDB_API_BASE', 'https://api.themoviedb.org/3'), '/');
        $this->imageBase   = rtrim((string) Env::get('TMDB_IMAGE_BASE', 'https://image.tmdb.org/t/p'), '/');
        $this->defaultLang = (string) Env::get('TMDB_LANGUAGE', 'en-US');
        $this->timeout     = Env::int('TMDB_TIMEOUT', 10);
        $this->cache       = new CacheService();
    }

    // ----------------------------------------------------------
    // Search
    // ----------------------------------------------------------

    public function search(string $query, string $type = 'multi', int $page = 1, ?string $lang = null): array
    {
        $type = in_array($type, ['movie', 'tv', 'multi'], true) ? $type : 'multi';
        $query = trim($query);
        if ($query === '') {
            return ['page' => 1, 'results' => [], 'total_pages' => 0, 'total_results' => 0];
        }

        $cacheKey = "tmdb:search:{$type}:" . md5($query) . ":p{$page}:" . ($lang ?? $this->defaultLang);

        return $this->cache->remember($cacheKey, 3600, function () use ($query, $type, $page, $lang) {
            return $this->request("/search/{$type}", [
                'query'         => $query,
                'page'          => $page,
                'language'      => $lang ?? $this->defaultLang,
                'include_adult' => 'false',
            ]);
        }) ?? ['page' => 1, 'results' => [], 'total_pages' => 0, 'total_results' => 0];
    }

    /**
     * Search people (actors, directors).
     */
    public function searchPerson(string $query, int $page = 1, ?string $lang = null): array
    {
        $query = trim($query);
        if ($query === '') {
            return ['page' => 1, 'results' => [], 'total_pages' => 0, 'total_results' => 0];
        }

        $cacheKey = "tmdb:search:person:" . md5($query) . ":p{$page}:" . ($lang ?? $this->defaultLang);

        return $this->cache->remember($cacheKey, 3600, function () use ($query, $page, $lang) {
            return $this->request('/search/person', [
                'query'         => $query,
                'page'          => $page,
                'language'      => $lang ?? $this->defaultLang,
                'include_adult' => 'false',
            ]);
        }) ?? ['page' => 1, 'results' => [], 'total_pages' => 0, 'total_results' => 0];
    }

    // ----------------------------------------------------------
    // Titles
    // ----------------------------------------------------------

    public function details(int $tmdbId, string $type = 'movie', ?string $lang = null): ?array
    {
        $type = $type === 'tv' ? 'tv' : 'movie';
        $cacheKey = "tmdb:details:{$type}:{$tmdbId}:" . ($lang ?? $this->defaultLang);

        return $this->cache->remember($cacheKey, 86400, function () use ($tmdbId, $type, $lang) {
            return $this->request("/{$type}/{$tmdbId}", [
                'language'            => $lang ?? $this->defaultLang,
                'append_to_response'  => 'credits,videos,similar,recommendations,watch/providers,keywords',
            ]);
        });
    }

    public function videos(int $tmdbId, string $type = 'movie', ?string $lang = null): array
    {
        $type = $type === 'tv' ? 'tv' : 'movie';
        $cacheKey = "tmdb:videos:{$type}:{$tmdbId}:" . ($lang ?? $this->defaultLang);

        $result = $this->cache->remember($cacheKey, 86400, function () use ($tmdbId, $type, $lang) {
            return $this->request("/{$type}/{$tmdbId}/videos", [
                'language' => $lang ?? $this->defaultLang,
            ]);
        });

        return is_array($result) ? ($result['results'] ?? []) : [];
    }

    public function watchProviders(int $tmdbId, string $type = 'movie', string $country = 'US'): ?array
    {
        $type = $type === 'tv' ? 'tv' : 'movie';
        $country = strtoupper($country);
        $cacheKey = "tmdb:providers:{$type}:{$tmdbId}:{$country}";

        $result = $this->cache->remember($cacheKey, 86400, function () use ($tmdbId, $type) {
            return $this->request("/{$type}/{$tmdbId}/watch/providers");
        });

        if (!is_array($result) || !isset($result['results'][$country])) {
            return null;
        }

        return $result['results'][$country];
    }

    public function trending(string $mediaType = 'all', string $window = 'week', ?string $lang = null): array
    {
        $mediaType = in_array($mediaType, ['movie', 'tv', 'all'], true) ? $mediaType : 'all';
        $window    = $window === 'day' ? 'day' : 'week';
        $cacheKey  = "tmdb:trending:{$mediaType}:{$window}:" . ($lang ?? $this->defaultLang);

        $result = $this->cache->remember($cacheKey, 3600, function () use ($mediaType, $window, $lang) {
            return $this->request("/trending/{$mediaType}/{$window}", [
                'language' => $lang ?? $this->defaultLang,
            ]);
        });

        return is_array($result) ? ($result['results'] ?? []) : [];
    }

    public function discover(string $type = 'movie', array $filters = []): array
    {
        $type = $type === 'tv' ? 'tv' : 'movie';
        $filters['language'] = $filters['language'] ?? $this->defaultLang;

        $cacheKey = "tmdb:discover:{$type}:" . md5(json_encode($filters) ?: '');

        $result = $this->cache->remember($cacheKey, 3600, function () use ($type, $filters) {
            return $this->request("/discover/{$type}", $filters);
        });

        return is_array($result) ? $result : ['page' => 1, 'results' => [], 'total_pages' => 0];
    }

    public function seasons(int $tmdbId, ?string $lang = null): array
    {
        $details = $this->details($tmdbId, 'tv', $lang);
        return is_array($details) ? ($details['seasons'] ?? []) : [];
    }

    public function seasonEpisodes(int $tmdbId, int $seasonNumber, ?string $lang = null): array
    {
        $cacheKey = "tmdb:season:{$tmdbId}:{$seasonNumber}:" . ($lang ?? $this->defaultLang);

        $result = $this->cache->remember($cacheKey, 86400, function () use ($tmdbId, $seasonNumber, $lang) {
            return $this->request("/tv/{$tmdbId}/season/{$seasonNumber}", [
                'language' => $lang ?? $this->defaultLang,
            ]);
        });

        return is_array($result) ? ($result['episodes'] ?? []) : [];
    }

    // ----------------------------------------------------------
    // People
    // ----------------------------------------------------------

    public function personDetails(int $tmdbId, ?string $lang = null): ?array
    {
        $cacheKey = "tmdb:person:{$tmdbId}:" . ($lang ?? $this->defaultLang);

        return $this->cache->remember($cacheKey, 86400, function () use ($tmdbId, $lang) {
            return $this->request("/person/{$tmdbId}", [
                'language' => $lang ?? $this->defaultLang,
            ]);
        });
    }

    public function personCredits(int $tmdbId, ?string $lang = null): ?array
    {
        $cacheKey = "tmdb:person:credits:{$tmdbId}:" . ($lang ?? $this->defaultLang);

        return $this->cache->remember($cacheKey, 86400, function () use ($tmdbId, $lang) {
            return $this->request("/person/{$tmdbId}/combined_credits", [
                'language' => $lang ?? $this->defaultLang,
            ]);
        });
    }

    // ----------------------------------------------------------
    // Image helpers
    // ----------------------------------------------------------

    public function posterUrl(?string $path, string $size = 'w500'): ?string
    {
        if ($path === null || $path === '') return null;
        return "{$this->imageBase}/{$size}{$path}";
    }

    public function backdropUrl(?string $path, string $size = 'w1280'): ?string
    {
        if ($path === null || $path === '') return null;
        return "{$this->imageBase}/{$size}{$path}";
    }

    public function profileUrl(?string $path, string $size = 'w185'): ?string
    {
        if ($path === null || $path === '') return null;
        return "{$this->imageBase}/{$size}{$path}";
    }

    // ----------------------------------------------------------
    // HTTP layer
    // ----------------------------------------------------------

    private function request(string $path, array $params = []): ?array
    {
        $headers = ['Accept: application/json'];

        if ($this->isV4) {
            $headers[] = 'Authorization: Bearer ' . $this->apiKey;
            $url = $this->baseUrl . $path . '?' . http_build_query($params);
        } else {
            $params['api_key'] = $this->apiKey;
            $url = $this->baseUrl . $path . '?' . http_build_query($params);
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 2,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'CineVerse/0.1 (+http://localhost)',
            CURLOPT_HTTPHEADER     => $headers,
        ]);

        $raw    = curl_exec($ch);
        $errno  = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || $raw === false) {
            error_log("[CineVerse TMDB] cURL error {$errno} for {$path}");
            return null;
        }

        if ($status === 429) {
            error_log("[CineVerse TMDB] Rate limited on {$path}");
            return null;
        }

        if ($status < 200 || $status >= 300) {
            error_log("[CineVerse TMDB] HTTP {$status} for {$path}");
            return null;
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }
}