<?php
declare(strict_types=1);

/** Disponibilités : règles horaires, exceptions, réservations existantes (Africa/Lome). */

final class AvailabilityService
{
    public static function timezone(PDO $db): DateTimeZone
    {
        $stmt = $db->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ?');
        $stmt->execute(['business_timezone']);
        $value = $stmt->fetchColumn();
        if (!is_string($value) || !in_array($value, DateTimeZone::listIdentifiers(), true)) {
            throw new ApiException(503, 'La disponibilité ne peut pas être vérifiée actuellement.');
        }
        return new DateTimeZone($value);
    }

    public static function package(PDO $db, int $id, string $mode): array
    {
        $stmt = $db->prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1');
        $stmt->execute([$id]);
        $package = $stmt->fetch();
        if (!$package) {
            throw new ApiException(404, 'Formule inconnue ou inactive.');
        }
        $supported = $mode === 'in_person' ? 'supports_in_person' : 'supports_remote';
        if (!(bool) $package[$supported]) {
            throw new ApiException(422, 'Cette formule ne propose pas ce mode de participation.');
        }
        if ((bool) $package['requires_quote'] || $package['duration_minutes'] === null || $package['price_amount'] === null) {
            throw new ApiException(422, 'Cette formule nécessite une demande de devis.');
        }
        if ((int) $package['duration_minutes'] <= 0 || (int) $package['sessions_count'] <= 0) {
            throw new ApiException(503, 'Cette formule ne peut pas être réservée actuellement.');
        }
        return $package;
    }

    public static function interval(string $date, string $time, int $duration, DateTimeZone $tz, bool $future = true): array
    {
        Validator::date($date);
        Validator::time($time);
        $start = new DateTimeImmutable($date . ' ' . $time . ':00', $tz);
        if ($start->format('Y-m-d H:i') !== $date . ' ' . $time || $duration <= 0) {
            throw new ApiException(422, 'Horaire invalide.');
        }
        if ($future && $start <= new DateTimeImmutable('now', $tz)) {
            throw new ApiException(422, 'Choisissez un horaire à venir.');
        }
        $end = $start->add(new DateInterval('PT' . $duration . 'M'));
        if ((int) $end->format('Y') > 9999) {
            throw new ApiException(422, 'La fin de séance dépasse la période prise en charge.');
        }
        return [$start->getTimestamp(), $end->getTimestamp()];
    }

    public static function sqlTime(int $timestamp): string
    {
        return gmdate('Y-m-d H:i:s', $timestamp);
    }

    public static function merge(array $ranges): array
    {
        usort($ranges, static fn (array $a, array $b): int => $a[0] <=> $b[0]);
        $result = [];
        foreach ($ranges as [$start, $end]) {
            if ($start >= $end) {
                continue;
            }
            $last = count($result) - 1;
            if ($last >= 0 && $start <= $result[$last][1]) {
                $result[$last][1] = max($result[$last][1], $end);
            } else {
                $result[] = [$start, $end];
            }
        }
        return $result;
    }

    public static function subtract(array $ranges, array $blocked): array
    {
        foreach ($blocked as [$cutStart, $cutEnd]) {
            $next = [];
            foreach ($ranges as [$start, $end]) {
                if ($cutEnd <= $start || $cutStart >= $end) {
                    $next[] = [$start, $end];
                    continue;
                }
                if ($start < $cutStart) {
                    $next[] = [$start, $cutStart];
                }
                if ($cutEnd < $end) {
                    $next[] = [$cutEnd, $end];
                }
            }
            $ranges = $next;
        }
        return self::merge($ranges);
    }

    private static function rowInterval(string $date, array $row, DateTimeZone $tz): array
    {
        $start = $row['start_time'];
        $end = $row['end_time'];
        if (!is_string($start) || !is_string($end) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d:00$/D', $start) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d:00$/D', $end) || $start === $end) {
            throw new ApiException(503, 'La disponibilité ne peut pas être vérifiée actuellement.');
        }
        $a = new DateTimeImmutable($date . ' ' . $start, $tz);
        $b = new DateTimeImmutable($date . ' ' . $end, $tz);
        if ($end < $start) {
            $b = $b->modify('+1 day');
        }
        return [$a->getTimestamp(), $b->getTimestamp()];
    }

    public static function fromRules(string $date, DateTimeZone $tz, array $rules, array $exceptions): array
    {
        $midnight = new DateTimeImmutable($date . ' 00:00:00', $tz);
        $dayEnd = $midnight->modify('+1 day')->getTimestamp();
        $ranges = [];
        $closures = [];
        $todayOverrides = [];
        foreach ([$midnight->modify('-1 day'), $midnight] as $day) {
            $key = $day->format('Y-m-d');
            $openings = [];
            $overrides = [];
            $dayClosed = false;
            foreach ($exceptions as $ex) {
                if ($ex['exception_date'] !== $key) {
                    continue;
                }
                if ((bool) $ex['is_closed'] && $ex['start_time'] === null && $ex['end_time'] === null) {
                    $dayClosed = true;
                    $closures[] = [$day->getTimestamp(), $day->modify('+1 day')->getTimestamp()];
                } elseif ((bool) $ex['is_closed']) {
                    $closures[] = self::rowInterval($key, $ex, $tz);
                } else {
                    $overrides[] = self::rowInterval($key, $ex, $tz);
                }
            }
            if ($key === $date) {
                $todayOverrides = $overrides;
            }
            if ($overrides !== []) {
                $openings = $overrides;
            } else {
                foreach ($rules as $rule) {
                    if ((int) $rule['weekday'] === (int) $day->format('w')) {
                        $openings[] = self::rowInterval($key, $rule, $tz);
                    }
                }
            }
            if (!$dayClosed) {
                array_push($ranges, ...$openings);
            }
        }
        $ranges = self::subtract(self::merge($ranges), $closures);
        $clipped = [];
        foreach ($ranges as [$start, $end]) {
            $start = max($start, $midnight->getTimestamp());
            $end = min($end, $dayEnd);
            if ($start < $end) {
                $clipped[] = [$start, $end];
            }
        }
        if ($todayOverrides !== []) {
            $limited = [];
            foreach ($clipped as [$start, $end]) {
                foreach ($todayOverrides as [$a, $b]) {
                    if (max($start, $a) < min($end, $b)) {
                        $limited[] = [max($start, $a), min($end, $b)];
                    }
                }
            }
            $clipped = $limited;
        }
        return self::merge($clipped);
    }

    public static function opening(PDO $db, string $mode, string $date, DateTimeZone $tz): array
    {
        $stmt = $db->prepare('SELECT weekday, start_time, end_time FROM availability_rules WHERE is_active = 1 AND mode = ?');
        $stmt->execute([$mode]);
        $rules = $stmt->fetchAll();
        $previous = (new DateTimeImmutable($date, $tz))->modify('-1 day')->format('Y-m-d');
        $stmt = $db->prepare("SELECT exception_date, is_closed, start_time, end_time FROM availability_exceptions WHERE exception_date IN (?, ?) AND mode IN (?, 'all')");
        $stmt->execute([$previous, $date, $mode]);
        return self::fromRules($date, $tz, $rules, $stmt->fetchAll());
    }

    public static function occupied(PDO $db, string $mode, int $start, int $end, ?int $excludeBooking = null): array
    {
        $sql = "SELECT s.start_at, s.end_at FROM booking_sessions s JOIN bookings b ON b.id = s.booking_id WHERE b.mode = ? AND b.status IN ('pending','confirmed','awaiting_payment') AND s.status = 'scheduled' AND s.start_at < ? AND s.end_at > ?";
        $params = [$mode, self::sqlTime($end), self::sqlTime($start)];
        if ($excludeBooking !== null) {
            $sql .= ' AND b.id <> ?';
            $params[] = $excludeBooking;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return array_map(static fn (array $row): array => [(new DateTimeImmutable($row['start_at'], new DateTimeZone('UTC')))->getTimestamp(), (new DateTimeImmutable($row['end_at'], new DateTimeZone('UTC')))->getTimestamp()], $stmt->fetchAll());
    }

    public static function check(PDO $db, string $mode, array $interval, DateTimeZone $tz, ?int $excludeBooking = null): void
    {
        [$start, $end] = $interval;
        $day = (new DateTimeImmutable('@' . $start))->setTimezone($tz)->setTime(0, 0);
        $ranges = [];
        while ($day->getTimestamp() < $end) {
            array_push($ranges, ...self::opening($db, $mode, $day->format('Y-m-d'), $tz));
            $day = $day->modify('+1 day');
        }
        $covered = false;
        foreach (self::merge($ranges) as [$a, $b]) {
            if ($a <= $start && $end <= $b) {
                $covered = true;
                break;
            }
        }
        if (!$covered || self::occupied($db, $mode, $start, $end, $excludeBooking) !== []) {
            throw new ApiException(409, 'Ce créneau n’est pas disponible.');
        }
    }

    public static function windows(PDO $db, string $mode, string $date, ?int $packageId): array
    {
        $tz = self::timezone($db);
        $package = $packageId === null ? null : self::package($db, $packageId, $mode);
        $start = (new DateTimeImmutable($date . ' 00:00:00', $tz))->getTimestamp();
        $end = (new DateTimeImmutable($date . ' 00:00:00', $tz))->modify('+1 day')->getTimestamp();
        $opening = self::opening($db, $mode, $date, $tz);
        $duration = $package === null ? 0 : (int) $package['duration_minutes'] * 60;
        $scanEnd = $end + $duration;
        $day = (new DateTimeImmutable('@' . $end))->setTimezone($tz);
        while ($day->getTimestamp() < $scanEnd) {
            array_push($opening, ...self::opening($db, $mode, $day->format('Y-m-d'), $tz));
            $day = $day->modify('+1 day');
        }
        $occupied = self::occupied($db, $mode, $start, $scanEnd);
        $now = (int) (floor(time() / 60) * 60 + 60);
        $free = self::subtract($opening, array_merge($occupied, [[$start, min($scanEnd, $now)]]));
        $format = static fn (array $range): array => ['start_at' => (new DateTimeImmutable('@' . $range[0]))->setTimezone($tz)->format(DateTimeInterface::ATOM), 'end_at' => (new DateTimeImmutable('@' . $range[1]))->setTimezone($tz)->format(DateTimeInterface::ATOM)];
        $available = [];
        foreach ($free as [$a, $b]) {
            if ($a >= $end || $b - $a < $duration) {
                continue;
            }
            $range = $format([$a, $b]);
            if ($package !== null) {
                $latest = min($end - 60, $b - $duration);
                if ($latest < $a) {
                    continue;
                }
                $range['latest_start_at'] = (new DateTimeImmutable('@' . $latest))->setTimezone($tz)->format(DateTimeInterface::ATOM);
            }
            $available[] = $range;
        }
        return ['date' => $date, 'mode' => $mode, 'timezone' => $tz->getName(), 'duration_minutes' => $package === null ? null : (int) $package['duration_minutes'], 'windows' => $available, 'occupied' => array_map($format, $occupied), 'availability_checked' => true, 'reason' => $opening === [] ? 'no_configured_opening' : null];
    }
}
