<?php
declare(strict_types=1);

namespace CineVerse\Repositories;

use CineVerse\Core\Database;
use PDO;

/**
 * CountryRepository — reads from `countries` table.
 */
final class CountryRepository
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
        $sql = 'SELECT code, name_en, name_ar, name_tr, flag_emoji, is_active
                FROM countries';

        if ($activeOnly) {
            $sql .= ' WHERE is_active = 1';
        }

        $sql .= ' ORDER BY code ASC';

        $stmt = $this->db->query($sql);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'normalize'], $rows);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function find(string $code): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT code, name_en, name_ar, name_tr, flag_emoji, is_active
             FROM countries WHERE code = :code LIMIT 1'
        );
        $stmt->execute([':code' => strtoupper($code)]);
        $row = $stmt->fetch();

        return $row ? $this->normalize($row) : null;
    }

    public function exists(string $code): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM countries WHERE code = :code LIMIT 1');
        $stmt->execute([':code' => strtoupper($code)]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function normalize(array $row): array
    {
        return [
            'code'       => $row['code'],
            'name_en'    => $row['name_en'],
            'name_ar'    => $row['name_ar'],
            'name_tr'    => $row['name_tr'],
            'flag_emoji' => $row['flag_emoji'],
            'is_active'  => (bool) $row['is_active'],
        ];
    }
}