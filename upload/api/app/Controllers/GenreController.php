<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Repositories\GenreRepository;
use Throwable;

final class GenreController
{
    /**
     * GET /api/genres
     */
    public function index(Request $request): void
    {
        try {
            $repo = new GenreRepository();
            $rows = $repo->all();
        } catch (Throwable $e) {
            error_log('[CineVerse Genre] ' . $e->getMessage());
            Response::serverError('Failed to load genres');
        }

        Response::ok($rows, ['total' => count($rows)]);
    }
}