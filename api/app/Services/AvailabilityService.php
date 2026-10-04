<?php
declare(strict_types=1);

namespace CineVerse\Services;

use CineVerse\Repositories\ProviderRepository;
use Throwable;

/**
 * AvailabilityService — normalize TMDB watch providers
 * into CineVerse's unified "where to watch" format.
 *
 * Output:
 *  [
 *    'country'  => 'EG',
 *    'link'     => 'https://www.themoviedb.org/movie/27205/watch?locale=EG',
 *    'offers'   => [
 *       [
 *          'offer_type' => 'flatrate',
 *          'provider'   => ['id'=>1, 'tmdb_id'=>8, 'name'=>'Netflix', 'logo'=>..., 'official_url'=>...],
 *          'quality'    => null,
 *          'price'      => null,
 *          'currency'   => null,
 *          'deep_link'  => '...'
 *       ],
 *       ...
 *    ],
 *  ]
 */
final class AvailabilityService
{
    private TmdbService $tmdb;
    private ProviderRepository $providers;

    public function __construct(?TmdbService $tmdb = null, ?ProviderRepository $providers = null)
    {
        $this->tmdb      = $tmdb      ?? new TmdbService();
        $this->providers = $providers ?? new ProviderRepository();
    }

    /**
     * Get availability for a title in a country.
     */
    public function getForTitle(int $tmdbId, string $type, string $countryCode): array
    {
        $type    = $type === 'tv' ? 'tv' : 'movie';
        $country = strtoupper($countryCode);

        $tmdbData = $this->tmdb->watchProviders($tmdbId, $type, $country);
        if ($tmdbData === null) {
            return [
                'country' => $country,
                'link'    => null,
                'offers'  => [],
                'message' => 'No official availability data for this country',
            ];
        }

        // Collect all TMDB provider IDs across offer types
        $tmdbIds = [];
        $offerTypes = ['flatrate', 'free', 'ads', 'rent', 'buy'];

        foreach ($offerTypes as $offerType) {
            foreach ($tmdbData[$offerType] ?? [] as $p) {
                if (is_array($p) && isset($p['provider_id'])) {
                    $tmdbIds[] = (int) $p['provider_id'];
                }
            }
        }
        $tmdbIds = array_values(array_unique($tmdbIds));

        // Map TMDB provider IDs → our internal rows
        $map = $this->providers->mapByTmdbIds($tmdbIds);

        $offers = [];
        foreach ($offerTypes as $offerType) {
            foreach ($tmdbData[$offerType] ?? [] as $p) {
                if (!is_array($p) || !isset($p['provider_id'])) {
                    continue;
                }

                $tmdbPid = (int) $p['provider_id'];
                $local   = $map[$tmdbPid] ?? null;

                $offers[] = [
                    'offer_type' => $offerType,
                    'provider'   => [
                        'id'           => $local['id']               ?? null,
                        'tmdb_id'      => $tmdbPid,
                        'name'         => $local['name']             ?? ($p['provider_name'] ?? null),
                        'slug'         => $local['slug']             ?? null,
                        'logo'         => $this->logoUrl($p['logo_path'] ?? null),
                        'official_url' => $local['official_url']     ?? null,
                    ],
                    'quality'    => isset($p['quality'])  ? (string) $p['quality']  : null,
                    'price'      => null, // TMDB doesn't provide pricing
                    'currency'   => null,
                    'deep_link'  => $local['official_url'] ?? null, // safe fallback
                ];
            }
        }

        return [
            'country' => $country,
            'link'    => $tmdbData['link'] ?? null,
            'offers'  => $offers,
        ];
    }

    /**
     * Build a full logo URL from TMDB's logo_path.
     */
    private function logoUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }
        $base = rtrim((string) \CineVerse\Core\Env::get('TMDB_IMAGE_BASE', 'https://image.tmdb.org/t/p'), '/');
        return "{$base}/w92{$path}";
    }
}