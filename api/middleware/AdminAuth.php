<?php
declare(strict_types=1);

final class AdminAuth
{
    public static function start(array $app): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        if ($app['cookie_secure'] && (($_SERVER['HTTPS'] ?? '') !== 'on') && (($_SERVER['SERVER_PORT'] ?? '') !== '443')) {
            throw new ApiException(503, 'Une connexion HTTPS est requise pour l’administration.');
        }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name('OCDADMIN');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/api', 'secure' => $app['cookie_secure'], 'httponly' => true, 'samesite' => 'Strict']);
        if (!session_start()) {
            throw new ApiException(503, 'Service momentanément indisponible.');
        }
        if (!isset($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
    }

    public static function csrf(array $app): void
    {
        self::start($app);
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
            throw new ApiException(403, 'Votre session doit être actualisée.');
        }
    }

    public static function allowed(array $row): bool
    {
        return (bool) ($row['is_active'] ?? false) && in_array($row['role'] ?? null, ['super_admin', 'admin'], true);
    }

    public static function requireAdmin(array $app): array
    {
        self::start($app);
        $now = time();
        if (!isset($_SESSION['admin_id'], $_SESSION['login_at'], $_SESSION['last_seen']) || $now - $_SESSION['last_seen'] > $app['session_idle'] || $now - $_SESSION['login_at'] > $app['session_max']) {
            unset($_SESSION['admin_id'], $_SESSION['login_at'], $_SESSION['last_seen']);
            throw new ApiException(401, 'Connexion administrateur requise.');
        }
        $stmt = db($app)->prepare('SELECT id, name, email, role, is_active FROM admin_users WHERE id = ?');
        $stmt->execute([$_SESSION['admin_id']]);
        $admin = $stmt->fetch();
        if (!$admin || !self::allowed($admin)) {
            unset($_SESSION['admin_id'], $_SESSION['login_at'], $_SESSION['last_seen']);
            throw new ApiException(403, 'Accès non autorisé.');
        }
        $_SESSION['last_seen'] = $now;
        return $admin;
    }
}
