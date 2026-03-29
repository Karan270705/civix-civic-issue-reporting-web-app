<?php
// ─── Issue Controller ─────────────────────────────────────────────────────────
// Business logic for issue endpoints.
// Controllers read the request, validate, call the model, return via helpers.

require_once __DIR__ . '/../models/Issue.php';
require_once __DIR__ . '/../models/Vote.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

class IssueController {

    // Valid category and status values — must match the DB ENUM columns
    private const VALID_CATEGORIES = ['pothole', 'garbage', 'water', 'electricity', 'other'];
    private const VALID_STATUSES   = ['reported', 'verified', 'in_progress', 'resolved'];

    // ── POST /api/issues ─────────────────────────────────────────────────────

    public static function create(): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];
        $body   = self::jsonBody();

        // ── Validation ──
        $title       = trim($body['title']       ?? '');
        $description = trim($body['description'] ?? '');
        $location    = trim($body['location']    ?? '');
        $category    =      $body['category']    ?? '';
        $imageUrl    = trim($body['image_url']   ?? '');
        $lat         =      $body['lat']         ?? null;
        $lng         =      $body['lng']         ?? null;

        if (!$title)                                       sendError('Title is required.');
        if (strlen($title) > 120)                          sendError('Title cannot exceed 120 characters.');
        if (!$description)                                 sendError('Description is required.');
        if (!$location)                                    sendError('Location is required.');
        if (strlen($location) > 255)                       sendError('Location cannot exceed 255 characters.');
        if (!$category)                                    sendError('Category is required.');
        if (!in_array($category, self::VALID_CATEGORIES, true)) {
            sendError('Invalid category. Must be one of: ' . implode(', ', self::VALID_CATEGORIES));
        }

        // Validate optional fields
        if ($imageUrl !== '' && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
            sendError('Image URL must be a valid URL.');
        }
        if ($lat !== null && (!is_numeric($lat) || $lat < -90 || $lat > 90)) {
            sendError('Latitude must be a number between -90 and 90.');
        }
        if ($lng !== null && (!is_numeric($lng) || $lng < -180 || $lng > 180)) {
            sendError('Longitude must be a number between -180 and 180.');
        }

        // ── Create issue ──
        $issueId = Issue::create([
            'title'       => $title,
            'description' => $description,
            'image_url'   => $imageUrl ?: null,
            'location'    => $location,
            'lat'         => $lat,
            'lng'         => $lng,
            'category'    => $category,
            'created_by'  => $userId,
        ]);

        $issue = Issue::findById($issueId);
        $issue['user_vote'] = null;

        sendCreated([
            'message' => 'Issue created successfully.',
            'issue'   => $issue
        ]);
    }

    // ── GET /api/issues ──────────────────────────────────────────────────────

    public static function getAll(): void {
        $issues = Issue::getAll();

        // Attach user_vote for current user if authenticated
        $auth   = getAuthPayload();
        $userId = $auth ? (int) $auth['sub'] : 0;

        $issues = array_map(function ($issue) use ($userId) {
            $issue['user_vote'] = $userId > 0
                ? Vote::findUserVote((int)$issue['id'], $userId)
                : null;
            return $issue;
        }, $issues);

        sendSuccess(['issues' => $issues]);
    }

    // ── GET /api/issues/{id} ─────────────────────────────────────────────────

    public static function getOne(int $id): void {
        $issue = Issue::findById($id);
        if (!$issue) sendError('Issue not found.', 404);

        // Attach user_vote for current user if authenticated
        $auth   = getAuthPayload();
        $userId = $auth ? (int) $auth['sub'] : 0;
        $issue['user_vote'] = $userId > 0
            ? Vote::findUserVote($id, $userId)
            : null;

        sendSuccess(['issue' => $issue]);
    }

    // ── GET /api/issues/user/{userId} ────────────────────────────────────────

    public static function getByUser(int $targetUserId): void {
        $issues = Issue::findByUser($targetUserId);

        $auth   = getAuthPayload();
        $userId = $auth ? (int) $auth['sub'] : 0;

        $issues = array_map(function ($issue) use ($userId) {
            $issue['user_vote'] = $userId > 0
                ? Vote::findUserVote((int)$issue['id'], $userId)
                : null;
            return $issue;
        }, $issues);

        sendSuccess(['issues' => $issues]);
    }

    // ── PATCH /api/issues/{id}/status ────────────────────────────────────────
    //
    // Rules:
    //   - Only the issue creator can change status
    //   - Status must be a valid ENUM value

    public static function updateStatus(int $id): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];
        $body   = self::jsonBody();

        // ── Validate issue exists ──
        $issue = Issue::findById($id);
        if (!$issue) sendError('Issue not found.', 404);

        // ── Only creator can update status ──
        if ((int) $issue['created_by'] !== $userId) {
            sendError('Only the issue creator can update the status.', 403);
        }

        // ── Validate status ──
        $status = $body['status'] ?? '';
        if (!in_array($status, self::VALID_STATUSES, true)) {
            sendError('Invalid status. Must be one of: ' . implode(', ', self::VALID_STATUSES));
        }

        Issue::updateStatus($id, $status);

        $updated = Issue::findById($id);
        $updated['user_vote'] = Vote::findUserVote($id, $userId);

        sendSuccess([
            'message' => 'Issue status updated successfully.',
            'issue'   => $updated,
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
