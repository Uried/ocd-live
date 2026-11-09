<?php
declare(strict_types=1);

final class FakeDatabase extends PDO
{
    public array $rows = [];
    public array $events = [];
    public bool $lockAvailable = true;
    public ?string $failOn = null;
    private bool $transaction = false;
    private array $snapshot = [];
    private int $lastId = 0;

    public function __construct()
    {
        foreach (['customers', 'businesses', 'bookings', 'booking_sessions', 'booking_status_history', 'activity_logs', 'quote_requests'] as $table) {
            $this->rows[$table] = [];
        }
        $this->rows['packages'] = [];
        foreach ([[1, 'ESSENTIEL', 90, '15000.00', 1], [2, 'LONG_FORMAT', 240, '32000.00', 1], [3, 'MENSUEL', 90, '54000.00', 4], [4, 'DECOUVERTE', 45, '7500.00', 1], [5, 'DUO', 90, '15000.00', 1], [6, 'PREMIUM', null, null, 1]] as [$id, $code, $duration, $price, $count]) {
            $this->rows['packages'][$id] = ['id' => $id, 'code' => $code, 'name' => $code, 'description' => '', 'duration_minutes' => $duration, 'price_amount' => $price, 'sessions_count' => $count, 'currency' => 'XOF', 'is_active' => 1, 'supports_in_person' => 1, 'supports_remote' => 1, 'requires_quote' => $code === 'PREMIUM' ? 1 : 0, 'display_order' => $id];
        }
        $this->rows['availability_rules'] = [];
        foreach (['in_person', 'remote'] as $mode) {
            for ($day = 0; $day < 7; $day++) {
                $this->rows['availability_rules'][] = ['weekday' => $day, 'mode' => $mode, 'start_time' => '09:00:00', 'end_time' => '18:00:00'];
            }
        }
        $this->rows['availability_exceptions'] = [];
    }

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        return new FakeStatement($this, $query);
    }

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
    {
        $stmt = new FakeStatement($this, $query);
        $stmt->execute();
        return $stmt;
    }

    public function beginTransaction(): bool
    {
        if ($this->transaction) {
            throw new RuntimeException('Nested transaction');
        }
        $this->events[] = 'begin';
        $this->snapshot = $this->rows;
        $this->transaction = true;
        return true;
    }

    public function commit(): bool
    {
        $this->events[] = 'commit';
        $this->transaction = false;
        return true;
    }

    public function rollBack(): bool
    {
        $this->events[] = 'rollback';
        $this->rows = $this->snapshot;
        $this->transaction = false;
        return true;
    }

    public function inTransaction(): bool
    {
        return $this->transaction;
    }

    public function lastInsertId(?string $name = null): string|false
    {
        return (string) $this->lastId;
    }

    public function run(string $sql, array $params): array
    {
        if ($this->failOn !== null && str_contains($sql, $this->failOn)) {
            throw new RuntimeException('Injected failure');
        }
        if ($sql === 'SELECT DATABASE()') {
            return [['database' => 'fixture_only']];
        }
        if (str_contains($sql, 'GET_LOCK')) {
            $this->events[] = 'lock:' . $params[0];
            return [['locked' => $this->lockAvailable ? 1 : 0]];
        }
        if (str_contains($sql, 'RELEASE_LOCK')) {
            $this->events[] = 'release:' . $params[0];
            return [['released' => 1]];
        }
        if (str_contains($sql, 'FROM platform_settings')) {
            return [['setting_value' => 'Africa/Lome']];
        }
        if (str_contains($sql, 'FROM availability_rules')) {
            return array_values(array_filter($this->rows['availability_rules'], static fn ($r) => $r['mode'] === $params[0]));
        }
        if (str_contains($sql, 'FROM availability_exceptions')) {
            return array_values(array_filter($this->rows['availability_exceptions'], static fn ($r) => in_array($r['exception_date'], [$params[0], $params[1]], true) && in_array($r['mode'], [$params[2], 'all'], true)));
        }
        if (str_contains($sql, 'FROM booking_sessions s JOIN bookings')) {
            $matches = [];
            foreach ($this->rows['booking_sessions'] as $row) {
                $b = $this->rows['bookings'][$row['booking_id']];
                if ($b['mode'] === $params[0] && in_array($b['status'], ['pending', 'confirmed', 'awaiting_payment'], true) && $row['status'] === 'scheduled' && $row['start_at'] < $params[1] && $row['end_at'] > $params[2] && (!isset($params[3]) || (int) $b['id'] !== $params[3])) {
                    $matches[] = $row;
                }
            }
            return $matches;
        }
        if (str_contains($sql, 'FROM packages')) {
            if (str_contains($sql, "code = 'PREMIUM'")) {
                return [$this->rows['packages'][6]];
            }
            if (str_contains($sql, 'WHERE id = ?')) {
                $row = $this->rows['packages'][$params[0]] ?? null;
                return $row && $row['is_active'] ? [$row] : [];
            }
            return array_values($this->rows['packages']);
        }
        if (str_contains($sql, 'FROM activity_logs')) {
            $type = str_contains($sql, "entity_type = 'booking'") ? 'booking' : $params[0];
            $id = str_contains($sql, "entity_type = 'booking'") ? $params[0] : $params[1];
            $matches = array_values(array_filter($this->rows['activity_logs'], static fn ($r) => $r['entity_type'] === $type && (int) $r['entity_id'] === (int) $id && $r['action'] === 'submission.created'));
            return array_map(static fn ($r) => ['description' => $r['description']], array_reverse($matches));
        }
        if (str_contains($sql, 'FROM booking_sessions WHERE booking_id = ?')) {
            return array_values(array_filter($this->rows['booking_sessions'], static function ($r) use ($params, $sql) {
                return (int) $r['booking_id'] === $params[0] && (!str_contains($sql, 'session_number = ?') || (int) $r['session_number'] === $params[1]) && (!str_contains($sql, "status = 'scheduled'") || $r['status'] === 'scheduled');
            }));
        }
        foreach (['bookings', 'quote_requests', 'customers', 'businesses', 'booking_status_history'] as $table) {
            if (str_contains($sql, 'FROM ' . $table . ' WHERE')) {
                $column = str_contains($sql, 'reference = ?') ? 'reference' : (str_contains($sql, 'booking_id = ?') ? 'booking_id' : 'id');
                return array_values(array_filter($this->rows[$table], static fn ($r) => (string) $r[$column] === (string) $params[0]));
            }
        }
        if (preg_match('/^INSERT INTO ([a-z_]+) \(([^)]+)\) VALUES \(([^)]+)\)$/', $sql, $m)) {
            $table = $m[1];
            $columns = array_map('trim', explode(',', $m[2]));
            $values = array_map('trim', explode(',', $m[3]));
            $row = ['id' => ++$this->lastId];
            $i = 0;
            foreach ($columns as $index => $column) {
                $row[$column] = $values[$index] === 'NULL' ? null : $params[$i++];
            }
            if ($table === 'booking_sessions' && ($row['start_at'] === null || $row['end_at'] === null)) {
                throw new RuntimeException('NOT NULL date violated');
            }
            $this->rows[$table][$row['id']] = $row;
            return [];
        }
        if (str_starts_with($sql, 'UPDATE bookings SET status')) {
            $this->rows['bookings'][$params[2]]['status'] = $params[0];
            $this->rows['bookings'][$params[2]]['cancellation_reason'] = $params[1];
            return [];
        }
        if (str_starts_with($sql, 'UPDATE booking_sessions SET status')) {
            foreach ($this->rows['booking_sessions'] as &$row) {
                if ($row['booking_id'] === $params[0] && $row['status'] === 'scheduled') {
                    $row['status'] = str_contains($sql, "'cancelled'") ? 'cancelled' : 'completed';
                }
            }
            return [];
        }
        throw new RuntimeException('Unhandled fixture query: ' . $sql);
    }
}

final class FakeStatement extends PDOStatement
{
    private array $rows = [];
    private array $bound = [];
    private int $cursor = 0;

    public function __construct(private FakeDatabase $db, private string $sql) {}

    public function execute(?array $params = null): bool
    {
        $this->rows = $this->db->run($this->sql, $params ?? array_values($this->bound));
        $this->cursor = 0;
        return true;
    }

    public function bindValue(string|int $param, mixed $value, int $type = PDO::PARAM_STR): bool
    {
        $this->bound[$param] = $value;
        return true;
    }

    public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed
    {
        return $this->rows[$this->cursor++] ?? false;
    }

    public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array
    {
        return $this->rows;
    }

    public function fetchColumn(int $column = 0): mixed
    {
        $row = $this->fetch();
        return $row === false ? false : (array_values($row)[$column] ?? false);
    }
}
