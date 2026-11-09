<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';

final class PackageController
{
    public static function index(array $app): void
    {
        $stmt = db($app)->query('SELECT id, code, name, description, price_amount, currency, duration_minutes, sessions_count, supports_in_person, supports_remote, requires_quote, display_order FROM packages WHERE is_active = 1 ORDER BY display_order, id');
        Response::ok(['packages' => $stmt->fetchAll()]);
    }

    public static function settings(array $app): void
    {
        $stmt = db($app)->query("SELECT setting_key, setting_value FROM platform_settings WHERE is_public = 1 AND setting_key IN ('platform_name','default_currency','contact_email','contact_phone','contact_whatsapp','studio_address')");
        Response::ok(['settings' => array_column($stmt->fetchAll(), 'setting_value', 'setting_key')]);
    }
}
