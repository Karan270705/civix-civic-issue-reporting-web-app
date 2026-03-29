<?php
// ─── Auth Controller ──────────────────────────────────────────────────────────
// All business logic for auth + profile endpoints.
// Controllers read the request, validate, call the model, return via helpers.

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth.php';

class AuthController {

    // ── POST /api/auth/register ───────────────────────────────────────────────

    public static function register(): void {
        $body = self::jsonBody();

        // ── Validation ──
        $username = trim($body['username'] ?? '');
        $email    = trim($body['email']    ?? '');
        $password =      $body['password'] ?? '';

        if (!$username)                          sendError('Username is required.');
        if (strlen($username) < 3)               sendError('Username must be at least 3 characters.');
        if (strlen($username) > 30)              sendError('Username cannot exceed 30 characters.');
        if (!preg_match('/^\w+$/', $username))   sendError('Username can only contain letters, numbers, and underscores.');
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) sendError('A valid email address is required.');
        if (!$password)                          sendError('Password is required.');
        if (strlen($password) < 6)               sendError('Password must be at least 6 characters.');

        // ── Uniqueness checks ──
        if (User::findByEmail($email))           sendError('An account with this email already exists.', 409);
        if (User::findByUsername($username))     sendError('This username is taken. Try another.', 409);

        // ── Create user ──
        $hash   = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $userId = User::create($username, $email, $hash);
        $user   = User::sanitize(User::findById($userId));
        $token  = generateToken(['sub' => $userId, 'username' => $username]);

        sendCreated([
            'message' => 'Account created successfully.',
            'token'   => $token,
            'user'    => $user
        ]);
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────────

    public static function login(): void {
        $body = self::jsonBody();

        $email    = trim($body['email']    ?? '');
        $password =      $body['password'] ?? '';

        if (!$email || !$password) sendError('Email and password are required.');

        // ── Find user ──
        $row = User::findByEmail($email);
        if (!$row) {
            // Identical message for email/password mismatch — prevents user enumeration
            sendError('Invalid email or password.', 401);
        }

        // ── Verify password ──
        if (!password_verify($password, $row['password'])) {
            sendError('Invalid email or password.', 401);
        }

        $user  = User::sanitize($row);
        $token = generateToken(['sub' => $row['id'], 'username' => $row['username']]);

        sendSuccess([
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => $user
        ]);
    }

    // ── GET /api/profile ──────────────────────────────────────────────────────

    public static function getProfile(): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];

        $user = User::findById($userId);
        if (!$user) sendError('User not found.', 404);

        sendSuccess(['user' => User::sanitize($user)]);
    }

    // ── PUT /api/profile ──────────────────────────────────────────────────────

    public static function updateProfile(): void {
        $auth   = requireAuth();
        $userId = (int) $auth['sub'];
        $body   = self::jsonBody();

        $fields = [];

        // Username (optional)
        if (isset($body['username'])) {
            $username = trim($body['username']);
            if (strlen($username) < 3)             sendError('Username must be at least 3 characters.');
            if (!preg_match('/^\w+$/', $username))  sendError('Username can only contain letters, numbers, and underscores.');
            // Check uniqueness — exclude self
            $existing = User::findByUsername($username);
            if ($existing && (int)$existing['id'] !== $userId) {
                sendError('This username is already taken.', 409);
            }
            $fields['username'] = $username;
        }

        // Bio (optional, max 500 chars)
        if (isset($body['bio'])) {
            $bio = trim($body['bio']);
            if (strlen($bio) > 500) sendError('Bio cannot exceed 500 characters.');
            $fields['bio'] = $bio;
        }

        // Profile image URL (optional)
        if (isset($body['profile_image'])) {
            $img = trim($body['profile_image']);
            // Allow empty string to clear avatar, or validate URL format
            if ($img !== '' && !filter_var($img, FILTER_VALIDATE_URL)) {
                sendError('Profile image must be a valid URL.');
            }
            $fields['profile_image'] = $img ?: null;
        }

        if (empty($fields)) sendError('No valid fields provided to update.');

        User::updateProfile($userId, $fields);

        $user = User::sanitize(User::findById($userId));
        sendSuccess(['message' => 'Profile updated successfully.', 'user' => $user]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static function jsonBody(): array {
        $raw  = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) return [];
        return $body;
    }
}
