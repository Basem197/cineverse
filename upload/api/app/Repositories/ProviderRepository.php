<?php
declare(strict_types=1);

namespace CineVerse\Repositories;

use CineVerse\Core\Database;
use PDO;

final class ProviderRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function all(bool $activeOnly = true): array
    {
        $sql = 'SELECT id, tmdb_provider_id, name, slug, official_url, is_active
                FROM streaming_providers';
        if ($activeOnly) {
            $sql .= ' WHERE is_active = 1';
        }
        $sql .= ' ORDER BY name ASC';

        $stmt = $this->db->query($sql);
        return array_map([$this, 'normalize'], $stmt->fetchAll());
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, tmdb_provider_id, name, slug, official_url, is_active
             FROM streaming_providers WHERE slug = :slug LIMIT 1'
        );
        $stmt->execute([':slug' => $slug]);
        $row = $stmt->fetch();
        return $row ? $this->normalize($row) : null;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findByTmdbId(int $tmdbProviderId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, tmdb_provider_id, name, slug, official_url, is_active
             FROM streaming_providers WHERE tmdb_provider_id = :tid LIMIT 1'
        );
        $stmt->execute([':tid' => $tmdbProviderId]);
        $row = $stmt->fetch();
        return $row ? $this->normalize($row) : null;
    }

    /**
     * Map TMDB provider IDs to our internal rows for a set of IDs.
     *
     * @param  array<int,int> $tmdbIds
     * @return array<int,array<string,mixed>>  Keyed by tmdb_provider_id
     */
    public function mapByTmdbIds(array $tmdbIds): array
    {
        if ($tmdbIds === []) {
            return [];
        }

        // Safe: cast to int and use placeholders
        $ids = array_map('intval', $tmdbIds);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmt = $this->db->prepare(
            "SELECT id, tmdb_provider_id, name, slug, official_url, is_active
             FROM streaming_providers
             WHERE tmdb_provider_id IN ($placeholders)"
        );
        $stmt->execute($ids);

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[(int) $row['tmdb_provider_id']] = $this->normalize($row);
        }
        return $out;
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function normalize(array $row): array
    {
        return [
            'id'               => (int) $row['id'],
            'tmdb_provider_id' => $row['tmdb_provider_id'] !== null ? (int) $row['tmdb_provider_id'] : null,
            'name'             => $row['name'],
            'slug'             => $row['slug'],
            'official_url'     => $row['official_url'],
            'is_active'        => (bool) $row['is_active'],
        ];
    }
}