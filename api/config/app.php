<?php
declare(strict_types=1);

/**
 * Configuration applicative portable. Aucun identifiant dans le code : environnement du serveur,
 * config/secrets.php (voir config/secrets.example.php) ou, en développement local, .env.
 */

$settings = Config::values(dirname(__DIR__));
$get = static fn (string $key, string $fallback = ''): string => $settings[$key] ?? $fallback;
$limit = static fn (string $key, int $default): int => max(1, min(10000, (int) ($settings[$key] ?? $default)));
foreach ([['display_errors', '0'], ['log_errors', '1']] as [$name, $value]) {
    if (function_exists('ini_set')) {
        @ini_set($name, $value);
    }
}
error_reporting(E_ALL);

return [
    'env' => $get('APP_ENV', 'production'),
    'role' => $get('APP_ROLE', 'production') === 'control' ? 'control' : 'production',
    'app_key' => $get('APP_KEY'),
    'cors_origin' => $get('CORS_ORIGIN'),
    'cookie_secure' => $get('APP_ENV', 'production') !== 'local' || $get('SESSION_COOKIE_SECURE', '1') === '1',
    'cookie_path' => $get('SESSION_COOKIE_PATH', '/api'),
    'rate_limit_dir' => $get('RATE_LIMIT_DIRECTORY', dirname(__DIR__) . '/storage/rate-limit'),
    'client_ip_header' => $get('CLIENT_IP_HEADER'),
    'control_db_name' => $get('CONTROL_DB_NAME'),
    'preflight_token' => $get('PREFLIGHT_TOKEN'),
    'session_idle' => 1800,
    'session_max' => 28800,
    'rate_limit' => [
        'bookings' => ['max' => $limit('RATE_LIMIT_BOOKINGS', 5), 'window' => 300],
        'quotes' => ['max' => $limit('RATE_LIMIT_QUOTES', 5), 'window' => 300],
        'login' => ['max' => $limit('RATE_LIMIT_LOGIN', 5), 'window' => 300],
    ],
    'db' => [
        'host' => $get('DB_HOST'),
        'port' => $get('DB_PORT', '3306'),
        'name' => $get('DB_NAME'),
        'user' => $get('DB_USER'),
        'pass' => $get('DB_PASS'),
        'ssl_ca' => $get('DB_SSL_CA'),
        'charset' => 'utf8mb4',
    ],
];
