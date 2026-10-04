<?php
declare(strict_types=1);

namespace CineVerse\Core;

/**
 * Response — uniform JSON responses with correct HTTP status codes.
 */
final class Response
{
    /**
     * Send a success JSON response and exit.
     *
     * @param mixed $data
     */
    public static function json(mixed $data, int $status = 200): never
    {
        self::setCommonHeaders();
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
        );
        exit;
    }

    /**
     * Send a success envelope: { "success": true, "data": ..., "meta": ... }
     */
    public static function ok(mixed $data = null, array $meta = []): never
    {
        $payload = ['success' => true];
        if ($data !== null) {
            $payload['data'] = $data;
        }
        if ($meta !== []) {
            $payload['meta'] = $meta;
        }
        self::json($payload, 200);
    }

    /**
     * Send a 201 Created response.
     */
    public static function created(mixed $data = null): never
    {
        $payload = ['success' => true];
        if ($data !== null) {
            $payload['data'] = $data;
        }
        self::json($payload, 201);
    }

    /**
     * Send an error JSON response.
     *
     * @param string $message Human-readable message
     * @param int    $status  HTTP status
     * @param array  $extra   Optional extra fields (e.g. field errors)
     */
    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        $payload = [
            'success' => false,
            'error'   => array_merge([
                'message' => $message,
                'status'  => $status,
            ], $extra),
        ];
        self::json($payload, $status);
    }

    /** Convenience shortcuts */
    public static function notFound(string $message = 'Resource not found'): never
    {
        self::error($message, 404);
    }

    public static function unauthorized(string $message = 'Authentication required'): never
    {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): never
    {
        self::error($message, 403);
    }

    public static function validation(array $errors, string $message = 'Validation failed'): never
    {
        self::error($message, 422, ['fields' => $errors]);
    }

    public static function serverError(string $message = 'Internal server error'): never
    {
        self::error($message, 500);
    }

    /**
     * Common security headers.
     *
     * NOTE: The front controller (index.php) sets the primary security
     * headers before dispatching. We deliberately do NOT override them
     * here, so that the stricter values set in index.php take precedence.
     *
     * This method exists as a hook for future per-response headers if needed.
     */
    private static function setCommonHeaders(): void
    {
        // Security headers are set once in api/public/index.php:
        //   - X-Content-Type-Options
        //   - X-Frame-Options
        //   - Referrer-Policy
        //   - Permissions-Policy
        //   - Strict-Transport-Security (HTTPS only)
        //
        // We intentionally do nothing here to avoid conflicting values.
    }
}