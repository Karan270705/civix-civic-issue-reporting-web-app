<?php
// ─── User Controller ─────────────────────────────────────────────────────────
// Public user stats + civic score (computed dynamically, NEVER stored).
//
// Civic Score formula:
//   issues_count    × 10
//   solutions_count ×  5
//   accepted_count  × 20

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Issue.php';
require_once __DIR__ . '/../models/Solution.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

class UserController {

    // ── GET /api/users/{id}/stats ─────────────────────────────────────────────

    public static function getStats(int $userId): void {
        // Verify user exists
        $user = User::findById($userId);
        if (!$user) sendError('User not found.', 404);

        // ── Count dynamically ──
        $issuesCount   = count(Issue::findByUser($userId));
        $solutionsCount = Solution::countByUser($userId);
        $acceptedCount  = Solution::countAcceptedByUser($userId);

        // ── Compute civic score ──
        $civicScore = ($issuesCount * 10) + ($solutionsCount * 5) + ($acceptedCount * 20);

        sendSuccess([
            'user_id'          => $userId,
            'username'         => $user['username'],
            'issues_count'     => $issuesCount,
            'solutions_count'  => $solutionsCount,
            'accepted_count'   => $acceptedCount,
            'civic_score'      => $civicScore,
        ]);
    }

    // ── GET /api/users/{id} ──────────────────────────────────────────────────
    // Public profile view — returns sanitized user data + stats.

    public static function getPublicProfile(int $userId): void {
        $user = User::findById($userId);
        if (!$user) sendError('User not found.', 404);

        $issuesCount    = count(Issue::findByUser($userId));
        $solutionsCount = Solution::countByUser($userId);
        $acceptedCount  = Solution::countAcceptedByUser($userId);
        $civicScore     = ($issuesCount * 10) + ($solutionsCount * 5) + ($acceptedCount * 20);

        sendSuccess([
            'user' => User::sanitize($user),
            'stats' => [
                'issues_count'    => $issuesCount,
                'solutions_count' => $solutionsCount,
                'accepted_count'  => $acceptedCount,
                'civic_score'     => $civicScore,
            ],
        ]);
    }
}
