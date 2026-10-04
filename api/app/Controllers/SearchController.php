<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Services\TMDBService;
use Throwable;

final class SearchController
{
    /**
     * GET /api/search?q=inception&type=multi&page=1&lang=en
     */
    public function search(Request $request): void
    {
        $q    = trim((string) $request->input('q', ''));
        $type = (string) $request->input('type', 'multi');
        $page = max(1, (int) $request->input('page', 1));
        $lang = $request->input('lang');

        if ($q === '') {
            Response::validation(['q' => 'Search query is required']);
        }

        if (mb_strlen($q) < 2) {
            Response::validation(['q' => 'Query must be at least 2 characters']);
        }

        if (mb_strlen($q) > 100) {
            Response::validation(['q' => 'Query is too long (max 100 characters)']);
        }

        if (!in_array($type, ['movie', 'tv', 'multi'], true)) {
            $type = 'multi';
        }

        try {
            $tmdb = new TmdbService();
        } catch (Throwable $e) {
            Response::serverError('TMDB service unavailable');
        }

        $raw = $tmdb->search($q, $type, $page, is_string($lang) && $lang !== '' ? $lang : null);

        $results = [];
        foreach ($raw['results'] ?? [] as $item) {
            if (!is_array($item)) {
                continue;
            }

            // Normalize movie/tv
            $mediaType = $item['media_type'] ?? ($type === 'tv' ? 'tv' : 'movie');
            if (!in_array($mediaType, ['movie', 'tv'], true)) {
                continue;
            }

            $title = $item['title'] ?? $item['name'] ?? null;
            $date  = $item['release_date'] ?? $item['first_air_date'] ?? null;
            $year  = is_string($date) && strlen($date) >= 4 ? (int) substr($date, 0, 4) : null;

            $results[] = [
                'tmdb_id'      => (int) ($item['id'] ?? 0),
                'type'         => $mediaType,
                'title'        => $title,
                'original_title' => $item['original_title'] ?? $item['original_name'] ?? null,
                'overview'     => $item['overview'] ?? null,
                'release_date' => $date,
                'year'         => $year,
                'poster'       => $tmdb->posterUrl($item['poster_path'] ?? null, 'w342'),
                'backdrop'     => $tmdb->backdropUrl($item['backdrop_path'] ?? null, 'w780'),
                'rating'       => isset($item['vote_average']) ? round((float) $item['vote_average'], 1) : null,
                'votes'        => (int) ($item['vote_count'] ?? 0),
                'popularity'   => isset($item['popularity']) ? round((float) $item['popularity'], 2) : null,
                'language'     => $item['original_language'] ?? null,
            ];
        }

        Response::ok($results, [
            'query'         => $q,
            'type'          => $type,
            'page'          => (int) ($raw['page'] ?? 1),
            'total_pages'   => (int) ($raw['total_pages'] ?? 1),
            'total_results' => (int) ($raw['total_results'] ?? count($results)),
        ]);
    }
}