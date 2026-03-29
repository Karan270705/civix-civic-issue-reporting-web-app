<?php
// ─── User Model ───────────────────────────────────────────────────────────────
// All DB operations for the `users` table.
// No business logic — that lives in AuthController.

require_once __DIR__ . '/../config/db.php';

class User {

    // ── Create ────────────────────────────────────────────────────────────────

    public static function create(
        string $username,
        string $email,
        string $passwordHash
    ): int {
        $pdo  = getDB();
        $stmt = $pdo->prepare('
            INSERT INTO users (username, email, password, created_at)
            VALUES (:username, :email, :password, NOW())
        ');
        $stmt->execute([
            ':username' => $username,
            ':email'    => $email,
            ':password' => $passwordHash
        ]);
        return (int) $pdo->lastInsertId();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public static function findByEmail(string $email): ?array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $row  = $stmt->fetch();
        return $row ?: null;
    }

    public static function findByUsername(string $username): ?array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = :username LIMIT 1');
        $stmt->execute([':username' => $username]);
        $row  = $stmt->fetch();
        return $row ?: null;
    }

    public static function findById(int $id): ?array {
        $pdo  = getDB();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row  = $stmt->fetch();
        return $row ?: null;
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public static function updateProfile(int $id, array $fields): bool {
        if (empty($fields)) return false;

        $pdo     = getDB();
        $sets    = [];
        $params  = [':id' => $id];

        // Only allow safe, whitelisted columns to be updated
        $allowed = ['username', 'bio', 'profile_image'];
        foreach ($fields as $col => $val) {
            if (in_array($col, $allowed, true)) {
                $sets[]        = "$col = :$col";
                $params[":$col"] = $val;
            }
        }

        if (empty($sets)) return false;

        $sql  = 'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    /**
     * Strip the password field before returning user data to the client.
     * ALWAYS call this before sending user data in a response.
     */
    public static function sanitize(array $user): array {
        unset($user['password']);
        return $user;
    }
}
