<?php
declare(strict_types=1);

/** Validation serveur des entrées : requis, longueurs, formats, enumérations. */

final class Validator
{
    public static function body(): array
    {
        if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
            throw new ApiException(415, 'Un contenu JSON est requis.');
        }
        $raw = file_get_contents('php://input', false, null, 0, 65537);
        if ($raw === false || strlen($raw) > 65536) {
            throw new ApiException(413, 'Requête trop volumineuse.');
        }
        try {
            $data = json_decode($raw, false, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException(400, 'Document JSON invalide.');
        }
        if (!$data instanceof stdClass) {
            throw new ApiException(400, 'Un objet JSON est requis.');
        }
        return json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    }

    public static function text(array $in, string $key, int $max, bool $required = false): ?string
    {
        $value = $in[$key] ?? null;
        if ($value === null && !$required) {
            return null;
        }
        if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
            throw new ApiException(422, 'Données invalides.', [$key => 'Texte attendu.']);
        }
        $value = trim($value);
        if (mb_strlen($value) > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $value) || ($required && $value === '')) {
            throw new ApiException(422, 'Données invalides.', [$key => 'Valeur absente, trop longue ou invalide.']);
        }
        return $value === '' ? null : $value;
    }

    public static function id(mixed $value): int
    {
        if ((!is_int($value) && !is_string($value)) || !preg_match('/^[1-9][0-9]{0,18}$/D', (string) $value) || filter_var($value, FILTER_VALIDATE_INT) === false) {
            throw new ApiException(422, 'Identifiant invalide.');
        }
        return (int) $value;
    }

    public static function mode(mixed $value): string
    {
        return match ($value) {
            'in-person', 'in_person' => 'in_person',
            'remote' => 'remote',
            default => throw new ApiException(422, 'Mode de participation invalide.'),
        };
    }

    public static function date(mixed $value): string
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) {
            throw new ApiException(422, 'Date invalide.');
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
        if (!$date || $date->format('Y-m-d') !== $value || $value < '1000-01-01') {
            throw new ApiException(422, 'Date invalide.');
        }
        return $value;
    }

    public static function time(mixed $value): string
    {
        if (!is_string($value) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $value)) {
            throw new ApiException(422, 'Heure invalide.');
        }
        return $value;
    }

    public static function email(array $in, string $key, bool $required = false): ?string
    {
        $value = self::text($in, $key, 190, $required);
        if ($value !== null && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException(422, 'Adresse e-mail invalide.', [$key => 'Adresse e-mail invalide.']);
        }
        return $value;
    }

    public static function phone(array $in, string $key, bool $required = false): ?string
    {
        $value = self::text($in, $key, 30, $required);
        if ($value === null) {
            return null;
        }
        if (!preg_match('/^\+?[0-9 ()-]+$/D', $value)) {
            throw new ApiException(422, 'Numéro de téléphone invalide.', [$key => 'Numéro invalide.']);
        }
        $value = preg_replace('/[ ()-]/', '', $value);
        if (!preg_match('/^\+?[0-9]{7,15}$/D', $value)) {
            throw new ApiException(422, 'Numéro de téléphone invalide.', [$key => 'Numéro invalide.']);
        }
        return $value;
    }

    public static function submission(array $in, bool $quote = false): array
    {
        if (self::text($in, 'website', 255) !== null) {
            throw new ApiException(422, 'Demande non acceptée.');
        }
        $out = [
            'first_name' => self::text($in, 'first_name', 100, true),
            'last_name' => self::text($in, 'last_name', 100, true),
            'phone' => self::phone($in, 'phone', true),
            'whatsapp' => self::phone($in, 'whatsapp'),
            'email' => self::email($in, 'email'),
            'mode' => self::mode($in['mode'] ?? null),
        ];
        $biz = $in['business'] ?? null;
        if (!is_array($biz) || array_is_list($biz)) {
            throw new ApiException(422, 'Informations de votre activité requises.');
        }
        $out['business'] = ['business_name' => self::text($biz, 'business_name', 190, true)];
        foreach (['activity_sector' => 120, 'country' => 100, 'city' => 100, 'address' => 255, 'description' => 10000, 'products_services' => 10000] as $key => $max) {
            $out['business'][$key] = self::text($biz, $key, $max);
        }
        foreach (['social_facebook', 'social_instagram', 'social_tiktok', 'social_website'] as $key) {
            $url = self::text($biz, $key, 255);
            if ($url !== null && (!filter_var($url, FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($url, PHP_URL_SCHEME) ?: ''), ['http', 'https'], true))) {
                throw new ApiException(422, 'Lien de réseau social invalide.', [$key => 'URL HTTP ou HTTPS attendue.']);
            }
            $out['business'][$key] = $url;
        }
        if ($quote) {
            $out['desired_date'] = isset($in['desired_date']) ? self::date($in['desired_date']) : null;
            $out['desired_time'] = isset($in['desired_time']) ? self::time($in['desired_time']) : null;
            if ($out['desired_time'] !== null && $out['desired_date'] === null) {
                throw new ApiException(422, 'La date souhaitée est requise avec une heure.');
            }
            $out['message'] = self::text($in, 'message', 10000);
        } else {
            $out['package_id'] = self::id($in['package_id'] ?? null);
            $out['date'] = self::date($in['date'] ?? null);
            $out['time'] = self::time($in['time'] ?? null);
            $out['customer_notes'] = self::text($in, 'customer_notes', 10000);
            $out['connection_location'] = self::text($in, 'connection_location', 255);
            $out['equipment_notes'] = self::text($in, 'equipment_notes', 10000);
        }
        return $out;
    }
}
