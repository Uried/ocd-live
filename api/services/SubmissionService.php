<?php
declare(strict_types=1);

final class SubmissionService
{
    public static function identity(array $app, string $scope, string $key, array $input): array
    {
        if (strlen($app['app_key']) < 32) {
            throw new ApiException(503, 'Service momentanément indisponible.');
        }
        if (!preg_match('/^[A-Za-z0-9_-]{16,128}$/D', $key)) {
            throw new ApiException(422, 'Une clé de soumission unique est requise dans Idempotency-Key.');
        }
        $reference = ($scope === 'booking' ? 'OCD-' : 'DEV-') . strtoupper(substr(hash_hmac('sha256', $scope . ':' . $key, $app['app_key']), 0, 32));
        $fingerprint = hash_hmac('sha256', json_encode($input, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $app['app_key']);
        return [$reference, $fingerprint];
    }

    public static function replay(PDO $db, string $type, string $reference, string $fingerprint): ?array
    {
        $table = $type === 'booking' ? 'bookings' : 'quote_requests';
        $stmt = $db->prepare("SELECT id, reference, status FROM {$table} WHERE reference = ?");
        $stmt->execute([$reference]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $stmt = $db->prepare("SELECT description FROM activity_logs WHERE entity_type = ? AND entity_id = ? AND action = 'submission.created' ORDER BY id DESC LIMIT 1");
        $stmt->execute([$type, $row['id']]);
        $metadata = json_decode((string) $stmt->fetchColumn(), true);
        if (!is_array($metadata) || !is_string($metadata['fingerprint'] ?? null) || !hash_equals($metadata['fingerprint'], $fingerprint)) {
            throw new ApiException(409, 'Cette clé de soumission a déjà été utilisée avec des informations différentes.');
        }
        return ['reference' => $row['reference'], 'status' => $row['status'], 'replayed' => true];
    }

    public static function audit(PDO $db, string $type, int $id, array $metadata, string $action = 'submission.created', ?int $adminId = null): void
    {
        $stmt = $db->prepare('INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$adminId, $action, $type, $id, json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
    }

    public static function customerBusiness(PDO $db, array $in): array
    {
        $stmt = $db->prepare('INSERT INTO customers (first_name, last_name, phone, whatsapp, email) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$in['first_name'], $in['last_name'], $in['phone'], $in['whatsapp'], $in['email']]);
        $customer = (int) $db->lastInsertId();
        $b = $in['business'];
        $stmt = $db->prepare('INSERT INTO businesses (customer_id, business_name, activity_sector, country, city, address, description, products_services, social_facebook, social_instagram, social_tiktok, social_website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$customer, $b['business_name'], $b['activity_sector'], $b['country'], $b['city'], $b['address'], $b['description'], $b['products_services'], $b['social_facebook'], $b['social_instagram'], $b['social_tiktok'], $b['social_website']]);
        return [$customer, (int) $db->lastInsertId()];
    }
}
