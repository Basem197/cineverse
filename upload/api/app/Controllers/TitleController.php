<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Services\TmdbService;
use Throwable;

final class TitleController
{
    /**
     * GET /api/titles/{id}?type=movie&lang=en
     */
    public function show(Request $request): void
    {
        $id   = (int) $request->routeParam('id', '0');
        $type = (string) $request->input('type', 'movie');
        $lang = $request->input('lang');

        if ($id <= 0) {
            Response::validation(['id' => 'Invalid title id']);
        }

        if (!in_array($type, ['movie', 'tv'], true)) {
            $type = 'movie';
        }

        try {
            $tmdb = new TmdbService();
        } catch (Throwable $e) {
            Response::serverError('TMDB service unavailable');
        }

        $raw = $tmdb->details($id, $type, is_string($lang) && $lang !== '' ? $lang : null);
        if ($raw === null) {
            Response::notFound('Title not found');
        }

        // Cast (top 20)
        $cast = [];
        foreach (array_slice($raw['credits']['cast'] ?? [], 0, 20) as $person) {
            if (!is_array($person)) continue;
            $cast[] = [
                'tmdb_id'      => (int) ($person['id'] ?? 0),
                'name'         => $person['name'] ?? null,
                'character'    => $person['character'] ?? null,
                'profile'      => $tmdb->profileUrl($person['profile_path'] ?? null, 'w185'),
                'order'        => (int) ($person['order'] ?? 999),
            ];
        }

        // Directors
        $directors = [];
        foreach ($raw['credits']['crew'] ?? [] as $person) {
            if (!is_array($person)) continue;
            if (($person['job'] ?? '') === 'Director') {
                $directors[] = [
                    'tmdb_id' => (int) ($person['id'] ?? 0),
                    'name'    => $person['name'] ?? null,
                    'profile' => $tmdb->profileUrl($person['profile_path'] ?? null, 'w185'),
                ];
            }
        }

        // Genres
        $genres = [];
        foreach ($raw['genres'] ?? [] as $g) {
            if (!is_array($g)) continue;
            $genres[] = [
                'tmdb_id' => (int) ($g['id'] ?? 0),
                'name'    => $g['name'] ?? null,
            ];
        }

        // Similar titles (top 12)
        $similar = [];
        foreach (array_slice($raw['similar']['results'] ?? [], 0, 12) as $item) {
            if (!is_array($item)) continue;
            $itemType = $item['media_type'] ?? $type;
            if (!in_array($itemType, ['movie', 'tv'], true)) {
                $itemType = $type;
            }
            $similar[] = [
                'tmdb_id' => (int) ($item['id'] ?? 0),
                'type'    => $itemType,
                'title'   => $item['title'] ?? $item['name'] ?? null,
                'year'    => isset($item['release_date']) && $item['release_date']
                    ? (int) substr((string) $item['release_date'], 0, 4)
                    : (isset($item['first_air_date']) && $item['first_air_date']
                        ? (int) substr((string) $item['first_air_date'], 0, 4)
                        : null),
                'poster'  => $tmdb->posterUrl($item['poster_path'] ?? null, 'w342'),
                'rating'  => isset($item['vote_average']) ? round((float) $item['vote_average'], 1) : null,
            ];
        }

        // Seasons (TV only)
        $seasons = [];
        if ($type === 'tv') {
            foreach ($raw['seasons'] ?? [] as $s) {
                if (!is_array($s)) continue;
                $seasons[] = [
                    'season_number' => (int) ($s['season_number'] ?? 0),
                    'name'          => $s['name'] ?? null,
                    'overview'      => $s['overview'] ?? null,
                    'air_date'      => $s['air_date'] ?? null,
                    'episode_count' => (int) ($s['episode_count'] ?? 0),
                    'poster'        => $tmdb->posterUrl($s['poster_path'] ?? null, 'w342'),
                ];
            }
        }

        $title = $raw['title'] ?? $raw['name'] ?? null;
        $date  = $raw['release_date'] ?? $raw['first_air_date'] ?? null;

        Response::ok([
            'tmdb_id'        => (int) ($raw['id'] ?? $id),
            'type'           => $type,
            'title'          => $title,
            'original_title' => $raw['original_title'] ?? $raw['original_name'] ?? null,
            'tagline'        => $raw['tagline'] ?? null,
            'overview'       => $raw['overview'] ?? null,
            'release_date'   => $date,
            'year'           => is_string($date) && strlen($date) >= 4 ? (int) substr($date, 0, 4) : null,
            'runtime'        => isset($raw['runtime']) ? (int) $raw['runtime'] : null,
            'status'         => $raw['status'] ?? null,
            'poster'         => $tmdb->posterUrl($raw['poster_path'] ?? null, 'w500'),
            'backdrop'       => $tmdb->backdropUrl($raw['backdrop_path'] ?? null, 'w1280'),
            'rating'         => isset($raw['vote_average']) ? round((float) $raw['vote_average'], 1) : null,
            'votes'          => (int) ($raw['vote_count'] ?? 0),
            'popularity'     => isset($raw['popularity']) ? round((float) $raw['popularity'], 2) : null,
            'language'       => $raw['original_language'] ?? null,
            'adult'          => (bool) ($raw['adult'] ?? false),
            'genres'         => $genres,
            'cast'           => $cast,
            'directors'      => $directors,
            'seasons'        => $seasons,
            'similar'        => $similar,
        ]);
    }
}