<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Repositories\CountryRepository;
use Throwable;

final class CountryController
{
    /**
     * GET /api/countries
     */
    public function index(Request $request): void
    {
        try {
            $repo = new CountryRepository();
            $rows = $repo->all(true);
        } catch (Throwable $e) {
            error_log('[CineVerse Country] ' . $e->getMessage());
            Response::serverError('Failed to load countries');
        }

        Response::ok($rows, ['total' => count($rows)]);
    }
}