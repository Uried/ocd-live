<?php
declare(strict_types=1);

final class AdminBookingService
{
    public static function booking(PDO $db, int $id): array
    {
        $stmt = $db->prepare('SELECT * FROM bookings WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: throw new ApiException(404, 'Réservation introuvable.');
    }

    public static function planMetadata(PDO $db, array $booking): array
    {
        $stmt = $db->prepare("SELECT description FROM activity_logs WHERE entity_type = 'booking' AND entity_id = ? AND action = 'submission.created' ORDER BY id DESC LIMIT 1");
        $stmt->execute([$booking['id']]);
        $metadata = json_decode((string) $stmt->fetchColumn(), true);
        if (is_array($metadata) && isset($metadata['sessions_expected'], $metadata['duration_minutes'])) {
            return ['sessions_expected' => (int) $metadata['sessions_expected'], 'duration_minutes' => (int) $metadata['duration_minutes']];
        }
        $stmt = $db->prepare('SELECT sessions_count, duration_minutes FROM packages WHERE id = ?');
        $stmt->execute([$booking['package_id']]);
        $package = $stmt->fetch();
        if (!$package || !$package['duration_minutes']) {
            throw new ApiException(409, 'La durée de cette réservation doit être précisée avant sa planification.');
        }
        return ['sessions_expected' => (int) $package['sessions_count'], 'duration_minutes' => (int) $package['duration_minutes']];
    }

    public static function detail(PDO $db, int $id): array
    {
        $booking = self::booking($db, $id);
        $stmt = $db->prepare('SELECT * FROM customers WHERE id = ?');
        $stmt->execute([$booking['customer_id']]);
        $customer = $stmt->fetch();
        $stmt = $db->prepare('SELECT * FROM businesses WHERE id = ? AND customer_id = ?');
        $stmt->execute([$booking['business_id'], $booking['customer_id']]);
        $business = $stmt->fetch();
        $stmt = $db->prepare('SELECT * FROM booking_sessions WHERE booking_id = ? ORDER BY session_number');
        $stmt->execute([$id]);
        $sessions = $stmt->fetchAll();
        $metadata = self::planMetadata($db, $booking);
        $byNumber = [];
        foreach ($sessions as $session) {
            $byNumber[(int) $session['session_number']] = $session;
        }
        for ($number = 1; $number <= $metadata['sessions_expected']; $number++) {
            if (!isset($byNumber[$number])) {
                $byNumber[$number] = ['session_number' => $number, 'status' => 'to_plan', 'start_at' => null, 'end_at' => null];
            }
        }
        ksort($byNumber);
        $stmt = $db->prepare('SELECT old_status, new_status, admin_id, comment, created_at FROM booking_status_history WHERE booking_id = ? ORDER BY id');
        $stmt->execute([$id]);
        return ['booking' => $booking, 'customer' => $customer, 'business' => $business, 'sessions' => array_values($byNumber), 'sessions_expected' => $metadata['sessions_expected'], 'stored_dates_timezone' => 'UTC', 'history' => $stmt->fetchAll()];
    }

    public static function canTransition(string $from, string $to): bool
    {
        return $from === $to || in_array($to, match ($from) {
            'pending', 'awaiting_payment' => ['confirmed', 'cancelled', 'rejected'],
            'confirmed' => ['completed', 'cancelled', 'no_show'],
            default => [],
        }, true);
    }

    public static function changeStatus(PDO $db, int $id, string $target, ?string $comment, int $admin): array
    {
        if (!in_array($target, ['confirmed', 'cancelled', 'rejected', 'completed', 'no_show'], true)) {
            throw new ApiException(422, 'Statut invalide.');
        }
        $booking = self::booking($db, $id);
        return Transaction::run($db, ['booking:' . $id, 'mode:' . $booking['mode']], static function () use ($db, $id, $target, $comment, $admin): array {
            $booking = self::booking($db, $id);
            if (!self::canTransition($booking['status'], $target)) {
                throw new ApiException(409, 'Ce changement de statut n’est pas autorisé.');
            }
            if ($booking['status'] === $target) {
                return ['id' => $id, 'status' => $target, 'replayed' => true];
            }
            if ($target === 'confirmed') {
                $stmt = $db->prepare("SELECT start_at, end_at FROM booking_sessions WHERE booking_id = ? AND status = 'scheduled'");
                $stmt->execute([$id]);
                $sessions = $stmt->fetchAll();
                if ($sessions === []) {
                    throw new ApiException(409, 'Planifiez au moins une séance avant confirmation.');
                }
                $tz = AvailabilityService::timezone($db);
                $seen = [];
                foreach ($sessions as $session) {
                    $start = (new DateTimeImmutable($session['start_at'], new DateTimeZone('UTC')))->getTimestamp();
                    $end = (new DateTimeImmutable($session['end_at'], new DateTimeZone('UTC')))->getTimestamp();
                    if ($end <= $start || $start <= time()) {
                        throw new ApiException(409, 'Une séance doit être reprogrammée avant confirmation.');
                    }
                    foreach ($seen as [$a, $b]) {
                        if ($start < $b && $a < $end) {
                            throw new ApiException(409, 'Deux séances de cette réservation se chevauchent.');
                        }
                    }
                    $seen[] = [$start, $end];
                    AvailabilityService::check($db, $booking['mode'], [$start, $end], $tz, $id);
                }
            }
            if ($target === 'completed') {
                $metadata = self::planMetadata($db, $booking);
                $stmt = $db->prepare("SELECT COUNT(*) FROM booking_sessions WHERE booking_id = ? AND status IN ('scheduled','completed') AND end_at <= UTC_TIMESTAMP()");
                $stmt->execute([$id]);
                if ((int) $stmt->fetchColumn() !== $metadata['sessions_expected']) {
                    throw new ApiException(409, 'Toutes les séances doivent être planifiées et terminées.');
                }
                $stmt = $db->prepare("UPDATE booking_sessions SET status = 'completed' WHERE booking_id = ? AND status = 'scheduled'");
                $stmt->execute([$id]);
            }
            if (in_array($target, ['cancelled', 'rejected', 'no_show'], true)) {
                $stmt = $db->prepare("UPDATE booking_sessions SET status = 'cancelled' WHERE booking_id = ? AND status = 'scheduled'");
                $stmt->execute([$id]);
            }
            $stmt = $db->prepare('UPDATE bookings SET status = ?, cancellation_reason = ? WHERE id = ?');
            $stmt->execute([$target, $target === 'cancelled' ? $comment : null, $id]);
            $stmt = $db->prepare('INSERT INTO booking_status_history (booking_id, admin_id, old_status, new_status, comment) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$id, $admin, $booking['status'], $target, $comment]);
            SubmissionService::audit($db, 'booking', $id, ['old_status' => $booking['status'], 'new_status' => $target], 'booking.status_changed', $admin);
            return ['id' => $id, 'status' => $target, 'replayed' => false];
        });
    }

    public static function schedule(PDO $db, int $id, int $number, string $date, string $time, int $admin): array
    {
        $booking = self::booking($db, $id);
        return Transaction::run($db, ['booking:' . $id, 'mode:' . $booking['mode']], static function () use ($db, $id, $number, $date, $time, $admin): array {
            $booking = self::booking($db, $id);
            if (!in_array($booking['status'], ['pending', 'confirmed', 'awaiting_payment'], true)) {
                throw new ApiException(409, 'Cette réservation ne peut plus être planifiée.');
            }
            $metadata = self::planMetadata($db, $booking);
            if ($number > $metadata['sessions_expected']) {
                throw new ApiException(422, 'Numéro de séance hors forfait.');
            }
            $tz = AvailabilityService::timezone($db);
            $interval = AvailabilityService::interval($date, $time, $metadata['duration_minutes'], $tz);
            $stmt = $db->prepare('SELECT * FROM booking_sessions WHERE booking_id = ? AND session_number = ?');
            $stmt->execute([$id, $number]);
            $existing = $stmt->fetch();
            if ($existing) {
                if ($existing['start_at'] === AvailabilityService::sqlTime($interval[0]) && $existing['end_at'] === AvailabilityService::sqlTime($interval[1]) && $existing['status'] === 'scheduled') {
                    return ['booking_id' => $id, 'session_number' => $number, 'status' => 'scheduled', 'replayed' => true];
                }
                throw new ApiException(409, 'Cette séance est déjà renseignée.');
            }
            AvailabilityService::check($db, $booking['mode'], $interval, $tz);
            $stmt = $db->prepare('INSERT INTO booking_sessions (booking_id, session_number, start_at, end_at, timezone, status) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$id, $number, AvailabilityService::sqlTime($interval[0]), AvailabilityService::sqlTime($interval[1]), $tz->getName(), 'scheduled']);
            SubmissionService::audit($db, 'booking', $id, ['session_number' => $number], 'booking.session_scheduled', $admin);
            return ['booking_id' => $id, 'session_number' => $number, 'status' => 'scheduled', 'replayed' => false];
        });
    }
}
