<?php
declare(strict_types=1);

final class AdminController
{
    public static function index(array $app, bool $quotes = false): void
    {
        AdminAuth::requireAdmin($app);
        $page = isset($_GET['page']) ? Validator::id($_GET['page']) : 1;
        if ($page > 100000) {
            throw new ApiException(422, 'Page invalide.');
        }
        $table = $quotes ? 'quote_requests' : 'bookings';
        $stmt = db($app)->prepare("SELECT id, reference, customer_id, business_id, mode, status, created_at FROM {$table} ORDER BY id DESC LIMIT 50 OFFSET ?");
        $stmt->bindValue(1, ($page - 1) * 50, PDO::PARAM_INT);
        $stmt->execute();
        Response::ok(['items' => $stmt->fetchAll(), 'page' => $page, 'page_size' => 50]);
    }

    public static function detail(array $app, int $id, bool $quote = false): void
    {
        AdminAuth::requireAdmin($app);
        $db = db($app);
        if (!$quote) {
            Response::ok(AdminBookingService::detail($db, $id));
        }
        $stmt = $db->prepare('SELECT * FROM quote_requests WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new ApiException(404, 'Devis introuvable.');
        }
        $stmt = $db->prepare('SELECT * FROM customers WHERE id = ?');
        $stmt->execute([$row['customer_id']]);
        $customer = $stmt->fetch();
        $stmt = $db->prepare('SELECT * FROM businesses WHERE id = ? AND customer_id = ?');
        $stmt->execute([$row['business_id'], $row['customer_id']]);
        Response::ok(['quote' => $row, 'customer' => $customer, 'business' => $stmt->fetch()]);
    }

    public static function status(array $app, int $id): void
    {
        $admin = AdminAuth::requireAdmin($app);
        AdminAuth::csrf($app);
        $in = Validator::body();
        $status = Validator::text($in, 'status', 30, true);
        $comment = Validator::text($in, 'comment', 2000);
        Response::ok(AdminBookingService::changeStatus(db($app), $id, $status, $comment, (int) $admin['id']));
    }

    public static function schedule(array $app, int $id): void
    {
        $admin = AdminAuth::requireAdmin($app);
        AdminAuth::csrf($app);
        $in = Validator::body();
        $number = Validator::id($in['session_number'] ?? null);
        $date = Validator::date($in['date'] ?? null);
        $time = Validator::time($in['time'] ?? null);
        $result = AdminBookingService::schedule(db($app), $id, $number, $date, $time, (int) $admin['id']);
        Response::ok($result, 'Séance enregistrée.', $result['replayed'] ? 200 : 201);
    }
}
