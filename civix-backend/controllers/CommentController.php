<?php
// ─── Comment Controller ──────────────────────────────────────────────────────
// Business logic for comments on issues.

require_once __DIR__ . '/../models/Comment.php';
require_once __DIR__ . '/../models/Issue.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

class CommentController {

    // ── POST /api/issues/{id}/comments ───────────────────────────────────────

    public static function create(int $issueId): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];
        $body   = self::jsonBody();

        // ── Validate issue exists ──
        $issue = Issue::findById($issueId);
        if (!$issue) sendError('Issue not found.', 404);

        // ── Validate input ──
        $text = trim($body['text'] ?? '');
        if (!$text) sendError('Comment text is required.');
        if (strlen($text) > 2000) sendError('Comment cannot exceed 2000 characters.');

        // ── Create comment ──
        $commentId = Comment::create($issueId, $userId, $text);
        $comment   = Comment::findById($commentId);

        sendCreated([
            'message' => 'Comment posted successfully.',
            'comment' => $comment,
        ]);
    }

    // ── GET /api/issues/{id}/comments ────────────────────────────────────────

    public static function getByIssue(int $issueId): void {
        $issue = Issue::findById($issueId);
        if (!$issue) sendError('Issue not found.', 404);

        $comments = Comment::findByIssue($issueId);
        sendSuccess(['comments' => $comments]);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static function jsonBody(): array {
        $raw  = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) return [];
        return $body;
    }
}
