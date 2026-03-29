<?php
// ─── Front Controller ─────────────────────────────────────────────────────────
// Entry point for ALL requests to civix-backend/api/
// .htaccess rewrites everything here.
//
// Responsibilities:
//   1. Set global response headers (JSON + CORS)
//   2. Handle OPTIONS preflight immediately
//   3. Delegate to the router

declare(strict_types=1);

// ── Response Headers ──────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');

// CORS — allow the Angular dev server and production host
$allowed = [
    'http://localhost:4200',    // Angular dev server
    'http://localhost',         // Direct browser testing
    'http://127.0.0.1:4200',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Fallback for local development — restrict in production
    header('Access-Control-Allow-Origin: http://localhost:4200');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400'); // Cache preflight for 24h

// ── Handle OPTIONS Preflight ──────────────────────────────────────────────────
// Angular sends this before every cross-origin request

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); // No Content
    exit;
}

// ── Route Request ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/routes/api.php';
