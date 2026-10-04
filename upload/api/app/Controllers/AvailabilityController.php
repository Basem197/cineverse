<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Repositories\CountryRepository;
use CineVerse\Services\AvailabilityService;
use Throwable;

final class AvailabilityController
{
    /**
     * GET /api/titles/{id}/availability?country=EG&type=movie
     */
    public function show(Request $request): void
    {
        $id      = (int) $request->routeParam('id', '0');
        $type    = (string) $request->input('type', 'movie');
        $country = strtoupper((string) $request->input('country', 'US'));

        if ($id <= 0) {
            Response::validation(['id' => 'Invalid title id']);
        }

        if (!in_array($type, ['movie', 'tv'], true)) {
            $type = 'movie';
        }

        if (strlen($country) !== 2) {
            Response::validation(['country' => 'Invalid country code (ISO 3166-1 alpha-2)']);
        }

        // Ensure the country is one we support
        try {
            $countries = new CountryRepository();
            if (!$countries->exists($country)) {
                Response::validation(['country' => "Country '{$country}' is not supported"]);
            }
        } catch (Throwable $e) {
            error_log('[CineVerse Availability] country check failed: ' . $e->getMessage());
            Response::serverError('Availability service unavailable');
        }

        try {
            $service = new AvailabilityService();
            $data    = $service->getForTitle($id, $type, $country);
        } catch (Throwable $e) {
            error_log('[CineVerse Availability] ' . $e->getMessage());
            Response::serverError('Availability service unavailable');
        }

        Response::ok($data);
    }
}