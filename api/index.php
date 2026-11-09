<?php
declare(strict_types=1);

/**
 * OCD Live API — point d'entrée unique.
 * En production : les erreurs PHP sont journalisées dans storage/logs, jamais affichées.
 */

spl_autoload_register(static function (string $class): void {
    if (!preg_match('/^[A-Za-z][A-Za-z0-9_]*$/D', $class)) {
        return;
    }
    foreach (['utils', 'services', 'middleware', 'controllers'] as $dir) {
        $file = __DIR__ . '/' . $dir . '/' . $class . '.php';
        if (is_file($file)) {
            require_once $file;
            return;
        }
    }
});

try {
    $app = require __DIR__ . '/config/app.php';
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    CorsMiddleware::handle($app['cors_origin']);
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    $routes = require __DIR__ . '/routes/api.php';
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    $path = rtrim((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    $path = preg_replace('#^/api(?:/|$)#', '', $path) ?? '';
    $methods = [];
    foreach ($routes as [$routeMethod, $pattern, $handler]) {
        if (!preg_match($pattern, $path, $matches)) {
            continue;
        }
        $methods[] = $routeMethod;
        if ($method === $routeMethod) {
            $handler($matches);
            exit;
        }
    }
    if ($methods !== []) {
        header('Allow: ' . implode(', ', array_unique($methods)));
        throw new ApiException(405, 'Méthode non autorisée.');
    }
    throw new ApiException(404, 'Route inconnue.');
} catch (ApiException $error) {
    Response::error($error->getMessage(), $error->status, $error->errors);
} catch (Throwable $error) {
    Logger::error('Erreur non gérée', ['type' => get_class($error)]);
    Response::error('Une erreur est survenue.', 500);
}
