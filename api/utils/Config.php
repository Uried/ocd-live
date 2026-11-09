<?php
declare(strict_types=1);

/**
 * Résolution portable des réglages : variables d'environnement, puis config/secrets.php
 * (fichier PHP qui ne divulgue rien s'il est appelé directement), puis .env en dernier recours.
 */
final class Config
{
    public static function values(string $apiDir, ?array $env = null, ?string $documentRoot = null): array
    {
        $env ??= array_merge($_ENV, getenv());
        $documentRoot ??= (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
        $values = [];
        $secrets = $apiDir . '/config/secrets.php';
        if (is_file($secrets)) {
            $loaded = (static function (string $file): mixed {
                defined('OCD_CONFIG_LOADING') || define('OCD_CONFIG_LOADING', true);
                return require $file;
            })($secrets);
            foreach (is_array($loaded) ? $loaded : [] as $key => $value) {
                if (is_string($key) && self::known($key) && (is_scalar($value) || $value === null)) {
                    $values[$key] = (string) $value;
                }
            }
        }
        $dotenv = $apiDir . '/.env';
        if (is_file($dotenv) && self::dotenvAllowed($dotenv, $env, $values, $documentRoot)) {
            foreach ((array) file($dotenv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
                    continue;
                }
                [$key, $value] = array_map('trim', explode('=', $line, 2));
                self::known($key) && $values += [$key => trim($value, " \t\n\r\0\x0B\"'")];
            }
        }
        foreach ($env as $key => $value) {
            if (is_string($key) && is_scalar($value) && self::known($key)) {
                $values[$key] = (string) $value;
            }
        }
        return $values;
    }

    public static function known(string $key): bool
    {
        return in_array($key, ['APP_ENV', 'APP_ROLE', 'APP_KEY', 'CORS_ORIGIN', 'SESSION_COOKIE_SECURE', 'SESSION_COOKIE_PATH', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_SSL_CA', 'CONTROL_DB_NAME', 'PREFLIGHT_TOKEN', 'RATE_LIMIT_DIRECTORY', 'RATE_LIMIT_BOOKINGS', 'RATE_LIMIT_QUOTES', 'RATE_LIMIT_LOGIN', 'CLIENT_IP_HEADER'], true);
    }

    private static function dotenvAllowed(string $file, array $env, array $values, string $documentRoot): bool
    {
        $mode = $env['APP_ENV'] ?? $values['APP_ENV'] ?? 'production';
        if ($mode === 'local') {
            return true;
        }
        $path = str_replace('\\', '/', (string) realpath($file));
        $root = str_replace('\\', '/', (string) realpath($documentRoot));
        return $root === '' || !str_starts_with(strtolower($path), strtolower(rtrim($root, '/') . '/'));
    }
}
