<?php
declare(strict_types=1);

/** Limitation simple par IP dans storage/rate-limit (compteurs fichier). */

final class RateLimitMiddleware
{
    public static function check(string $scope, int $max, int $windowSeconds, ?string $directory = null, ?string $clientIp = null): void
    {
        $dir = $directory ?? dirname(__DIR__) . '/storage/rate-limit';
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
            throw new ApiException(503, 'Service momentanément indisponible.');
        }
        $key = hash('sha256', $scope . ':' . ($clientIp ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        $handle = fopen($dir . '/' . $key . '.json', 'c+');
        if ($handle === false) {
            throw new ApiException(503, 'Service momentanément indisponible.');
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                throw new ApiException(503, 'Service momentanément indisponible.');
            }
            $raw = stream_get_contents($handle);
            $hits = $raw === '' ? [] : json_decode($raw ?: '', true);
            if (!is_array($hits)) {
                throw new ApiException(503, 'Service momentanément indisponible.');
            }
            $now = time();
            $hits = array_values(array_filter($hits, static fn ($t): bool => is_int($t) && $t > $now - $windowSeconds));
            if (count($hits) >= $max) {
                header('Retry-After: ' . max(1, $windowSeconds - ($now - min($hits))));
                throw new ApiException(429, 'Trop de requêtes. Réessayez dans quelques instants.');
            }
            $hits[] = $now;
            $encoded = json_encode($hits, JSON_THROW_ON_ERROR);
            rewind($handle);
            if (!ftruncate($handle, 0) || fwrite($handle, $encoded) !== strlen($encoded) || !fflush($handle)) {
                throw new ApiException(503, 'Service momentanément indisponible.');
            }
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
