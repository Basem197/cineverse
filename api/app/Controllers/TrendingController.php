<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Services\TmdbService;
use Throwable;

final class TrendingController
{
    /**
     * GET /api/trending?type=all|movie|tv&window=week|day&lang=ar
     */
    public function index(Request $request): void
    {
        $type   = (string) $request->input('type', 'all');
        $window = (string) $request->input('window', 'week');
        $lang   = $request->input('lang');

        if (!in_array($type, ['all', 'movie', 'tv'], true)) {
            $type = 'all';
        }
        if (!in_array($window, ['day', 'week'], true)) {
            $window = 'week';
        }

        try {
            $tmdb = new TmdbService();
        } catch (Throwable $e) {
            Response::serverError('TMDB service unavailable');
        }

        $raw = $tmdb->trending($type, $window, is_string($lang) && $lang !== '' ? $lang : null);

        $results = [];
        foreach ($raw as $item) {
            if (!is_array($item)) continue;

            $mediaType = $item['media_type'] ?? null;
            if (!in_array($mediaType, ['movie', 'tv'], true)) {
                continue;
            }

            $title = $item['title'] ?? $item['name'] ?? null;
            $date  = $item['release_date'] ?? $item['first_air_date'] ?? null;
            $year  = is_string($date) && strlen($date) >= 4 ? (int) substr($date, 0, 4) : null;

            $results[] = [
                'tmdb_id'        => (int) ($item['id'] ?? 0),
                'type'           => $mediaType,
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
            'type'   => $type,
            'window' => $window,
            'total'  => count($results),
        ]);
    }
}