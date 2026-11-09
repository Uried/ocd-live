<?php
declare(strict_types=1);

/** Journalisation serveur dans storage/logs — jamais dans la réponse publique. */

final class Logger
{
    public static function error(string $message, array $context = []): void
    {
        $dir = dirname(__DIR__) . '/storage/logs';
        is_dir($dir) || mkdir($dir, 0750, true);
        $line = json_encode(['time' => date('c'), 'level' => 'error', 'message' => $message, 'context' => $context], JSON_UNESCAPED_UNICODE);
        @file_put_contents($dir . '/app.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
