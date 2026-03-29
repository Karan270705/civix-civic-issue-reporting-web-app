<?php
// ─── Solution Controller ─────────────────────────────────────────────────────
// Business logic for solutions: create, list, vote, accept.

require_once __DIR__ . '/../models/Solution.php';
require_once __DIR__ . '/../models/Issue.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

class SolutionController {

    // ── POST /api/issues/{id}/solutions ──────────────────────────────────────

    public static function create(int $issueId): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];
        $body   = self::jsonBody();

        // ── Validate issue exists ──
        $issue = Issue::findById($issueId);
        if (!$issue) sendError('Issue not found.', 404);

        // ── Validate input ──
        $text = trim($body['solution_text'] ?? '');
        if (!$text) sendError('Solution text is required.');
        if (strlen($text) > 5000) sendError('Solution text cannot exceed 5000 characters.');

        // ── Create solution ──
        $solId    = Solution::create($issueId, $userId, $text);
        $solution = Solution::findById($solId);

        // Add user_voted flag
        $solution['user_voted'] = false;

        sendCreated([
            'message'  => 'Solution posted successfully.',
            'solution' => $solution,
        ]);
    }

    // ── GET /api/issues/{id}/solutions ───────────────────────────────────────

    public static function getByIssue(int $issueId): void {
        // ── Validate issue exists ──
        $issue = Issue::findById($issueId);
        if (!$issue) sendError('Issue not found.', 404);

        $solutions = Solution::findByIssue($issueId);

        // ── Add user_voted flag for current user (if authenticated) ──
        $auth   = getAuthPayload();
        $userId = $auth ? (int) $auth['sub'] : 0;

        $solutions = array_map(function ($sol) use ($userId) {
            $sol['user_voted'] = $userId > 0
                ? Solution::hasUserVoted((int)$sol['id'], $userId)
                : false;
            return $sol;
        }, $solutions);

        sendSuccess(['solutions' => $solutions]);
    }

    // ── GET /api/solutions/user/{userId} ─────────────────────────────────────

    public static function getByUser(int $userId): void {
        $solutions = Solution::findByUser($userId);

        $solutions = array_map(function ($sol) {
            $sol['user_voted'] = false;
            return $sol;
        }, $solutions);

        sendSuccess(['solutions' => $solutions]);
    }

    // ── POST /api/solutions/{id}/vote ────────────────────────────────────────
    //
    // Toggle upvote: vote if not voted, remove if already voted.

    public static function vote(int $solutionId): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];

        // ── Validate solution exists ──
        $solution = Solution::findById($solutionId);
        if (!$solution) sendError('Solution not found.', 404);

        // ── Toggle vote ──
        $hasVoted = Solution::hasUserVoted($solutionId, $userId);

        if ($hasVoted) {
            Solution::removeVote($solutionId, $userId);
            $action = 'removed';
        } else {
            Solution::addVote($solutionId, $userId);
            $action = 'added';
        }

        // Fetch updated solution
        $updated = Solution::findById($solutionId);

        sendSuccess([
            'message'    => "Vote $action successfully.",
            'upvotes'    => (int) $updated['upvotes'],
            'user_voted' => !$hasVoted,
        ]);
    }

    // ── POST /api/solutions/{id}/accept ──────────────────────────────────────
    //
    // Rules:
    //   - Only the issue creator can accept a solution
    //   - Only one accepted solution per issue (existing accepted gets unaccepted)

    public static function accept(int $solutionId): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];

        // ── Validate solution exists ──
        $solution = Solution::findById($solutionId);
        if (!$solution) sendError('Solution not found.', 404);

        // ── Validate the issue exists ──
        $issue = Issue::findById((int) $solution['issue_id']);
        if (!$issue) sendError('Issue not found.', 404);

        // ── Only issue creator can accept ──
        if ((int) $issue['created_by'] !== $userId) {
            sendError('Only the issue creator can accept a solution.', 403);
        }

        // ── Cannot accept own solution ──
        if ((int) $solution['user_id'] === $userId) {
            sendError('You cannot accept your own solution.', 403);
        }

        // ── Accept (toggle) ──
        if ((int) $solution['is_accepted'] === 1) {
            // Already accepted → unaccept (toggle off)
            Solution::accept(0, (int) $solution['issue_id']); // unaccept all
            $message = 'Solution unaccepted.';
            $accepted = false;
        } else {
            Solution::accept($solutionId, (int) $solution['issue_id']);
            $message = 'Solution accepted.';
            $accepted = true;
        }

        // If a solution is accepted & issue is not resolved, update status
        if ($accepted && $issue['status'] !== 'resolved') {
            Issue::updateStatus((int) $issue['id'], 'resolved');
        }

        $updated = Solution::findById($solutionId);
        sendSuccess([
            'message'  => $message,
            'solution' => $updated,
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
