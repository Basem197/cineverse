<?php
declare(strict_types=1);

namespace CineVerse\Core;

use PDO;
use PDOException;
use RuntimeException;

/**
 * Database — PDO connection singleton.
 *
 * Usage:
 *   $pdo = Database::connection();
 *   $stmt = $pdo->prepare('SELECT * FROM countries');
 *   $stmt->execute();
 */
final class Database
{
    private static ?PDO $pdo = null;

    /**
     * Get (or create) the shared PDO connection.
     */
    public static function connection(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host    = Env::get('DB_HOST', '127.0.0.1');
        $port    = Env::get('DB_PORT', '3306');
        $name    = Env::get('DB_NAME', 'cineverse');
        $user    = Env::get('DB_USER', 'root');
        $pass    = Env::get('DB_PASS', '');
        $charset = Env::get('DB_CHARSET', 'utf8mb4');

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $host,
            $port,
            $name,
            $charset
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_STRINGIFY_FETCHES  => false,
        ];

        try {
            self::$pdo = new PDO($dsn, (string) $user, (string) $pass, $options);
        } catch (PDOException $e) {
            // Do not leak credentials or DSN to the client.
            error_log('[CineVerse DB] Connection failed: ' . $e->getMessage());
            throw new RuntimeException('Database connection failed', 500, $e);
        }

        return self::$pdo;
    }

    /**
     * Quick health check — returns true if the DB answers a trivial query.
     */
    public static function isHealthy(): bool
    {
        try {
            $pdo = self::connection();
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Get current database name.
     */
    public static function name(): string
    {
        return (string) Env::get('DB_NAME', 'cineverse');
    }

    /**
     * Get MySQL/MariaDB server version.
     */
    public static function version(): ?string
    {
        try {
            return (string) self::connection()->getAttribute(PDO::ATTR_SERVER_VERSION);
        } catch (\Throwable $e) {
            return null;
        }
    }
}