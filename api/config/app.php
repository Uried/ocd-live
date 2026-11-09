<?php
declare(strict_types=1);

/**
 * Charge .env puis expose la configuration applicative.
 * Aucun identifiant dans le code : tout vient de l'environnement.
 */

$envFile = dirname(__DIR__) . '/.env';
if (is_file($envFile)) {
    foreach ((array) file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if (getenv($key) === false) {
            $_ENV[$key] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }
}
$env = static fn (string $key, string $fallback = ''): string => getenv($key) !== false ? (string) getenv($key) : (string) ($_ENV[$key] ?? $fallback);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

return [
    'env' => $env('APP_ENV', 'production'),
    'app_key' => $env('APP_KEY'),
    'cors_origin' => $env('CORS_ORIGIN'),
    'cookie_secure' => $env('APP_ENV', 'production') !== 'local' || $env('SESSION_COOKIE_SECURE', '1') === '1',
    'rate_limit_dir' => $env('RATE_LIMIT_DIRECTORY', dirname(__DIR__) . '/storage/rate-limit'),
    'session_idle' => 1800,
    'session_max' => 28800,
    'rate_limit' => [
        'bookings' => ['max' => 5, 'window' => 300],
        'quotes' => ['max' => 5, 'window' => 300],
        'login' => ['max' => 5, 'window' => 300],
    ],
    'db' => [
        'host' => $env('DB_HOST'),
        'port' => $env('DB_PORT', '3306'),
        'name' => $env('DB_NAME'),
        'user' => $env('DB_USER'),
        'pass' => $env('DB_PASS'),
        'charset' => 'utf8mb4',
    ],
];
