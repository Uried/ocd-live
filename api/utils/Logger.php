<?php
declare(strict_types=1);

/**
 * Journalisation serveur dans storage/logs, jamais dans la réponse publique.
 * Le fichier est un script PHP qui s'interrompt immédiatement : même sans règle serveur, il n'est pas lisible.
 */
final class Logger
{
    public static function error(string $message, array $context = []): void
    {
        $dir = dirname(__DIR__) . '/storage/logs';
        if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
            return;
        }
        $file = $dir . '/app.log.php';
        $line = json_encode(['time' => date('c'), 'level' => 'error', 'message' => $message, 'context' => $context], JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
        $header = is_file($file) && filesize($file) > 0 ? '' : "<?php http_response_code(404); exit; ?>\n";
        @file_put_contents($file, $header . $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
