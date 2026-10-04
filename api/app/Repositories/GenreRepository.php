<?php
declare(strict_types=1);

namespace CineVerse\Repositories;

use CineVerse\Core\Database;
use PDO;

final class GenreRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function all(): array
    {
        $stmt = $this->db->query(
            'SELECT id, tmdb_id, name_en, name_ar, slug
             FROM genres
             ORDER BY name_en ASC'
        );
        return array_map([$this, 'normalize'], $stmt->fetchAll());
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, tmdb_id, name_en, name_ar, slug
             FROM genres WHERE slug = :slug LIMIT 1'
        );
        $stmt->execute([':slug' => $slug]);
        $row = $stmt->fetch();
        return $row ? $this->normalize($row) : null;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findByTmdbId(int $tmdbId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, tmdb_id, name_en, name_ar, slug
             FROM genres WHERE tmdb_id = :tid LIMIT 1'
        );
        $stmt->execute([':tid' => $tmdbId]);
        $row = $stmt->fetch();
        return $row ? $this->normalize($row) : null;
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function normalize(array $row): array
    {
        return [
            'id'      => (int) $row['id'],
            'tmdb_id' => (int) $row['tmdb_id'],
            'name_en' => $row['name_en'],
            'name_ar' => $row['name_ar'],
            'slug'    => $row['slug'],
        ];
    }
}