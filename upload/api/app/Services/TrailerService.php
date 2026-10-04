<?php
declare(strict_types=1);

namespace CineVerse\Services;

/**
 * TrailerService — pick the best trailer for a title from TMDB videos.
 *
 * Selection rules (in priority order):
 *   1. YouTube + type=Trailer + official=true
 *   2. YouTube + type=Trailer + official=false
 *   3. YouTube + type=Teaser + official=true
 *   4. YouTube + type=Teaser + official=false
 *   5. Any YouTube video
 *
 * Fallback: return null if nothing suitable.
 * Language preference: requested language first, then English, then any.
 */
final class TrailerService
{
    private TmdbService $tmdb;

    public function __construct(?TmdbService $tmdb = null)
    {
        $this->tmdb = $tmdb ?? new TmdbService();
    }

    /**
     * Get the best trailer for a title.
     *
     * @return array{
     *   available: bool,
     *   key?: string,
     *   site?: string,
     *   name?: string,
     *   type?: string,
     *   language?: string,
     *   official?: bool,
     *   published_at?: string,
     *   watch_url?: string,
     *   embed_url?: string
     * }
     */
    public function getForTitle(int $tmdbId, string $type = 'movie', string $preferredLang = 'en'): array
    {
        $type = $type === 'tv' ? 'tv' : 'movie';

        // Try preferred language first, then English
        $videos = $this->tmdb->videos($tmdbId, $type, $this->langCode($preferredLang));
        if (empty($videos) && $preferredLang !== 'en') {
            $videos = $this->tmdb->videos($tmdbId, $type, 'en-US');
        }

        if (empty($videos)) {
            return ['available' => false];
        }

        $best = $this->pickBest($videos, $preferredLang);
        if ($best === null) {
            return ['available' => false];
        }

        $key = $best['key'] ?? null;
        if (!is_string($key) || $key === '') {
            return ['available' => false];
        }

        return [
            'available'    => true,
            'key'          => $key,
            'site'         => 'YouTube',
            'name'         => $best['name'] ?? null,
            'type'         => $best['type'] ?? null,
            'language'     => $best['iso_639_1'] ?? null,
            'official'     => (bool) ($best['official'] ?? false),
            'published_at' => $best['published_at'] ?? null,
            'watch_url'    => "https://www.youtube.com/watch?v={$key}",
            'embed_url'    => "https://www.youtube.com/embed/{$key}?rel=0&modestbranding=1",
        ];
    }

    /**
     * Priority-based selection.
     *
     * @param array<int,array<string,mixed>> $videos
     */
    private function pickBest(array $videos, string $preferredLang): ?array
    {
        // Keep only YouTube videos with a key
        $yt = array_values(array_filter($videos, static function ($v): bool {
            return is_array($v)
                && ($v['site'] ?? '') === 'YouTube'
                && !empty($v['key']);
        }));

        if ($yt === []) {
            return null;
        }

        $candidates = [
            // [type, official]
            ['Trailer', true],
            ['Trailer', false],
            ['Teaser',  true],
            ['Teaser',  false],
        ];

        $preferredLangIso = $this->iso639($preferredLang);

        foreach ($candidates as [$type, $official]) {
            $filtered = array_filter($yt, static function ($v) use ($type, $official): bool {
                return ($v['type'] ?? '') === $type
                    && (bool) ($v['official'] ?? false) === $official;
            });

            if ($filtered === []) {
                continue;
            }

            // Among these, prefer requested language
            foreach ($filtered as $v) {
                if (($v['iso_639_1'] ?? '') === $preferredLangIso) {
                    return $v;
                }
            }

            // Otherwise return the first
            return reset($filtered);
        }

        // Fallback: any YouTube video
        return $yt[0];
    }

    private function langCode(string $lang): string
    {
        return match (strtolower($lang)) {
            'ar' => 'ar-SA',
            'tr' => 'tr-TR',
            'en' => 'en-US',
            default => $lang,
        };
    }

    private function iso639(string $lang): string
    {
        return match (strtolower($lang)) {
            'ar' => 'ar',
            'tr' => 'tr',
            'en' => 'en',
            default => substr($lang, 0, 2),
        };
    }
}