<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Repositories\ProviderRepository;
use CineVerse\Services\TmdbService;
use Throwable;

final class ProviderController
{
    /**
     * GET /api/providers
     */
    public function index(Request $request): void
    {
        try {
            $repo = new ProviderRepository();
            $rows = $repo->all(true);
        } catch (Throwable $e) {
            error_log('[CineVerse Provider] ' . $e->getMessage());
            Response::serverError('Failed to load providers');
        }

        Response::ok($rows, ['total' => count($rows)]);
    }

    /**
     * GET /api/providers/{slug}
     */
    public function show(Request $request): void
    {
        $slug = (string) $request->routeParam('slug', '');
        if ($slug === '') {
            Response::validation(['slug' => 'Provider slug is required']);
        }

        try {
            $repo = new ProviderRepository();
            $provider = $repo->findBySlug($slug);
        } catch (Throwable $e) {
            error_log('[CineVerse Provider] ' . $e->getMessage());
            Response::serverError('Failed to load provider');
        }

        if ($provider === null) {
            Response::notFound('Provider not found');
        }

        Response::ok($provider);
    }

    /**
     * GET /api/providers/{slug}/titles?type=movie|tv&country=EG&page=1
     */
    public function titles(Request $request): void
    {
        $slug    = (string) $request->routeParam('slug', '');
        $type    = (string) $request->input('type', 'movie');
        $country = strtoupper((string) $request->input('country', 'EG'));
        $page    = max(1, min(500, (int) $request->input('page', 1)));
        $sort    = (string) $request->input('sort', 'popularity.desc');

        if ($slug === '') {
            Response::validation(['slug' => 'Provider slug is required']);
        }
        if (!in_array($type, ['movie', 'tv'], true)) {
            $type = 'movie';
        }
        if (strlen($country) !== 2) {
            $country = 'EG';
        }
        $allowedSorts = ['popularity.desc', 'vote_average.desc', 'primary_release_date.desc'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'popularity.desc';
        }

        try {
            $repo = new ProviderRepository();
            $provider = $repo->findBySlug($slug);
        } catch (Throwable $e) {
            Response::serverError('Provider lookup failed');
        }

        if ($provider === null) {
            Response::notFound('Provider not found');
        }

        if (empty($provider['tmdb_provider_id'])) {
            // Provider without TMDB id — return empty
            Response::ok([], [
                'provider'      => $provider,
                'country'       => $country,
                'type'          => $type,
                'page'          => 1,
                'total_pages'   => 0,
                'total_results' => 0,
            ]);
        }

        try {
            $tmdb = new TmdbService();
        } catch (Throwable $e) {
            Response::serverError('TMDB service unavailable');
        }

        $filters = [
            'with_watch_providers' => (string) $provider['tmdb_provider_id'],
            'watch_region'         => $country,
            'page'                 => $page,
            'sort_by'              => $sort,
        ];

        // TMDB watch_region works with both movies and TV
        $raw = $tmdb->discover($type, $filters);

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
            'provider'      => $provider,
            'country'       => $country,
            'type'          => $type,
            'sort'          => $sort,
            'page'          => (int) ($raw['page'] ?? 1),
            'total_pages'   => min(500, (int) ($raw['total_pages'] ?? 1)),
            'total_results' => (int) ($raw['total_results'] ?? count($results)),
        ]);
    }
}