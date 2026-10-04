<?php
declare(strict_types=1);

namespace CineVerse\Repositories;

use CineVerse\Core\Database;
use PDO;

/**
 * WatchlistRepository — user watchlist (TMDB snapshots).
 *
 * Since TMDB titles are not yet persisted to our `titles` table,
 * we store lightweight snapshots in `user_watchlist_items`.
 */
final class WatchlistRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * Get all watchlist items for a user, newest first.
     *
     * @return array<int,array<string,mixed>>
     */
    public function allForUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, tmdb_id, media_type, title, poster_path, year, rating, added_at
             FROM user_watchlist_items
             WHERE user_id = :uid
             ORDER BY added_at DESC'
        );
        $stmt->execute([':uid' => $userId]);

        $rows = $stmt->fetchAll();

        return array_map(static function (array $row): array {
            return [
                'tmdb_id'     => (int) $row['tmdb_id'],
                'media_type'  => $row['media_type'],
                'title'       => $row['title'],
                'poster_path' => $row['poster_path'],
                'year'        => $row['year'] !== null ? (int) $row['year'] : null,
                'rating'      => $row['rating'] !== null ? (float) $row['rating'] : null,
                'added_at'    => $row['added_at'],
            ];
        }, $rows);
    }

    /**
     * Check if a specific title is already in the user's watchlist.
     */
    public function exists(int $userId, int $tmdbId, string $mediaType): bool
    {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM user_watchlist_items
             WHERE user_id = :uid AND tmdb_id = :tid AND media_type = :mt
             LIMIT 1'
        );
        $stmt->execute([
            ':uid' => $userId,
            ':tid' => $tmdbId,
            ':mt'  => $mediaType,
        ]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * Add (or update) a title in the user's watchlist.
     */
    public function add(
        int $userId,
        int $tmdbId,
        string $mediaType,
        ?string $title = null,
        ?string $posterPath = null,
        ?int $year = null,
        ?float $rating = null
    ): void {
        $stmt = $this->db->prepare(
            'INSERT INTO user_watchlist_items
                (user_id, tmdb_id, media_type, title, poster_path, year, rating)
             VALUES (:uid, :tid, :mt, :title, :poster, :year, :rating)
             ON DUPLICATE KEY UPDATE
                title       = VALUES(title),
                poster_path = VALUES(poster_path),
                year        = VALUES(year),
                rating      = VALUES(rating)'
        );
        $stmt->execute([
            ':uid'    => $userId,
            ':tid'    => $tmdbId,
            ':mt'     => $mediaType,
            ':title'  => $title,
            ':poster' => $posterPath,
            ':year'   => $year,
            ':rating' => $rating,
        ]);
    }

    /**
     * Remove a title from the user's watchlist.
     * Returns true if a row was actually deleted.
     */
    public function remove(int $userId, int $tmdbId, string $mediaType): bool
    {
        $stmt = $this->db->prepare(
            'DELETE FROM user_watchlist_items
             WHERE user_id = :uid AND tmdb_id = :tid AND media_type = :mt'
        );
        $stmt->execute([
            ':uid' => $userId,
            ':tid' => $tmdbId,
            ':mt'  => $mediaType,
        ]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Count items in the user's watchlist.
     */
    public function count(int $userId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM user_watchlist_items WHERE user_id = :uid'
        );
        $stmt->execute([':uid' => $userId]);
        return (int) $stmt->fetchColumn();
    }
}