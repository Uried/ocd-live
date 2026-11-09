<?php
declare(strict_types=1);

final class AuthController
{
    public static function session(array $app): void
    {
        AdminAuth::start($app);
        $admin = isset($_SESSION['admin_id']) ? AdminAuth::requireAdmin($app) : null;
        Response::ok(['admin' => $admin, 'csrf_token' => $_SESSION['csrf']]);
    }

    public static function login(array $app): void
    {
        AdminAuth::csrf($app);
        $in = Validator::body();
        $email = Validator::email($in, 'email', true);
        $password = $in['password'] ?? null;
        if (!is_string($password) || $password === '' || strlen($password) > 1024) {
            throw new ApiException(422, 'Identifiants invalides.');
        }
        $stmt = db($app)->prepare('SELECT id, name, email, password_hash, role, is_active FROM admin_users WHERE email = ?');
        $stmt->execute([$email]);
        $admin = $stmt->fetch();
        $valid = password_verify($password, $admin['password_hash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if (!$valid || !$admin || !AdminAuth::allowed($admin)) {
            throw new ApiException(401, 'Identifiants invalides.');
        }
        if (!session_regenerate_id(true)) {
            throw new ApiException(503, 'Service momentanément indisponible.');
        }
        $stmt = db($app)->prepare('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?');
        $stmt->execute([$admin['id']]);
        $_SESSION = ['admin_id' => (int) $admin['id'], 'login_at' => time(), 'last_seen' => time(), 'csrf' => bin2hex(random_bytes(32))];
        unset($admin['password_hash']);
        Response::ok(['admin' => $admin, 'csrf_token' => $_SESSION['csrf']]);
    }

    public static function logout(array $app): void
    {
        AdminAuth::csrf($app);
        $_SESSION = [];
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/api', 'secure' => $app['cookie_secure'], 'httponly' => true, 'samesite' => 'Strict']);
        session_destroy();
        Response::ok([], 'Déconnexion effectuée.');
    }
}
