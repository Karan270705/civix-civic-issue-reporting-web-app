<?php
// ─── Vote Controller ─────────────────────────────────────────────────────────
// Business logic for issue voting.
// Handles: cast vote, toggle off, change vote direction.

require_once __DIR__ . '/../models/Vote.php';
require_once __DIR__ . '/../models/Issue.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

class VoteController {

    // ── POST /api/issues/{id}/vote ───────────────────────────────────────────
    //
    // Body: { "vote_type": "up" | "down" }
    //
    // Behaviour:
    //   1. Same vote type as existing → toggle OFF (remove vote)
    //   2. Different vote type → switch direction
    //   3. No existing vote → cast new vote
    //
    // Auto-verify: if net upvotes >= 10 and status is "reported", promote to "verified"

    public static function vote(int $issueId): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];
        $body   = self::jsonBody();

        // ── Validate issue exists ──
        $issue = Issue::findById($issueId);
        if (!$issue) sendError('Issue not found.', 404);

        // ── Validate vote_type ──
        $voteType = $body['vote_type'] ?? '';
        if (!in_array($voteType, ['up', 'down'], true)) {
            sendError('vote_type must be "up" or "down".');
        }

        // ── Check existing vote ──
        $existing = Vote::findUserVote($issueId, $userId);

        if ($existing === $voteType) {
            // Same vote → toggle off
            Vote::remove($issueId, $userId);
            $action = 'removed';
        } else {
            // New vote or direction change → upsert
            Vote::upsert($issueId, $userId, $voteType);
            $action = $existing ? 'changed' : 'cast';
        }

        // ── Recalculate cached vote_count ──
        $newCount = Vote::recalculateIssueVoteCount($issueId);

        // ── Auto-verify at threshold ──
        if ($newCount >= 10 && $issue['status'] === 'reported') {
            Issue::updateStatus($issueId, 'verified');
        }

        // ── Return updated state ──
        $userVote = Vote::findUserVote($issueId, $userId);
        sendSuccess([
            'message'    => "Vote $action successfully.",
            'vote_count' => $newCount,
            'user_vote'  => $userVote,
        ]);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static function jsonBody(): array {
        $raw  = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) return [];
        return $body;
    }
}
