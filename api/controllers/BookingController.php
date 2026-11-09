<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/services/AvailabilityService.php';
require_once dirname(__DIR__) . '/services/BookingService.php';

final class BookingController
{
    public static function create(array $app): void
    {
        $in = Validator::body();
        // Anti-spam : le champ honeypot rempli par un bot est refusé sans enregistrement.
        $in = Validator::submission($in);
        $key = $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '';
        SubmissionService::identity($app, 'booking', $key, $in);
        $booking = BookingService::create(db($app), $in, $app, $key);
        Response::ok($booking, 'Votre demande de réservation a bien été enregistrée.', $booking['replayed'] ? 200 : 201);
    }
}
