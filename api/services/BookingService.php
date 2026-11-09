<?php
declare(strict_types=1);

/** Création de réservation : verrou nommé MySQL + transaction pour empêcher les conflits concurrents. */

final class BookingService
{
    public static function create(PDO $db, array $in, array $app, string $key): array
    {
        [$reference, $fingerprint] = SubmissionService::identity($app, 'booking', $key, $in);
        return Transaction::run($db, ['mode:' . $in['mode'], 'submission:' . $reference], static function () use ($db, $in, $reference, $fingerprint): array {
            $replay = SubmissionService::replay($db, 'booking', $reference, $fingerprint);
            if ($replay !== null) {
                return $replay;
            }
            $package = AvailabilityService::package($db, $in['package_id'], $in['mode']);
            $tz = AvailabilityService::timezone($db);
            $interval = AvailabilityService::interval($in['date'], $in['time'], (int) $package['duration_minutes'], $tz);
            AvailabilityService::check($db, $in['mode'], $interval, $tz);
            [$customer, $business] = SubmissionService::customerBusiness($db, $in);
            $stmt = $db->prepare('INSERT INTO bookings (reference, customer_id, business_id, package_id, mode, package_name_snapshot, unit_price_snapshot, total_amount, currency, status, customer_notes, connection_location, equipment_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$reference, $customer, $business, $package['id'], $in['mode'], $package['name'], $package['price_amount'], $package['price_amount'], $package['currency'], 'pending', $in['customer_notes'], $in['connection_location'], $in['equipment_notes']]);
            $booking = (int) $db->lastInsertId();
            $stmt = $db->prepare('INSERT INTO booking_sessions (booking_id, session_number, start_at, end_at, timezone, status) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$booking, 1, AvailabilityService::sqlTime($interval[0]), AvailabilityService::sqlTime($interval[1]), $tz->getName(), 'scheduled']);
            $stmt = $db->prepare('INSERT INTO booking_status_history (booking_id, old_status, new_status) VALUES (?, NULL, ?)');
            $stmt->execute([$booking, 'pending']);
            SubmissionService::audit($db, 'booking', $booking, ['fingerprint' => $fingerprint, 'sessions_expected' => (int) $package['sessions_count'], 'duration_minutes' => (int) $package['duration_minutes']]);
            return ['reference' => $reference, 'status' => 'pending', 'sessions_expected' => (int) $package['sessions_count'], 'sessions_planned' => 1, 'sessions_to_plan' => (int) $package['sessions_count'] - 1, 'replayed' => false];
        });
    }

    public static function quote(PDO $db, array $in, array $app, string $key): array
    {
        [$reference, $fingerprint] = SubmissionService::identity($app, 'quote', $key, $in);
        return Transaction::run($db, ['submission:' . $reference], static function () use ($db, $in, $reference, $fingerprint): array {
            $replay = SubmissionService::replay($db, 'quote', $reference, $fingerprint);
            if ($replay !== null) {
                return $replay;
            }
            $stmt = $db->prepare("SELECT * FROM packages WHERE code = 'PREMIUM' AND is_active = 1 AND requires_quote = 1");
            $stmt->execute();
            $package = $stmt->fetch();
            if (!$package || !(bool) $package[$in['mode'] === 'in_person' ? 'supports_in_person' : 'supports_remote']) {
                throw new ApiException(422, 'Cette demande de devis ne peut pas être traitée actuellement.');
            }
            [$customer, $business] = SubmissionService::customerBusiness($db, $in);
            $stmt = $db->prepare('INSERT INTO quote_requests (reference, customer_id, business_id, mode, desired_date, desired_time, message, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$reference, $customer, $business, $in['mode'], $in['desired_date'], $in['desired_time'], $in['message'], $package['currency'], 'pending']);
            $id = (int) $db->lastInsertId();
            SubmissionService::audit($db, 'quote', $id, ['fingerprint' => $fingerprint]);
            return ['reference' => $reference, 'status' => 'pending', 'replayed' => false];
        });
    }
}
