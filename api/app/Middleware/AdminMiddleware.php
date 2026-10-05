<?php
declare(strict_types=1);

namespace CineVerse\Middleware;

use CineVerse\Core\Response;
use CineVerse\Services\AuthService;

/**
 * AdminMiddleware — Verifies the current user is an admin.
 *
 * Usage:
 *   AdminMiddleware::require();         // sends 401/403 and exits if not admin
 *   AdminMiddleware::isAdmin();         // returns bool
 */
final class AdminMiddleware
{
    /**
     * Enforce admin access. Sends 401/403 and exits if not authorized.
     */
    public static function require(): void
    {
        $auth = new AuthService();
        $userId = $auth->userId();

        if ($userId === null) {
            Response::unauthorized('Authentication required');
        }

        $user = $auth->currentUser();
        if (!$user || ($user['role'] ?? '') !== 'admin') {
            Response::forbidden('Admin privileges required');
        }
    }

    /**
     * Check admin access. Returns bool (no exit).
     */
    public static function isAdmin(): bool
    {
        $auth = new AuthService();
        $userId = $auth->userId();
        if ($userId === null) {
            return false;
        }

        $user = $auth->currentUser();
        return $user !== null && ($user['role'] ?? '') === 'admin';
    }

    /**
     * Get the current admin user (safe fields). Returns null if not admin.
     */
    public static function currentAdmin(): ?array
    {
        if (!self::isAdmin()) {
            return null;
        }
        return (new AuthService())->currentUser();
    }
}