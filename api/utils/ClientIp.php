<?php
declare(strict_types=1);

final class ClientIp
{
    public static function get(array $app): string
    {
        $header = $app['client_ip_header'] ?? '';
        if ($header !== '' && preg_match('/^[A-Z0-9_]+$/D', $header)) {
            $candidate = trim(explode(',', (string) ($_SERVER[$header] ?? ''))[0]);
            if (filter_var($candidate, FILTER_VALIDATE_IP) !== false) {
                return $candidate;
            }
        }
        return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }

    public static function masked(string $ip): string
    {
        if (str_contains($ip, ':')) {
            return implode(':', array_slice(explode(':', $ip), 0, 3)) . ':…';
        }
        $parts = explode('.', $ip);
        return count($parts) === 4 ? $parts[0] . '.' . $parts[1] . '.x.x' : 'unknown';
    }
}
