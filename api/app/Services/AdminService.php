<?php
declare(strict_types=1);

namespace CineVerse\Services;

use CineVerse\Repositories\AdminRepository;

/**
 * AdminService — Admin business logic.
 */
final class AdminService
{
    private AdminRepository $repo;

    public function __construct(?AdminRepository $repo = null)
    {
        $this->repo = $repo ?? new AdminRepository();
    }

    // ----------------------------------------------------------
    // Title Overrides
    // ----------------------------------------------------------

    public function listOverrides(string $mediaType, int $page = 1, int $perPage = 50): array
    {
        $page = max(1, $page);
        $perPage = min(100, max(10, $perPage));
        $offset = ($page - 1) * $perPage;

        $items = $this->repo->listOverrides($mediaType, $perPage, $offset);
        $counts = $this->repo->countOverrides();

        return [
            'items' => $items,
            'counts' => $counts,
            'page' => $page,
            'per_page' => $perPage,
        ];
    }

    public function getOverride(int $tmdbId, string $mediaType): ?array
    {
        return $this->repo->findOverride($tmdbId, $mediaType);
    }

    public function saveOverride(array $data, int $adminId): array
    {
        // Validate
        $errors = $this->validateOverride($data);
        if ($errors) {
            throw new \RuntimeException('Validation failed: ' . implode(', ', array_values($errors)));
        }

        $id = $this->repo->upsertOverride($data, $adminId);

        $this->repo->logAction($adminId, 'upsert', 'title', (string) $data['tmdb_id'], [
            'media_type' => $data['media_type'],
            'title'      => $data['title'] ?? null,
        ]);

        return $this->repo->findOverride((int) $data['tmdb_id'], (string) $data['media_type']) ?? [];
    }

    public function deleteOverride(int $tmdbId, string $mediaType, int $adminId): bool
    {
        $existing = $this->repo->findOverride($tmdbId, $mediaType);
        if (!$existing) {
            return false;
        }

        $deleted = $this->repo->deleteOverride($tmdbId, $mediaType);

        if ($deleted) {
            $this->repo->logAction($adminId, 'delete', 'title', (string) $tmdbId, [
                'media_type' => $mediaType,
                'title'      => $existing['title'] ?? null,
            ]);
        }

        return $deleted;
    }

    // ----------------------------------------------------------
    // Stats
    // ----------------------------------------------------------

    public function getStats(): array
    {
        $counts = $this->repo->countOverrides();
        return [
            'overrides' => $counts,
            'total'     => $counts['movie'] + $counts['tv'],
        ];
    }

    public function getRecentActivity(int $limit = 20): array
    {
        return $this->repo->recentLogs($limit);
    }

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------

    private function validateOverride(array $data): array
    {
        $errors = [];

        if (empty($data['tmdb_id']) || !is_numeric($data['tmdb_id']) || (int) $data['tmdb_id'] <= 0) {
            $errors['tmdb_id'] = 'TMDB ID is required and must be positive';
        }

        if (empty($data['media_type']) || !in_array($data['media_type'], ['movie', 'tv'], true)) {
            $errors['media_type'] = 'Media type must be movie or tv';
        }

        // Validate URLs (if provided)
        foreach (['trailer_url', 'netflix_url', 'amazon_url', 'shahid_url', 'apple_url', 'poster_url', 'backdrop_url'] as $field) {
            $value = $data[$field] ?? null;
            if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_URL)) {
                $errors[$field] = "Invalid URL in {$field}";
            }
        }

        return $errors;
    }
}