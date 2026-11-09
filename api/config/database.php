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
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $db['host'], $db['port'], $db['name'], $db['charset']);
    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}
