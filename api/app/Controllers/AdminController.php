<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Middleware\AdminMiddleware;
use CineVerse\Services\AdminService;
use Throwable;

/**
 * AdminController — Admin-only endpoints.
 * All methods require admin privileges.
 */
final class AdminController
{
    /**
     * GET /api/admin/stats
     */
    public function stats(Request $request): void
    {
        AdminMiddleware::require();

        try {
            $service = new AdminService();
            Response::ok($service->getStats());
        } catch (Throwable $e) {
            error_log('[Admin] stats: ' . $e->getMessage());
            Response::serverError('Failed to load stats');
        }
    }

    /**
     * GET /api/admin/activity
     */
    public function activity(Request $request): void
    {
        AdminMiddleware::require();

        try {
            $service = new AdminService();
            $logs = $service->getRecentActivity(20);
            Response::ok($logs, ['total' => count($logs)]);
        } catch (Throwable $e) {
            error_log('[Admin] activity: ' . $e->getMessage());
            Response::serverError('Failed to load activity');
        }
    }

    /**
     * GET /api/admin/titles?type=movie&page=1
     */
    public function listTitles(Request $request): void
    {
        AdminMiddleware::require();

        $type = (string) $request->input('type', 'movie');
        $page = max(1, (int) $request->input('page', 1));

        if (!in_array($type, ['movie', 'tv'], true)) {
            $type = 'movie';
        }

        try {
            $service = new AdminService();
            $result = $service->listOverrides($type, $page, 50);
            Response::ok($result['items'], [
                'counts'   => $result['counts'],
                'page'     => $result['page'],
                'per_page' => $result['per_page'],
            ]);
        } catch (Throwable $e) {
            error_log('[Admin] listTitles: ' . $e->getMessage());
            Response::serverError('Failed to load titles');
        }
    }

    /**
     * GET /api/admin/titles/{tmdbId}?type=movie
     */
    public function getTitle(Request $request): void
    {
        AdminMiddleware::require();

        $tmdbId = (int) $request->routeParam('tmdbId', '0');
        $type   = (string) $request->input('type', 'movie');

        if ($tmdbId <= 0) {
            Response::validation(['tmdbId' => 'Invalid ID']);
        }

        try {
            $service = new AdminService();
            $item = $service->getOverride($tmdbId, $type);

            if (!$item) {
                Response::notFound('Override not found');
            }
            Response::ok($item);
        } catch (Throwable $e) {
            error_log('[Admin] getTitle: ' . $e->getMessage());
            Response::serverError('Failed to load title');
        }
    }

    /**
     * POST /api/admin/titles
     * PUT  /api/admin/titles/{tmdbId}
     */
    public function saveTitle(Request $request): void
    {
        $admin = AdminMiddleware::currentAdmin();
        if (!$admin) {
            AdminMiddleware::require();
            return;
        }
        $adminId = (int) $admin['id'];

        $body = $request->body();

        $tmdbId = isset($body['tmdb_id']) ? (int) $body['tmdb_id'] : 0;
        if ($tmdbId <= 0) {
            Response::validation(['tmdb_id' => 'TMDB ID is required']);
        }

        $data = [
            'tmdb_id'      => $tmdbId,
            'media_type'   => (string) ($body['type'] ?? $body['media_type'] ?? 'movie'),
            'title'        => $body['title'] ?? null,
            'poster_url'   => $body['poster'] ?? $body['poster_url'] ?? null,
            'backdrop_url' => $body['backdrop'] ?? $body['backdrop_url'] ?? null,
            'overview'     => $body['overview'] ?? null,
            'year'         => isset($body['year']) && $body['year'] !== '' ? (int) $body['year'] : null,
            'runtime'      => isset($body['runtime']) && $body['runtime'] !== '' ? (int) $body['runtime'] : null,
            'trailer_url'  => $body['trailer_url'] ?? null,
            'netflix_url'  => $body['netflix_url'] ?? null,
            'amazon_url'   => $body['amazon_url'] ?? null,
            'shahid_url'   => $body['shahid_url'] ?? null,
            'apple_url'    => $body['apple_url'] ?? null,
            'is_vip'       => !empty($body['is_vip']),
            'hide_ads'     => !empty($body['hide_ads']),
            'is_featured'  => !empty($body['is_featured']),
            'admin_notes'  => $body['admin_notes'] ?? null,
        ];

        if (!in_array($data['media_type'], ['movie', 'tv'], true)) {
            $data['media_type'] = 'movie';
        }

        try {
            $service = new AdminService();
            $saved = $service->saveOverride($data, $adminId);
            Response::ok($saved, ['message' => 'Title saved successfully']);
        } catch (Throwable $e) {
            error_log('[Admin] saveTitle: ' . $e->getMessage());
            Response::error($e->getMessage(), 422);
        }
    }

    /**
     * DELETE /api/admin/titles/{tmdbId}?type=movie
     */
    public function deleteTitle(Request $request): void
    {
        $admin = AdminMiddleware::currentAdmin();
        if (!$admin) {
            AdminMiddleware::require();
            return;
        }
        $adminId = (int) $admin['id'];

        $tmdbId = (int) $request->routeParam('tmdbId', '0');
        $type   = (string) $request->input('type', 'movie');

        if ($tmdbId <= 0) {
            Response::validation(['tmdbId' => 'Invalid ID']);
        }

        try {
            $service = new AdminService();
            $deleted = $service->deleteOverride($tmdbId, $type, $adminId);

            if (!$deleted) {
                Response::notFound('Override not found');
            }

            Response::ok(['deleted' => true, 'tmdb_id' => $tmdbId, 'type' => $type]);
        } catch (Throwable $e) {
            error_log('[Admin] deleteTitle: ' . $e->getMessage());
            Response::serverError('Failed to delete');
        }
    }
}