<?php
// ─── Solution Model ──────────────────────────────────────────────────────────
// DB operations for `solutions` and `solution_votes` tables.
// No business logic — that lives in SolutionController.

require_once __DIR__ . '/../config/db.php';

class Solution {

    // ── Create ────────────────────────────────────────────────────────────────

    public static function create(int $issueId, int $userId, string $text): int {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            INSERT INTO solutions (issue_id, user_id, solution_text, created_at)
            VALUES (:issue_id, :user_id, :solution_text, NOW())
        ');
        $stmt->execute([
            ':issue_id'      => $issueId,
            ':user_id'       => $userId,
            ':solution_text' => $text,
        ]);
        return (int) $pdo->lastInsertId();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Fetch all solutions for an issue, including the author's username.
     * Ordered by: accepted first, then by upvotes descending.
     */
    public static function findByIssue(int $issueId): array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT
                s.id,
                s.issue_id,
                s.user_id,
                s.solution_text,
                s.upvotes,
                s.is_accepted,
                s.created_at,
                u.username
            FROM solutions s
            JOIN users u ON u.id = s.user_id
            WHERE s.issue_id = :issue_id
            ORDER BY s.is_accepted DESC, s.upvotes DESC, s.created_at ASC
        ');
        $stmt->execute([':issue_id' => $issueId]);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT
                s.id,
                s.issue_id,
                s.user_id,
                s.solution_text,
                s.upvotes,
                s.is_accepted,
                s.created_at,
                u.username
            FROM solutions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = :id
            LIMIT 1
        ');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Fetch all solutions by a specific user (for profile page).
     */
    public static function findByUser(int $userId): array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT
                s.id,
                s.issue_id,
                s.user_id,
                s.solution_text,
                s.upvotes,
                s.is_accepted,
                s.created_at,
                u.username
            FROM solutions s
            JOIN users u ON u.id = s.user_id
            WHERE s.user_id = :user_id
            ORDER BY s.created_at DESC
        ');
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    // ── Accept ────────────────────────────────────────────────────────────────

    /**
     * Accept a solution: unaccept all others for the issue, then accept this one.
     * Done in a transaction for atomicity.
     */
    public static function accept(int $solutionId, int $issueId): void {
        $pdo = getDB();
        $pdo->beginTransaction();
        try {
            // Unaccept all solutions for this issue
            $stmt = $pdo->prepare('UPDATE solutions SET is_accepted = 0 WHERE issue_id = :issue_id');
            $stmt->execute([':issue_id' => $issueId]);

            // Accept the chosen one
            $stmt = $pdo->prepare('UPDATE solutions SET is_accepted = 1 WHERE id = :id');
            $stmt->execute([':id' => $solutionId]);

            $pdo->commit();
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    // ── Solution Voting ──────────────────────────────────────────────────────

    /**
     * Check if a user has already voted on a solution.
     */
    public static function hasUserVoted(int $solutionId, int $userId): bool {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT 1 FROM solution_votes
            WHERE solution_id = :solution_id AND user_id = :user_id
            LIMIT 1
        ');
        $stmt->execute([':solution_id' => $solutionId, ':user_id' => $userId]);
        return (bool) $stmt->fetch();
    }

    /**
     * Add an upvote for a solution. Inserts into solution_votes and increments cached count.
     */
    public static function addVote(int $solutionId, int $userId): void {
        $pdo = getDB();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('
                INSERT INTO solution_votes (solution_id, user_id)
                VALUES (:solution_id, :user_id)
            ');
            $stmt->execute([':solution_id' => $solutionId, ':user_id' => $userId]);

            $stmt = $pdo->prepare('UPDATE solutions SET upvotes = upvotes + 1 WHERE id = :id');
            $stmt->execute([':id' => $solutionId]);

            $pdo->commit();
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Remove an upvote for a solution (toggle off).
     */
    public static function removeVote(int $solutionId, int $userId): void {
        $pdo = getDB();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('
                DELETE FROM solution_votes
                WHERE solution_id = :solution_id AND user_id = :user_id
            ');
            $stmt->execute([':solution_id' => $solutionId, ':user_id' => $userId]);

            $stmt = $pdo->prepare('UPDATE solutions SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = :id');
            $stmt->execute([':id' => $solutionId]);

            $pdo->commit();
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    // ── Stats helpers ────────────────────────────────────────────────────────

    public static function countByUser(int $userId): int {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM solutions WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetch()['cnt'];
    }

    public static function countAcceptedByUser(int $userId): int {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT COUNT(*) AS cnt FROM solutions
            WHERE user_id = :user_id AND is_accepted = 1
        ');
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetch()['cnt'];
    }
}
