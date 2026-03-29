<?php
// ─── API Router ───────────────────────────────────────────────────────────────
// Path-based router for XAMPP/Apache with mod_rewrite.
//
// Route patterns:
//   Static:   /auth/login              → exact match
//   Dynamic:  /issues/{id}             → regex capture
//   Nested:   /issues/{id}/solutions   → regex with static suffix

require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/IssueController.php';
require_once __DIR__ . '/../controllers/VoteController.php';
require_once __DIR__ . '/../controllers/SolutionController.php';
require_once __DIR__ . '/../controllers/CommentController.php';
require_once __DIR__ . '/../controllers/UserController.php';
require_once __DIR__ . '/../utils/response.php';

$method = $_SERVER['REQUEST_METHOD'];

// Get the raw URI path and strip query string
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalise slashes, strip the /civix-backend/api prefix robustly
$uri = preg_replace('#^/civix-backend/api#', '', $uri);
$uri = '/' . trim($uri, '/');

// ── Static route table ─────────────────────────────────────────────────────────
$staticRoutes = [
    // ── Auth ──
    ['POST',  '/auth/register',  [AuthController::class,  'register']],
    ['POST',  '/auth/login',     [AuthController::class,  'login']],

    // ── Profile (self) ──
    ['GET',   '/profile',        [AuthController::class,  'getProfile']],
    ['PUT',   '/profile',        [AuthController::class,  'updateProfile']],
    ['PATCH', '/profile',        [AuthController::class,  'updateProfile']],

    // ── Issues (collection) ──
    ['POST',  '/issues',         [IssueController::class, 'create']],
    ['GET',   '/issues',         [IssueController::class, 'getAll']],
];

foreach ($staticRoutes as [$routeMethod, $routePath, $action]) {
    if ($method === $routeMethod && $uri === $routePath) {
        [$class, $fn] = $action;
        $class::$fn();
        exit;
    }
}

// ── Dynamic route table (with parameters) ───────────────────────────────────
// Each entry: [method, regex, handler]
// Captured groups are passed as int arguments to the handler.
$dynamicRoutes = [
    // ── Issues (single) ──
    ['GET',   '#^/issues/(\d+)$#',             [IssueController::class,    'getOne']],
    ['GET',   '#^/issues/user/(\d+)$#',        [IssueController::class,    'getByUser']],
    ['PATCH', '#^/issues/(\d+)/status$#',      [IssueController::class,    'updateStatus']],

    // ── Issue Voting ──
    ['POST',  '#^/issues/(\d+)/vote$#',        [VoteController::class,     'vote']],

    // ── Solutions ──
    ['POST',  '#^/issues/(\d+)/solutions$#',   [SolutionController::class, 'create']],
    ['GET',   '#^/issues/(\d+)/solutions$#',   [SolutionController::class, 'getByIssue']],
    ['GET',   '#^/solutions/user/(\d+)$#',     [SolutionController::class, 'getByUser']],
    ['POST',  '#^/solutions/(\d+)/vote$#',     [SolutionController::class, 'vote']],
    ['POST',  '#^/solutions/(\d+)/accept$#',   [SolutionController::class, 'accept']],

    // ── Comments ──
    ['POST',  '#^/issues/(\d+)/comments$#',    [CommentController::class,  'create']],
    ['GET',   '#^/issues/(\d+)/comments$#',    [CommentController::class,  'getByIssue']],

    // ── Users (public profiles + stats) ──
    ['GET',   '#^/users/(\d+)$#',              [UserController::class,     'getPublicProfile']],
    ['GET',   '#^/users/(\d+)/stats$#',        [UserController::class,     'getStats']],
];

foreach ($dynamicRoutes as [$routeMethod, $pattern, $action]) {
    if ($method === $routeMethod && preg_match($pattern, $uri, $matches)) {
        [$class, $fn] = $action;
        $params = array_map('intval', array_slice($matches, 1));
        $class::$fn(...$params);
        exit;
    }
}

// ── Fallback ────────────────────────────────────────────────────────────────
if ($method === 'OPTIONS') { http_response_code(204); exit; }

sendError("Endpoint not found. [method=$method, path=$uri]", 404);
