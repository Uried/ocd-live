<?php
declare(strict_types=1);

/**
 * Modèle : copier ce fichier en config/secrets.php directement sur le serveur, jamais dans Git.
 * Un appel HTTP direct ne renvoie rien. Si l'hébergeur propose de vraies variables d'environnement,
 * les préférer et ne pas créer ce fichier.
 */
if (!defined('OCD_CONFIG_LOADING')) {
    http_response_code(404);
    exit;
}

return [
    'APP_ENV' => 'production',
    'APP_ROLE' => 'production',
    'APP_KEY' => '',
    'CORS_ORIGIN' => '',
    'DB_HOST' => '',
    'DB_PORT' => '3306',
    'DB_NAME' => '',
    'DB_USER' => '',
    'DB_PASS' => '',
];
