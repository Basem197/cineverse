<?php
declare(strict_types=1);

namespace CineVerse\Repositories;

use CineVerse\Core\Database;
use PDO;

final class UserRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * Find user by ID. Password hash is NOT included.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, email, display_name, preferred_language, preferred_country,
                    role, email_verified_at, is_active, last_login_at, created_at
             FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->normalize($row) : null;
    }

    /**
     * Find user by ID INCLUDING password hash (for auth checks only).
     */
    public function findByIdWithHash(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, email, display_name, password_hash,
                    preferred_language, preferred_country, role, is_active,
                    email_verified_at, last_login_at, created_at
             FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Find user by email INCLUDING password hash.
     */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, email, display_name, password_hash,
                    preferred_language, preferred_country, role, is_active,
                    email_verified_at, last_login_at, created_at
             FROM users WHERE email = :email LIMIT 1'
        );
        $stmt->execute([':email' => strtolower($email)]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function emailExists(string $email): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => strtolower($email)]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * Create a new user. Returns the new user's ID.
     */
    public function create(
        string $email,
        string $passwordHash,
        string $displayName,
        ?string $preferredCountry = null,
        string $preferredLanguage = 'ar'
    ): int {
        $stmt = $this->db->prepare(
            'INSERT INTO users (email, password_hash, display_name, preferred_country, preferred_language)
             VALUES (:email, :hash, :name, :country, :lang)'
        );
        $stmt->execute([
            ':email'   => strtolower($email),
            ':hash'    => $passwordHash,
            ':name'    => $displayName,
            ':country' => $preferredCountry,
            ':lang'    => $preferredLanguage,
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function touchLogin(int $userId): void
    {
        $stmt = $this->db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id');
        $stmt->execute([':id' => $userId]);
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function normalize(array $row): array
    {
        return [
            'id'                 => (int) $row['id'],
            'email'              => $row['email'],
            'display_name'       => $row['display_name'],
            'preferred_language' => $row['preferred_language'],
            'preferred_country'  => $row['preferred_country'],
            'role'               => $row['role'],
            'email_verified_at'  => $row['email_verified_at'],
            'is_active'          => (bool) $row['is_active'],
            'last_login_at'      => $row['last_login_at'],
            'created_at'         => $row['created_at'],
        ];
    }
}