<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Services\TmdbService;
use Throwable;

final class PersonController
{
    /**
     * GET /api/search/people?q=leonardo&page=1
     */
    public function search(Request $request): void
    {
        $q    = trim((string) $request->input('q', ''));
        $page = max(1, min(500, (int) $request->input('page', 1)));
        $lang = $request->input('lang');

        if ($q === '') {
            Response::validation(['q' => 'Search query is required']);
        }
        if (mb_strlen($q) < 2) {
            Response::validation(['q' => 'Query must be at least 2 characters']);
        }
        if (mb_strlen($q) > 100) {
            Response::validation(['q' => 'Query too long (max 100 characters)']);
        }

        try {
            $tmdb = new TmdbService();
        } catch (Throwable $e) {
            Response::serverError('TMDB service unavailable');
        }

        $raw = $tmdb->searchPerson($q, $page, is_string($lang) && $lang !== '' ? $lang : null);

        $results = [];
        foreach ($raw['results'] ?? [] as $item) {
            if (!is_array($item)) continue;

            $knownFor = [];
            foreach (array_slice($item['known_for'] ?? [], 0, 5) as $kf) {
                if (!is_array($kf)) continue;
                $mediaType = $kf['media_type'] ?? null;
                if (!in_array($mediaType, ['movie', 'tv'], true)) continue;

                $date = $kf['release_date'] ?? $kf['first_air_date'] ?? null;
                $year = is_string($date) && strlen($date) >= 4 ? (int) substr($date, 0, 4) : null;

                $knownFor[] = [
                    'tmdb_id' => (int) ($kf['id'] ?? 0),
                    'type'    => $mediaType,
                    'title'   => $kf['title'] ?? $kf['name'] ?? null,
                    'year'    => $year,
                    'poster'  => $tmdb->posterUrl($kf['poster_path'] ?? null, 'w185'),
                ];
            }

            $results[] = [
                'tmdb_id'    => (int) ($item['id'] ?? 0),
                'name'       => $item['name'] ?? null,
                'profile'    => $tmdb->profileUrl($item['profile_path'] ?? null, 'w185'),
                'department' => $item['known_for_department'] ?? null,
                'popularity' => isset($item['popularity']) ? round((float) $item['popularity'], 1) : null,
                'known_for'  => $knownFor,
            ];
        }

        Response::ok($results, [
            'query'         => $q,
            'page'          => (int) ($raw['page'] ?? 1),
            'total_pages'   => min(500, (int) ($raw['total_pages'] ?? 1)),
            'total_results' => (int) ($raw['total_results'] ?? count($results)),
        ]);
    }

    /**
     * GET /api/persons/{id}
     */
    public function show(Request $request): void
    {
        $id   = (int) $request->routeParam('id', '0');
        $lang = $request->input('lang');
        $langValue = is_string($lang) && $lang !== '' ? $lang : null;

        if ($id <= 0) {
            Response::validation(['id' => 'Invalid person id']);
        }

        try {
            $tmdb = new TmdbService();
        } catch (Throwable $e) {
            Response::serverError('TMDB service unavailable');
        }

        $person = $tmdb->personDetails($id, $langValue);
        if ($person === null) {
            Response::notFound('Person not found');
        }

        $credits = $tmdb->personCredits($id, $langValue);

        $works = [];
        foreach ($credits['cast'] ?? [] as $c) {
            if (!is_array($c)) continue;
            $mediaType = $c['media_type'] ?? null;
            if (!in_array($mediaType, ['movie', 'tv'], true)) continue;

            $date = $c['release_date'] ?? $c['first_air_date'] ?? null;
            $year = is_string($date) && strlen($date) >= 4 ? (int) substr($date, 0, 4) : null;

            $works[] = [
                'tmdb_id'      => (int) ($c['id'] ?? 0),
                'type'         => $mediaType,
                'title'        => $c['title'] ?? $c['name'] ?? null,
                'character'    => $c['character'] ?? null,
                'year'         => $year,
                'release_date' => $date,
                'poster'       => $tmdb->posterUrl($c['poster_path'] ?? null, 'w342'),
                'rating'       => isset($c['vote_average']) ? round((float) $c['vote_average'], 1) : null,
                'votes'        => (int) ($c['vote_count'] ?? 0),
            ];
        }

        // Remove duplicates
        $seen = [];
        $works = array_values(array_filter($works, function ($w) use (&$seen) {
            $key = $w['type'] . ':' . $w['tmdb_id'];
            if (isset($seen[$key])) return false;
            $seen[$key] = true;
            return true;
        }));

        // Sort by year DESC
        usort($works, function ($a, $b) {
            return ($b['year'] ?? 0) <=> ($a['year'] ?? 0);
        });

        Response::ok([
            'tmdb_id'        => (int) ($person['id'] ?? $id),
            'name'           => $person['name'] ?? null,
            'biography'      => $person['biography'] ?? null,
            'birthday'       => $person['birthday'] ?? null,
            'deathday'       => $person['deathday'] ?? null,
            'place_of_birth' => $person['place_of_birth'] ?? null,
            'department'     => $person['known_for_department'] ?? null,
            'profile'        => $tmdb->profileUrl($person['profile_path'] ?? null, 'w500'),
            'popularity'     => isset($person['popularity']) ? round((float) $person['popularity'], 1) : null,
            'works'          => $works,
        ]);
    }
}