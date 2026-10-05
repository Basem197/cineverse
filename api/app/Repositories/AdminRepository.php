<?php
declare(strict_types=1);

namespace CineVerse\Repositories;

use CineVerse\Core\Database;
use PDO;

/**
 * AdminRepository — Admin-specific data access.
 */
final class AdminRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    // ----------------------------------------------------------
    // Title Overrides
    // ----------------------------------------------------------

    /**
     * Get all overrides for a specific media_type.
     *
     * @return array<int,array<string,mixed>>
     */
    public function listOverrides(string $mediaType = 'movie', int $limit = 100, int $offset = 0): array
    {
        $stmt = $this->db->prepare(
            'SELECT o.*, u.display_name AS admin_name
             FROM title_overrides o
             LEFT JOIN users u ON u.id = o.created_by
             WHERE o.media_type = :mt
             ORDER BY o.updated_at DESC
             LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':mt', $mediaType);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return array_map([$this, 'normalizeOverride'], $stmt->fetchAll());
    }

    /**
     * Get one override by TMDB id + type.
     */
    public function findOverride(int $tmdbId, string $mediaType): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM title_overrides
             WHERE tmdb_id = :tid AND media_type = :mt
             LIMIT 1'
        );
        $stmt->execute([':tid' => $tmdbId, ':mt' => $mediaType]);
        $row = $stmt->fetch();
        return $row ? $this->normalizeOverride($row) : null;
    }

    /**
     * Create or update an override.
     */
    public function upsertOverride(array $data, int $adminId): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO title_overrides
                (tmdb_id, media_type, title, poster_url, backdrop_url, overview,
                 year, runtime, trailer_url, netflix_url, amazon_url, shahid_url,
                 apple_url, is_vip, hide_ads, is_featured, admin_notes, created_by)
             VALUES
                (:tmdb_id, :media_type, :title, :poster_url, :backdrop_url, :overview,
                 :year, :runtime, :trailer_url, :netflix_url, :amazon_url, :shahid_url,
                 :apple_url, :is_vip, :hide_ads, :is_featured, :admin_notes, :created_by)
             ON DUPLICATE KEY UPDATE
                title       = VALUES(title),
                poster_url  = VALUES(poster_url),
                backdrop_url= VALUES(backdrop_url),
                overview    = VALUES(overview),
                year        = VALUES(year),
                runtime     = VALUES(runtime),
                trailer_url = VALUES(trailer_url),
                netflix_url = VALUES(netflix_url),
                amazon_url  = VALUES(amazon_url),
                shahid_url  = VALUES(shahid_url),
                apple_url   = VALUES(apple_url),
                is_vip      = VALUES(is_vip),
                hide_ads    = VALUES(hide_ads),
                is_featured = VALUES(is_featured),
                admin_notes = VALUES(admin_notes)'
        );

        $stmt->execute([
            ':tmdb_id'      => $data['tmdb_id'],
            ':media_type'   => $data['media_type'],
            ':title'        => $data['title'] ?? null,
            ':poster_url'   => $data['poster_url'] ?? null,
            ':backdrop_url' => $data['backdrop_url'] ?? null,
            ':overview'     => $data['overview'] ?? null,
            ':year'         => $data['year'] ?? null,
            ':runtime'      => $data['runtime'] ?? null,
            ':trailer_url'  => $data['trailer_url'] ?? null,
            ':netflix_url'  => $data['netflix_url'] ?? null,
            ':amazon_url'   => $data['amazon_url'] ?? null,
            ':shahid_url'   => $data['shahid_url'] ?? null,
            ':apple_url'    => $data['apple_url'] ?? null,
            ':is_vip'       => !empty($data['is_vip']) ? 1 : 0,
            ':hide_ads'     => !empty($data['hide_ads']) ? 1 : 0,
            ':is_featured'  => !empty($data['is_featured']) ? 1 : 0,
            ':admin_notes'  => $data['admin_notes'] ?? null,
            ':created_by'   => $adminId,
        ]);

        $existing = $this->findOverride($data['tmdb_id'], $data['media_type']);
        return $existing['id'] ?? (int) $this->db->lastInsertId();
    }

    /**
     * Delete an override.
     */
    public function deleteOverride(int $tmdbId, string $mediaType): bool
    {
        $stmt = $this->db->prepare(
            'DELETE FROM title_overrides WHERE tmdb_id = :tid AND media_type = :mt'
        );
        $stmt->execute([':tid' => $tmdbId, ':mt' => $mediaType]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Get counts by type.
     */
    public function countOverrides(): array
    {
        $stmt = $this->db->query(
            'SELECT media_type, COUNT(*) AS total FROM title_overrides GROUP BY media_type'
        );
        $out = ['movie' => 0, 'tv' => 0];
        foreach ($stmt->fetchAll() as $row) {
            $out[$row['media_type']] = (int) $row['total'];
        }
        return $out;
    }

    // ----------------------------------------------------------
    // Admin Logs
    // ----------------------------------------------------------

    public function logAction(int $userId, string $action, string $entity, ?string $entityId = null, ?array $details = null): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO admin_logs (user_id, action, entity, entity_id, details, ip_hash)
             VALUES (:uid, :action, :entity, :eid, :details, :ip)'
        );

        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        $stmt->execute([
            ':uid'     => $userId,
            ':action'  => $action,
            ':entity'  => $entity,
            ':eid'     => $entityId,
            ':details' => $details !== null ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
            ':ip'      => hash('sha256', $ip),
        ]);
    }

    /**
     * Recent admin activity.
     */
    public function recentLogs(int $limit = 20): array
    {
        $stmt = $this->db->prepare(
            'SELECT l.*, u.display_name AS admin_name
             FROM admin_logs l
             LEFT JOIN users u ON u.id = l.user_id
             ORDER BY l.created_at DESC
             LIMIT :lim'
        );
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------

    private function normalizeOverride(array $row): array
    {
        return [
            'id'            => (int) $row['id'],
            'tmdb_id'       => (int) $row['tmdb_id'],
            'media_type'    => $row['media_type'],
            'title'         => $row['title'],
            'poster_url'    => $row['poster_url'],
            'backdrop_url'  => $row['backdrop_url'],
            'overview'      => $row['overview'],
            'year'          => $row['year'] !== null ? (int) $row['year'] : null,
            'runtime'       => $row['runtime'] !== null ? (int) $row['runtime'] : null,
            'trailer_url'   => $row['trailer_url'],
            'netflix_url'   => $row['netflix_url'],
            'amazon_url'    => $row['amazon_url'],
            'shahid_url'    => $row['shahid_url'],
            'apple_url'     => $row['apple_url'],
            'is_vip'        => (bool) $row['is_vip'],
            'hide_ads'      => (bool) $row['hide_ads'],
            'is_featured'   => (bool) $row['is_featured'],
            'admin_notes'   => $row['admin_notes'],
            'created_by'    => $row['created_by'] !== null ? (int) $row['created_by'] : null,
            'admin_name'    => $row['admin_name'] ?? null,
            'created_at'    => $row['created_at'],
            'updated_at'    => $row['updated_at'],
        ];
    }
}