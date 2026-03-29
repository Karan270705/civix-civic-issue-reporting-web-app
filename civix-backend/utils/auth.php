<?php
// ─── JWT-like Token Utility ───────────────────────────────────────────────────
// Uses HMAC-SHA256 for signature — lightweight, no library needed.
// The Angular frontend stores the token in localStorage as 'civix_token'
// and will send it back as: Authorization: Bearer <token>
//
// Token format: base64url(header).base64url(payload).base64url(signature)

define('JWT_SECRET', 'civix_super_secret_key_change_in_production');
define('JWT_EXPIRY',  86400);   // 24 hours in seconds

// ── Encode ────────────────────────────────────────────────────────────────────

function generateToken(array $payload): string {
    $header    = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRY;
    $payloadEnc = base64url_encode(json_encode($payload));
    $signature  = base64url_encode(
        hash_hmac('sha256', "$header.$payloadEnc", JWT_SECRET, true)
    );
    return "$header.$payloadEnc.$signature";
}

// ── Decode & Validate ─────────────────────────────────────────────────────────

function verifyToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payloadEnc, $signature] = $parts;

    // Recompute signature
    $expected = base64url_encode(
        hash_hmac('sha256', "$header.$payloadEnc", JWT_SECRET, true)
    );

    // Timing-safe comparison
    if (!hash_equals($expected, $signature)) return null;

    $payload = json_decode(base64url_decode($payloadEnc), true);
    if (!$payload) return null;

    // Check expiry
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;

    return $payload;
}

// ── Extract from request ──────────────────────────────────────────────────────

function getAuthPayload(): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($header, 'Bearer ')) {
        $token = substr($header, 7);
        return verifyToken($token);
    }
    return null;
}

function requireAuth(): array {
    $payload = getAuthPayload();
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
        exit;
    }
    return $payload;
}

// ── Base64url helpers ─────────────────────────────────────────────────────────

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}
