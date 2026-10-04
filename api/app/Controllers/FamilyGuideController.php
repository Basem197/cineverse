<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Database;
use CineVerse\Core\Request;
use CineVerse\Core\Response;
use Throwable;

final class FamilyGuideController
{
    /**
     * GET /api/titles/{id}/family-guide
     *
     * Note: `title_id` here refers to our internal titles.id.
     * Since we don't yet persist TMDB titles to our DB,
     * this endpoint returns `available: false` for unknown IDs.
     * Later (Phase 11) we will sync TMDB titles and support this fully.
     */
    public function show(Request $request): void
    {
        $titleId = (int) $request->routeParam('id', '0');
        if ($titleId <= 0) {
            Response::validation(['id' => 'Invalid title id']);
        }

        try {
            $db = Database::connection();
            $stmt = $db->prepare(
                'SELECT violence, language, sexual_content, drugs, horror,
                        mature_themes, age_rating, source, notes, updated_at
                 FROM family_guides
                 WHERE title_id = :tid LIMIT 1'
            );
            $stmt->execute([':tid' => $titleId]);
            $row = $stmt->fetch();
        } catch (Throwable $e) {
            error_log('[CineVerse FamilyGuide] ' . $e->getMessage());
            Response::serverError('Family guide unavailable');
        }

        if (!$row) {
            Response::ok([
                'available' => false,
                'message'   => 'No family guide data available for this title yet',
            ]);
        }

        Response::ok([
            'available'      => true,
            'violence'       => $row['violence']       !== null ? (int) $row['violence']       : null,
            'language'       => $row['language']       !== null ? (int) $row['language']       : null,
            'sexual_content' => $row['sexual_content'] !== null ? (int) $row['sexual_content'] : null,
            'drugs'          => $row['drugs']          !== null ? (int) $row['drugs']          : null,
            'horror'         => $row['horror']         !== null ? (int) $row['horror']         : null,
            'mature_themes'  => $row['mature_themes']  !== null ? (int) $row['mature_themes']  : null,
            'age_rating'     => $row['age_rating'],
            'source'         => $row['source'],
            'notes'          => $row['notes'],
            'updated_at'     => $row['updated_at'],
        ]);
    }
}