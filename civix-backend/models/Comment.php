<?php
// ─── Comment Model ───────────────────────────────────────────────────────────
// DB operations for the `comments` table.

require_once __DIR__ . '/../config/db.php';

class Comment {

    // ── Create ────────────────────────────────────────────────────────────────

    public static function create(int $issueId, int $userId, string $text): int {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            INSERT INTO comments (issue_id, user_id, text, created_at)
            VALUES (:issue_id, :user_id, :text, NOW())
        ');
        $stmt->execute([
            ':issue_id' => $issueId,
            ':user_id'  => $userId,
            ':text'     => $text,
        ]);
        return (int) $pdo->lastInsertId();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Get all comments for an issue, oldest first, with author usernames.
     */
    public static function findByIssue(int $issueId): array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT
                c.id,
                c.issue_id,
                c.user_id,
                c.text,
                c.created_at,
                u.username
            FROM comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.issue_id = :issue_id
            ORDER BY c.created_at ASC
        ');
        $stmt->execute([':issue_id' => $issueId]);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT c.id, c.issue_id, c.user_id, c.text, c.created_at, u.username
            FROM comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = :id LIMIT 1
        ');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}
