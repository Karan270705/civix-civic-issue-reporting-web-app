<?php
// ─── API Router ───────────────────────────────────────────────────────────────
// Simple path-based router that works reliably under XAMPP/Apache with mod_rewrite.

require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../utils/response.php';

$method = $_SERVER['REQUEST_METHOD'];

// Get the raw URI path and strip query string
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalise slashes, strip the /civix-backend/api prefix robustly
// e.g. /civix-backend/api/auth/login  → /auth/login
$uri = preg_replace('#^/civix-backend/api#', '', $uri);
$uri = '/' . trim($uri, '/');

// ── Route table ────────────────────────────────────────────────────────────────
$routes = [
    ['POST',  '/auth/register', [AuthController::class, 'register']],
    ['POST',  '/auth/login',    [AuthController::class, 'login']],
    ['GET',   '/profile',       [AuthController::class, 'getProfile']],
    ['PUT',   '/profile',       [AuthController::class, 'updateProfile']],
    ['PATCH', '/profile',       [AuthController::class, 'updateProfile']],
];

foreach ($routes as [$routeMethod, $routePath, $action]) {
    if ($method === $routeMethod && $uri === $routePath) {
        [$class, $fn] = $action;
        $class::$fn();
        exit;
    }
}

if ($method === 'OPTIONS') { http_response_code(204); exit; }

sendError("Endpoint not found. [method=$method, path=$uri]", 404);
