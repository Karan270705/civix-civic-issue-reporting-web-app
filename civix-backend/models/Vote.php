<?php
// ─── Vote Model ───────────────────────────────────────────────────────────────
// DB operations for the `votes` table (issue votes).
// Handles per-user vote tracking and updates issues.vote_count cache.

require_once __DIR__ . '/../config/db.php';

class Vote {

    // ── Upsert vote (insert or update) ───────────────────────────────────────

    /**
     * Cast or change a vote. Uses INSERT ... ON DUPLICATE KEY UPDATE
     * so it handles both new votes and vote changes atomically.
     */
    public static function upsert(int $issueId, int $userId, string $voteType): void {
        $pdo = getDB();
        $stmt = $pdo->prepare('
            INSERT INTO votes (issue_id, user_id, vote_type)
            VALUES (:issue_id, :user_id, :vote_type)
            ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)
        ');
        $stmt->execute([
            ':issue_id'  => $issueId,
            ':user_id'   => $userId,
            ':vote_type' => $voteType,
        ]);
    }

    // ── Remove vote ──────────────────────────────────────────────────────────

    /**
     * Remove a user's vote on an issue (toggle off).
     */
    public static function remove(int $issueId, int $userId): bool {
        $pdo  = getDB();
        $stmt = $pdo->prepare('DELETE FROM votes WHERE issue_id = :issue_id AND user_id = :user_id');
        $stmt->execute([':issue_id' => $issueId, ':user_id' => $userId]);
        return $stmt->rowCount() > 0;
    }

    // ── Find user's vote on an issue ─────────────────────────────────────────

    public static function findUserVote(int $issueId, int $userId): ?string {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT vote_type FROM votes
            WHERE issue_id = :issue_id AND user_id = :user_id
            LIMIT 1
        ');
        $stmt->execute([':issue_id' => $issueId, ':user_id' => $userId]);
        $row = $stmt->fetch();
        return $row ? $row['vote_type'] : null;
    }

    // ── Recalculate vote_count ────────────────────────────────────────────────

    /**
     * Recalculate the cached vote_count on issues table.
     * vote_count = upvotes - downvotes
     */
    public static function recalculateIssueVoteCount(int $issueId): int {
        $pdo  = getDB();
        $stmt = $pdo->prepare("
            SELECT
                COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0) AS ups,
                COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0) AS downs
            FROM votes
            WHERE issue_id = :issue_id
        ");
        $stmt->execute([':issue_id' => $issueId]);
        $row = $stmt->fetch();
        $net = (int) $row['ups'] - (int) $row['downs'];

        // Update cached count
        $update = $pdo->prepare('UPDATE issues SET vote_count = :count WHERE id = :id');
        $update->execute([':count' => $net, ':id' => $issueId]);

        return $net;
    }

    // ── Count votes by user (for stats) ──────────────────────────────────────

    public static function countByUser(int $userId): int {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM votes WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetch()['cnt'];
    }
}
