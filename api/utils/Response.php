<?php
declare(strict_types=1);

/** Réponses JSON normalisées : { success, message, data|errors } + code HTTP. */

final class Response
{
    public static function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        exit;
    }

    public static function ok(array $data = [], string $message = 'Opération effectuée.', int $status = 200): void
    {
        self::json(['success' => true, 'message' => $message, 'data' => $data], $status);
    }

    public static function error(string $message, int $status = 400, array $errors = []): void
    {
        self::json(['success' => false, 'message' => $message, 'errors' => $errors], $status);
    }
}
