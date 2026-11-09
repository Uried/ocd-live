<?php
declare(strict_types=1);

/** CORS restreint à l'origine frontend configurée (CORS_ORIGIN). */

final class CorsMiddleware
{
    public static function handle(string $allowedOrigin): void
    {
        header('Vary: Origin');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && ($allowedOrigin === '' || !hash_equals($allowedOrigin, $origin))) {
            throw new ApiException(403, 'Origine non autorisée.');
        }
        if ($origin !== '' && $origin === $allowedOrigin) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Accept, Idempotency-Key, X-CSRF-Token');
            header('Access-Control-Max-Age: 600');
        }
    }
}
