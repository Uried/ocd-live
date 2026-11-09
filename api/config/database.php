<?php
declare(strict_types=1);

/** Connexion PDO centralisée, utf8mb4, exceptions et vraies requêtes préparées. */

function db(array $app): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $db = $app['db'];
    if ($db['host'] === '' || $db['name'] === '' || $db['user'] === '') {
        throw new ApiException(503, 'Service momentanément indisponible.');
    }
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], (int) $db['port'], $db['name'], $db['charset']);
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
        PDO::ATTR_TIMEOUT => 5,
    ];
    if ($db['ssl_ca'] !== '' && defined('PDO::MYSQL_ATTR_SSL_CA')) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $db['ssl_ca'];
    }
    $pdo = new PDO($dsn, $db['user'], $db['pass'], $options);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}
