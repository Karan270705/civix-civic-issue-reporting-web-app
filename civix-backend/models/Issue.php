<?php
// ─── Issue Model ──────────────────────────────────────────────────────────────
// All DB operations for the `issues` table.
// No business logic — that lives in IssueController.

require_once __DIR__ . '/../config/db.php';

class Issue {

    // ── Create ────────────────────────────────────────────────────────────────

    public static function create(array $data): int {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            INSERT INTO issues (title, description, image_url, location, lat, lng, category, status, created_by, created_at)
            VALUES (:title, :description, :image_url, :location, :lat, :lng, :category, :status, :created_by, NOW())
        ');
        $stmt->execute([
            ':title'       => $data['title'],
            ':description' => $data['description'],
            ':image_url'   => $data['image_url'] ?? null,
            ':location'    => $data['location'],
            ':lat'         => $data['lat'] ?? null,
            ':lng'         => $data['lng'] ?? null,
            ':category'    => $data['category'],
            ':status'      => 'reported',
            ':created_by'  => $data['created_by'],
        ]);
        return (int) $pdo->lastInsertId();
    }

    // ── Read All ──────────────────────────────────────────────────────────────

    /**
     * Fetch all issues, newest first.
     * Joins with users table to include the creator's username.
     */
    public static function getAll(): array {
        $pdo  = getDB();
        $stmt = $pdo->query('
            SELECT
                i.id,
                i.title,
                i.description,
                i.image_url,
                i.location,
                i.lat,
                i.lng,
                i.category,
                i.status,
                i.vote_count,
                i.created_by,
                i.created_at,
                u.username
            FROM issues i
            JOIN users u ON u.id = i.created_by
            ORDER BY i.created_at DESC
        ');
        return $stmt->fetchAll();
    }

    // ── Read One ──────────────────────────────────────────────────────────────

    /**
     * Fetch a single issue by ID, including creator's username.
     */
    public static function findById(int $id): ?array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT
                i.id,
                i.title,
                i.description,
                i.image_url,
                i.location,
                i.lat,
                i.lng,
                i.category,
                i.status,
                i.vote_count,
                i.created_by,
                i.created_at,
                u.username
            FROM issues i
            JOIN users u ON u.id = i.created_by
            WHERE i.id = :id
            LIMIT 1
        ');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // ── Read by User ─────────────────────────────────────────────────────────

    /**
     * Fetch all issues created by a specific user.
     */
    public static function findByUser(int $userId): array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            SELECT
                i.id,
                i.title,
                i.description,
                i.image_url,
                i.location,
                i.lat,
                i.lng,
                i.category,
                i.status,
                i.vote_count,
                i.created_by,
                i.created_at,
                u.username
            FROM issues i
            JOIN users u ON u.id = i.created_by
            WHERE i.created_by = :user_id
            ORDER BY i.created_at DESC
        ');
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    // ── Update Status ────────────────────────────────────────────────────────

    /**
     * Update the status of an issue (used when votes reach threshold, or manual).
     */
    public static function updateStatus(int $id, string $status): bool {
        $pdo  = getDB();
        $stmt = $pdo->prepare('UPDATE issues SET status = :status WHERE id = :id');
        $stmt->execute([':status' => $status, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
