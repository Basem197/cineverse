<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Services\TrailerService;
use Throwable;

final class TrailerController
{
    /**
     * GET /api/titles/{id}/trailer?type=movie&lang=en
     */
    public function show(Request $request): void
    {
        $id   = (int) $request->routeParam('id', '0');
        $type = (string) $request->input('type', 'movie');
        $lang = (string) $request->input('lang', 'en');

        if ($id <= 0) {
            Response::validation(['id' => 'Invalid title id']);
        }

        if (!in_array($type, ['movie', 'tv'], true)) {
            $type = 'movie';
        }

        if (!in_array($lang, ['en', 'ar', 'tr'], true)) {
            $lang = 'en';
        }

        try {
            $service = new TrailerService();
        } catch (Throwable $e) {
            Response::serverError('Trailer service unavailable');
        }

        $trailer = $service->getForTitle($id, $type, $lang);

        Response::ok($trailer);
    }
}