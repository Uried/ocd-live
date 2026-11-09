<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';

final class QuoteController
{
    public static function create(array $app): void
    {
        $in = Validator::submission(Validator::body(), true);
        $key = $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '';
        SubmissionService::identity($app, 'quote', $key, $in);
        $result = BookingService::quote(db($app), $in, $app, $key);
        Response::ok($result, 'Votre demande de devis a bien été enregistrée.', $result['replayed'] ? 200 : 201);
    }
}
