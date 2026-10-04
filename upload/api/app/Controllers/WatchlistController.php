<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Middleware\RateLimitMiddleware;
use CineVerse\Repositories\WatchlistRepository;
use CineVerse\Services\AuthService;
use Throwable;

/**
 * WatchlistController — user watchlist CRUD.
 *
 * All endpoints require authentication (session-based).
 */
final class WatchlistController
{
    /**
     * GET /api/watchlist
     * Returns the current user's watchlist, newest first.
     */
    public function index(Request $request): void
    {
        $auth   = new AuthService();
        $userId = $auth->userId();

        if ($userId === null) {
            Response::unauthorized();
        }

        try {
            $repo  = new WatchlistRepository();
            $items = $repo->allForUser($userId);

            Response::ok($items, ['total' => count($items)]);
        } catch (Throwable $e) {
            error_log('[CineVerse Watchlist] index: ' . $e->getMessage());
            Response::serverError('تعذر تحميل قائمة المشاهدة');
        }
    }

    /**
     * POST /api/watchlist
     * Body: { tmdb_id, media_type, title?, poster_path?, year?, rating? }
     */
    public function store(Request $request): void
    {
        // Rate limit: 60 writes / minute per user+IP
        RateLimitMiddleware::enforce('watchlist_write', 60, 60);

        $auth   = new AuthService();
        $userId = $auth->userId();

        if ($userId === null) {
            Response::unauthorized();
        }

        $tmdbId     = (int) $request->input('tmdb_id', 0);
        $mediaType  = (string) $request->input('media_type', '');
        $title      = $request->input('title');
        $posterPath = $request->input('poster_path');
        $year       = $request->input('year');
        $rating     = $request->input('rating');

        // Field-level validation
        $errors = [];
        if ($tmdbId <= 0) {
            $errors['tmdb_id'] = 'معرف غير صالح';
        }
        if (!in_array($mediaType, ['movie', 'tv'], true)) {
            $errors['media_type'] = 'النوع يجب أن يكون movie أو tv';
        }
        if ($errors) {
            Response::validation($errors);
        }

        try {
            $repo = new WatchlistRepository();
            $repo->add(
                $userId,
                $tmdbId,
                $mediaType,
                is_string($title) ? $title : null,
                is_string($posterPath) ? $posterPath : null,
                is_numeric($year) ? (int) $year : null,
                is_numeric($rating) ? (float) $rating : null
            );

            Response::created([
                'tmdb_id'    => $tmdbId,
                'media_type' => $mediaType,
                'added'      => true,
            ]);
        } catch (Throwable $e) {
            error_log('[CineVerse Watchlist] store: ' . $e->getMessage());
            Response::serverError('تعذر الحفظ في القائمة');
        }
    }

    /**
     * DELETE /api/watchlist/{tmdbId}?media_type=movie|tv
     * Removes a title from the current user's watchlist.
     */
    public function destroy(Request $request): void
    {
        // Rate limit: 60 writes / minute per user+IP
        RateLimitMiddleware::enforce('watchlist_write', 60, 60);

        $auth   = new AuthService();
        $userId = $auth->userId();

        if ($userId === null) {
            Response::unauthorized();
        }

        $tmdbId    = (int) $request->routeParam('tmdbId', '0');
        $mediaType = (string) $request->input('media_type', 'movie');

        if ($tmdbId <= 0) {
            Response::validation(['tmdb_id' => 'معرف غير صالح']);
        }
        if (!in_array($mediaType, ['movie', 'tv'], true)) {
            $mediaType = 'movie';
        }

        try {
            $repo    = new WatchlistRepository();
            $removed = $repo->remove($userId, $tmdbId, $mediaType);

            Response::ok([
                'tmdb_id'    => $tmdbId,
                'media_type' => $mediaType,
                'removed'    => $removed,
            ]);
        } catch (Throwable $e) {
            error_log('[CineVerse Watchlist] destroy: ' . $e->getMessage());
            Response::serverError('تعذر الحذف من القائمة');
        }
    }

    /**
     * GET /api/watchlist/check/{tmdbId}?media_type=movie|tv
     * Returns { in_watchlist: bool } — 200 even when not authenticated.
     */
    public function check(Request $request): void
    {
        $auth   = new AuthService();
        $userId = $auth->userId();

        if ($userId === null) {
            Response::ok(['in_watchlist' => false]);
        }

        $tmdbId    = (int) $request->routeParam('tmdbId', '0');
        $mediaType = (string) $request->input('media_type', 'movie');

        if ($tmdbId <= 0 || !in_array($mediaType, ['movie', 'tv'], true)) {
            Response::ok(['in_watchlist' => false]);
        }

        try {
            $repo = new WatchlistRepository();
            Response::ok(['in_watchlist' => $repo->exists($userId, $tmdbId, $mediaType)]);
        } catch (Throwable $e) {
            error_log('[CineVerse Watchlist] check: ' . $e->getMessage());
            Response::serverError('تعذر التحقق من القائمة');
        }
    }
}