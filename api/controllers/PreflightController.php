<?php
declare(strict_types=1);

/**
 * Diagnostic en lecture seule, réservé à une API de contrôle (APP_ROLE=control) et protégé par jeton.
 * Sur toute autre configuration, la route se comporte comme une route inconnue.
 */
final class PreflightController
{
    private const TABLES = ['activity_logs', 'admin_users', 'availability_exceptions', 'availability_rules', 'booking_participants', 'booking_sessions', 'booking_status_history', 'bookings', 'businesses', 'customer_consents', 'customers', 'notification_logs', 'packages', 'payments', 'platform_settings', 'quote_requests'];

    public static function index(array $app): void
    {
        $token = $_SERVER['HTTP_X_PREFLIGHT_TOKEN'] ?? '';
        if ($app['role'] !== 'control' || strlen($app['preflight_token']) < 32 || !is_string($token) || !hash_equals($app['preflight_token'], $token)) {
            throw new ApiException(404, 'Route inconnue.');
        }
        $checks = [
            'php_version' => PHP_VERSION,
            'php_ok' => PHP_VERSION_ID >= 80200,
            'extensions' => array_map(static fn (string $e): bool => extension_loaded($e), ['pdo_mysql' => 'pdo_mysql', 'mbstring' => 'mbstring', 'json' => 'json']),
            'functions' => array_map(static fn (string $f): bool => function_exists($f), ['random_bytes' => 'random_bytes', 'hash_hmac' => 'hash_hmac', 'password_verify' => 'password_verify', 'flock' => 'flock', 'session_start' => 'session_start', 'ini_set' => 'ini_set']),
            'https' => (($_SERVER['HTTPS'] ?? '') === 'on') || (($_SERVER['SERVER_PORT'] ?? '') === '443'),
            'cookie_secure' => $app['cookie_secure'],
            'client_ip' => ['masked' => ClientIp::masked(ClientIp::get($app)), 'header_configured' => $app['client_ip_header'] !== ''],
            'writable' => ['logs' => self::writable(dirname(__DIR__) . '/storage/logs'), 'rate_limit' => self::writable($app['rate_limit_dir']), 'session_path' => is_writable(session_save_path() ?: sys_get_temp_dir())],
            'app_key_ok' => strlen($app['app_key']) >= 32,
            'role' => $app['role'],
        ];
        $db = db($app);
        $name = (string) $db->query('SELECT DATABASE()')->fetchColumn();
        $lock = 'ocd-preflight:' . bin2hex(random_bytes(8));
        $stmt = $db->prepare('SELECT GET_LOCK(?, 1)');
        $stmt->execute([$lock]);
        $got = (int) $stmt->fetchColumn() === 1;
        $stmt = $db->prepare('SELECT RELEASE_LOCK(?)');
        $stmt->execute([$lock]);
        $released = (int) $stmt->fetchColumn() === 1;
        $present = $db->query('SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchAll(PDO::FETCH_COLUMN);
        $marker = $db->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ?');
        $marker->execute(['environment_marker']);
        $rules = $db->query('SELECT mode, COUNT(*) AS total FROM availability_rules WHERE is_active = 1 GROUP BY mode')->fetchAll();
        $checks['database'] = [
            'name' => $name,
            'matches_control_name' => $app['control_db_name'] !== '' && hash_equals($app['control_db_name'], $name),
            'version' => (string) $db->query('SELECT VERSION()')->fetchColumn(),
            'named_lock_roundtrip' => $got && $released,
            'tables_missing' => array_values(array_diff(self::TABLES, $present)),
            'environment_marker' => $marker->fetchColumn() === 'control',
            'active_packages' => (int) $db->query('SELECT COUNT(*) FROM packages WHERE is_active = 1')->fetchColumn(),
            'active_rules' => array_column($rules, 'total', 'mode'),
        ];
        Response::ok($checks, 'Diagnostic effectué.');
    }

    private static function writable(string $dir): bool
    {
        return (is_dir($dir) || @mkdir($dir, 0700, true)) && is_writable($dir);
    }
}
