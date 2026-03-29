<?php
// ─── Response Helper ──────────────────────────────────────────────────────────
// Ensures every API response is JSON with a consistent shape:
//   Success: { "success": true,  "data": {...} }
//   Error:   { "success": false, "message": "..." }

function sendSuccess(mixed $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function sendError(string $message, int $status = 400): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function sendCreated(mixed $data): void {
    sendSuccess($data, 201);
}
