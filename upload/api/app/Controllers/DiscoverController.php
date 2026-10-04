<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Repositories\GenreRepository;
use CineVerse\Services\TmdbService;
use Throwable;

final class DiscoverController
{
    /**
     * TMDB genre applicability map.
     * 'movie' = only for movies, 'tv' = only for TV, 'both' = works for both.
     */
    private const GENRE_APPLICABILITY = [
        // Movie-only
        28    => 'movie',   // Action
        12    => 'movie',   // Adventure
        14    => 'movie',   // Fantasy
        36    => 'movie',   // History
        27    => 'movie',   // Horror
        10402 => 'movie',   // Music
        10749 => 'movie',   // Romance
        878   => 'movie',   // Science Fiction
        10770 => 'movie',   // TV Movie
        53    => 'movie',   // Thriller
        10752 => 'movie',   // War

        // TV-only
        10759 => 'tv',      // Action & Adventure
        10762 => 'tv',      // Kids
        10763 => 'tv',      // News
        10764 => 'tv',      // Reality
        10765 => 'tv',      // Sci-Fi & Fantasy
        10766 => 'tv',      // Soap
        10767 => 'tv',      // Talk
        10768 => 'tv',      // War & Politics

        // Both
        16    => 'both',    // Animation
        35    => 'both',    // Comedy
        80    => 'both',    // Crime
        99    => 'both',    // Documentary
        18    => 'both',    // Drama
        10751 => 'both',    // Family
        9648  => 'both',    // Mystery
        37    => 'both',    // Western
    ];

    /**
     * GET /api/genres/{slug}/titles?type=movie|tv&page=1&sort=...&lang=ar
     */
    public function byGenre(Request $request): void
    {
        $slug = (string) $request->routeParam('slug', '');
        $type = (string) $request->input('type', 'movie');
        $page = max(1, min(500, (int) $request->input('page', 1)));
        $sort = (string) $request->input('sort', 'popularity.desc');
        $lang = $request->input('lang');

        if ($slug === '') {
            Response::validation(['slug' => 'Genre slug is required']);
        }

        if (!in_array($type, ['movie', 'tv'], true)) {
            $type = 'movie';
        }

        $allowedSorts = ['popularity.desc', 'vote_average.desc', 'release_date.desc', 'primary_release_date.desc'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'popularity.desc';
        }

        try {
            $genres = new GenreRepository();
            $genre  = $genres->findBySlug($slug);
        } catch (Throwable $e) {
            error_log('[Discover] genre lookup failed: ' . $e->getMessage());
            Response::serverError('Genre lookup failed');
        }

        if ($genre === null) {
            Response::notFound('Genre not found');
        }

        // Determine applicability
        $tmdbId = (int) $genre['tmdb_id'];
        $applicable = self::GENRE_APPLICABILITY[$tmdbId] ?? 'both';

        // Auto-correct type if genre doesn't support it
        if ($applicable === 'movie' && $type === 'tv') {
            $type = 'movie';
        } elseif ($applicable === 'tv' && $type === 'movie') {
            $type = 'tv';
        }

        try {
            $tmdb = new TmdbService();
        } catch (Throwable $e) {
            Response::serverError('TMDB service unavailable');
        }

        $filters = [
            'with_genres' => (string) $tmdbId,
            'page'        => $page,
            'sort_by'     => $sort,
            'language'    => is_string($lang) && $lang !== '' ? $lang : null,
        ];

        if ($type === 'tv') {
            if ($sort === 'primary_release_date.desc' || $sort === 'release_date.desc') {
                $filters['sort_by'] = 'first_air_date.desc';
            }
        } else {
            if ($sort === 'primary_release_date.desc' || $sort === 'release_date.desc') {
                $filters['sort_by'] = 'primary_release_date.desc';
            }
        }

        $raw = $tmdb->discover($type, array_filter($filters, fn($v) => $v !== null));

        $results = [];
        foreach ($raw['results'] ?? [] as $item) {
            if (!is_array($item)) continue;

            $title = $item['title'] ?? $item['name'] ?? null;
            $date  = $item['release_date'] ?? $item['first_air_date'] ?? null;
            $year  = is_string($date) && strlen($date) >= 4 ? (int) substr($date, 0, 4) : null;

            $results[] = [
                'tmdb_id'        => (int) ($item['id'] ?? 0),
                'type'           => $type,
                'title'          => $title,
                'original_title' => $item['original_title'] ?? $item['original_name'] ?? null,
                'overview'       => $item['overview'] ?? null,
                'release_date'   => $date,
                'year'           => $year,
                'poster'         => $tmdb->posterUrl($item['poster_path'] ?? null, 'w342'),
                'backdrop'       => $tmdb->backdropUrl($item['backdrop_path'] ?? null, 'w780'),
                'rating'         => isset($item['vote_average']) ? round((float) $item['vote_average'], 1) : null,
                'votes'          => (int) ($item['vote_count'] ?? 0),
                'popularity'     => isset($item['popularity']) ? round((float) $item['popularity'], 2) : null,
                'language'       => $item['original_language'] ?? null,
            ];
        }

        Response::ok($results, [
            'genre' => [
                'slug'       => $genre['slug'],
                'name_en'    => $genre['name_en'],
                'name_ar'    => $genre['name_ar'],
                'tmdb_id'    => $tmdbId,
                'applicable' => $applicable,   // ← مهم: 'movie' | 'tv' | 'both'
            ],
            'type'          => $type,
            'sort'          => $filters['sort_by'],
            'page'          => (int) ($raw['page'] ?? 1),
            'total_pages'   => min(500, (int) ($raw['total_pages'] ?? 1)),
            'total_results' => (int) ($raw['total_results'] ?? count($results)),
        ]);
    }
}