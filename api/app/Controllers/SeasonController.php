<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Services\TmdbService;
use Throwable;

final class SeasonController
{
    /**
     * GET /api/titles/{id}/season/{num}?lang=ar
     */
    public function show(Request $request): void
    {
        $id   = (int) $request->routeParam('id', '0');
        $num  = (int) $request->routeParam('num', '0');
        $lang = $request->input('lang');

        if ($id <= 0 || $num < 0) {
            Response::validation(['id' => 'Invalid title or season number']);
        }

        try {
            $tmdb = new TmdbService();
        } catch (Throwable $e) {
            Response::serverError('TMDB service unavailable');
        }

        $episodes = $tmdb->seasonEpisodes($id, $num, is_string($lang) && $lang !== '' ? $lang : null);

        $results = [];
        foreach ($episodes as $ep) {
            if (!is_array($ep)) continue;

            $results[] = [
                'episode_number' => (int) ($ep['episode_number'] ?? 0),
                'name'           => $ep['name'] ?? null,
                'overview'       => $ep['overview'] ?? null,
                'air_date'       => $ep['air_date'] ?? null,
                'runtime'        => isset($ep['runtime']) ? (int) $ep['runtime'] : null,
                'still'          => !empty($ep['still_path'])
                    ? $tmdb->backdropUrl($ep['still_path'], 'w300')
                    : null,
                'rating'         => isset($ep['vote_average']) ? round((float) $ep['vote_average'], 1) : null,
            ];
        }

        Response::ok($results, [
            'season_number' => $num,
            'total'         => count($results),
        ]);
    }
}