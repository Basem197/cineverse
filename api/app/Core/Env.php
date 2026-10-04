<?php
declare(strict_types=1);

namespace CineVerse\Core;

/**
 * Env — Simple .env file reader
 *
 * Reads the .env file from the API root and exposes values via get().
 * No external dependencies. Safe to use in production.
 */
final class Env
{
    /** @var array<string,string> */
    private static array $vars = [];

    private static bool $loaded = false;

    /**
     * Load the .env file. Safe to call multiple times (idempotent).
     *
     * @param string|null $path Full path to .env. If null, uses API root.
     */
    public static function load(?string $path = null): void
    {
        if (self::$loaded) {
            return;
        }

        if ($path === null) {
            // Default: api/.env  (this file lives in api/app/Core/)
            $path = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env';
        }

        if (!is_readable($path)) {
            // .env missing is not fatal — values can come from real env vars
            self::$loaded = true;
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            self::$loaded = true;
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);

            // Skip comments and blank lines
            if ($line === '' || $line[0] === '#') {
                continue;
            }

            // Skip malformed lines
            $pos = strpos($line, '=');
            if ($pos === false) {
                continue;
            }

            $key   = trim(substr($line, 0, $pos));
            $value = trim(substr($line, $pos + 1));

            // Strip surrounding quotes (single or double)
            if (strlen($value) >= 2) {
                $first = $value[0];
                $last  = $value[strlen($value) - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }

            if ($key !== '') {
                self::$vars[$key] = $value;
            }
        }

        self::$loaded = true;
    }

    /**
     * Get an environment variable.
     *
     * Lookup order:
     *   1. .env file
     *   2. Real environment (getenv)
     *   3. $default
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        self::load();

        if (array_key_exists($key, self::$vars)) {
            return self::$vars[$key];
        }

        $real = getenv($key);
        if ($real !== false) {
            return $real;
        }

        return $default;
    }

    /**
     * Get boolean value. Accepts: true/1/yes/on (case-insensitive).
     */
    public static function bool(string $key, bool $default = false): bool
    {
        $value = self::get($key);
        if ($value === null) {
            return $default;
        }
        return in_array(strtolower($value), ['true', '1', 'yes', 'on'], true);
    }

    /**
     * Get integer value.
     */
    public static function int(string $key, int $default = 0): int
    {
        $value = self::get($key);
        if ($value === null || !is_numeric($value)) {
            return $default;
        }
        return (int) $value;
    }
}