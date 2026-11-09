<?php
declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    foreach (['utils', 'services', 'middleware', 'controllers'] as $dir) {
        $path = dirname(__DIR__) . '/' . $dir . '/' . $class . '.php';
        if (is_file($path)) {
            require_once $path;
            return;
        }
    }
});
require __DIR__ . '/FakeDatabase.php';

$passed = 0;
$failed = 0;
function check(bool $condition, string $message = 'Assertion failed'): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}
function expectError(int $status, callable $work): void
{
    try {
        $work();
    } catch (ApiException $e) {
        check($e->status === $status, 'Expected ' . $status . ', received ' . $e->status);
        return;
    }
    throw new RuntimeException('Expected HTTP ' . $status);
}
function test(string $name, callable $work): void
{
    global $passed, $failed;
    try {
        $work();
        $passed++;
        echo 'PASS ' . $name . PHP_EOL;
    } catch (Throwable $e) {
        $failed++;
        echo 'FAIL ' . $name . ': ' . $e->getMessage() . PHP_EOL;
    }
}
function input(int $package = 1, string $mode = 'remote', string $time = '10:15', ?string $date = null): array
{
    return Validator::submission(['first_name' => ' Ama ', 'last_name' => ' Mensah ', 'phone' => '+228 90 00 00 00', 'email' => 'ama@example.com', 'package_id' => $package, 'mode' => $mode, 'date' => $date ?? '2099-01-05', 'time' => $time, 'business' => ['business_name' => ' Atelier Ama ', 'activity_sector' => 'Mode']]);
}
$app = ['app_key' => str_repeat('unit-only-', 5)];
$key = 'submission-unit-000001';

foreach ([null, [], '1abc', '0', '-1', 1.2, true, '9223372036854775808'] as $value) {
    test('reject invalid identifier ' . json_encode($value), static fn () => expectError(422, static fn () => Validator::id($value)));
}
test('normalize nested business and phone', static function (): void {
    $in = input();
    check($in['first_name'] === 'Ama' && $in['business']['business_name'] === 'Atelier Ama');
    check($in['phone'] === '+22890000000');
    check(Validator::mode('in-person') === 'in_person');
});
test('reject malformed nested values', static function (): void {
    expectError(422, static fn () => Validator::text(['name' => []], 'name', 20));
    expectError(422, static fn () => Validator::date('2099-02-30'));
    expectError(422, static fn () => Validator::time('24:00'));
    expectError(422, static fn () => Validator::phone(['phone' => '()--------'], 'phone', true));
});
test('honeypot never returns a successful fake booking', static fn () => expectError(422, static fn () => Validator::submission(['website' => 'spam'])));
test('normal booking stores customer, business, snapshot and session', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    $result = BookingService::create($db, input(), $app, $key);
    $booking = array_values($db->rows['bookings'])[0];
    $session = array_values($db->rows['booking_sessions'])[0];
    check($result['status'] === 'pending' && strlen($result['reference']) === 36);
    check(count($db->rows['customers']) === 1 && count($db->rows['businesses']) === 1);
    check($booking['unit_price_snapshot'] === '15000.00' && $booking['total_amount'] === '15000.00');
    check(!array_key_exists('start_at', $booking));
    check($session['start_at'] === '2099-01-05 10:15:00' && $session['end_at'] === '2099-01-05 11:45:00');
    check(array_search('commit', $db->events, true) < array_search(current(array_filter($db->events, static fn ($e) => str_starts_with($e, 'release:'))), $db->events, true));
});
test('monthly stores one real session and exposes three to plan', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    $result = BookingService::create($db, input(3), $app, $key);
    check($result['sessions_expected'] === 4 && $result['sessions_to_plan'] === 3);
    check(count($db->rows['booking_sessions']) === 1);
    $booking = array_values($db->rows['bookings'])[0];
    check($booking['total_amount'] === '54000.00');
    $detail = AdminBookingService::detail($db, (int) $booking['id']);
    check(count($detail['sessions']) === 4 && $detail['sessions'][1]['status'] === 'to_plan');
    check($detail['sessions'][1]['start_at'] === null);
});
test('all defined package durations come from database', static function () use ($app, $key): void {
    foreach ([1 => 90, 2 => 240, 3 => 90, 4 => 45, 5 => 90] as $id => $duration) {
        $db = new FakeDatabase();
        BookingService::create($db, input($id), $app, $key);
        $s = array_values($db->rows['booking_sessions'])[0];
        check(strtotime($s['end_at'] . ' UTC') - strtotime($s['start_at'] . ' UTC') === $duration * 60);
    }
});
test('reject inactive, unknown, unsupported and Premium bookings', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    expectError(404, static fn () => BookingService::create($db, input(100), $app, $key));
    $db->rows['packages'][1]['supports_remote'] = 0;
    expectError(422, static fn () => BookingService::create($db, input(), $app, $key));
    expectError(422, static fn () => BookingService::create($db, input(6), $app, $key));
    $db->rows['packages'][1]['is_active'] = 0;
    expectError(404, static fn () => BookingService::create($db, input(), $app, $key));
});
test('same-mode overlap rejected, different modes allowed, boundaries allowed', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    BookingService::create($db, input(), $app, $key);
    expectError(409, static fn () => BookingService::create($db, input(1, 'remote', '10:30'), $app, 'submission-unit-000002'));
    BookingService::create($db, input(1, 'in-person', '10:30'), $app, 'submission-unit-000003');
    BookingService::create($db, input(1, 'remote', '11:45'), $app, 'submission-unit-000004');
    check(count($db->rows['bookings']) === 3);
});
test('past date or time rejected in business timezone', static function (): void {
    $tz = new DateTimeZone('Africa/Lome');
    expectError(422, static fn () => AvailabilityService::interval('2000-01-01', '10:15', 90, $tz));
    $today = new DateTimeImmutable('now', $tz);
    $past = $today->modify('-2 minutes');
    expectError(422, static fn () => AvailabilityService::interval($past->format('Y-m-d'), $past->format('H:i'), 90, $tz));
});
test('timezone independent UTC persistence', static function (): void {
    $previous = date_default_timezone_get();
    try {
        date_default_timezone_set('Pacific/Auckland');
        $range = AvailabilityService::interval('2099-01-05', '11:23', 90, new DateTimeZone('Africa/Lome'));
        check(AvailabilityService::sqlTime($range[0]) === '2099-01-05 11:23:00');
        $tokyo = AvailabilityService::interval('2099-01-05', '11:23', 90, new DateTimeZone('Asia/Tokyo'));
        check(AvailabilityService::sqlTime($tokyo[0]) === '2099-01-05 02:23:00');
    } finally {
        date_default_timezone_set($previous);
    }
});
test('no configured opening never announces availability', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    $db->rows['availability_rules'] = [];
    check(AvailabilityService::windows($db, 'remote', '2099-01-05', 1)['windows'] === []);
    expectError(409, static fn () => BookingService::create($db, input(), $app, $key));
});
test('closure, partial closure and exceptional opening', static function (): void {
    $db = new FakeDatabase();
    $ex = ['exception_date' => '2099-01-05', 'mode' => 'all', 'is_closed' => 1, 'start_time' => null, 'end_time' => null];
    $db->rows['availability_exceptions'] = [$ex];
    check(AvailabilityService::windows($db, 'remote', '2099-01-05', 1)['windows'] === []);
    $ex['start_time'] = '10:00:00'; $ex['end_time'] = '12:00:00';
    $db->rows['availability_exceptions'] = [$ex];
    $free = AvailabilityService::windows($db, 'remote', '2099-01-05', null)['windows'];
    check(count($free) === 2 && str_contains($free[0]['end_at'], '10:00:00'));
    $ex['is_closed'] = 0;
    $db->rows['availability_exceptions'] = [$ex];
    $free = AvailabilityService::windows($db, 'remote', '2099-01-05', null)['windows'];
    check(count($free) === 1 && str_contains($free[0]['start_at'], '10:00:00'));
    $ex['end_time'] = null; $db->rows['availability_exceptions'] = [$ex];
    expectError(503, static fn () => AvailabilityService::windows($db, 'remote', '2099-01-05', null));
});
test('midnight and previous-day occupied interval', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    foreach ($db->rows['availability_rules'] as &$rule) {
        $rule['start_time'] = '22:00:00'; $rule['end_time'] = '04:00:00';
    }
    unset($rule);
    BookingService::create($db, input(2, 'remote', '23:23'), $app, $key);
    $session = array_values($db->rows['booking_sessions'])[0];
    check($session['end_at'] === '2099-01-06 03:23:00');
    $windows = AvailabilityService::windows($db, 'remote', '2099-01-06', null);
    check(count($windows['occupied']) === 1 && str_contains($windows['occupied'][0]['start_at'], '2099-01-05'));
    expectError(409, static fn () => BookingService::create($db, input(4, 'remote', '02:00', '2099-01-06'), $app, 'submission-unit-000002'));
});
test('repeated submission does not insert again and changed payload conflicts', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    $a = BookingService::create($db, input(), $app, $key);
    $b = BookingService::create($db, input(), $app, $key);
    check($a['reference'] === $b['reference'] && $b['replayed'] === true);
    check(count($db->rows['customers']) === 1 && count($db->rows['bookings']) === 1);
    expectError(409, static fn () => BookingService::create($db, input(2), $app, $key));
});
test('Premium quote stores customer and business without price', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    $in = Validator::submission(['first_name' => 'Ama', 'last_name' => 'Mensah', 'phone' => '+22890000000', 'mode' => 'remote', 'message' => 'Mon projet', 'business' => ['business_name' => 'Atelier']], true);
    $result = BookingService::quote($db, $in, $app, $key);
    check($result['status'] === 'pending');
    check(count($db->rows['quote_requests']) === 1 && count($db->rows['businesses']) === 1);
    $quote = array_values($db->rows['quote_requests'])[0];
    check(!isset($quote['proposed_amount']));
    check(BookingService::quote($db, $in, $app, $key)['replayed'] === true);
});
test('failure rolls back all inserts and releases locks', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    $db->failOn = 'INSERT INTO booking_sessions';
    try {
        BookingService::create($db, input(), $app, $key);
        throw new LogicException('Expected failure');
    } catch (RuntimeException $e) {
        check($e->getMessage() === 'Injected failure');
    }
    check($db->rows['customers'] === [] && $db->rows['businesses'] === [] && $db->rows['bookings'] === []);
    check(in_array('rollback', $db->events, true));
    check(str_starts_with(end($db->events), 'release:'));
});
test('named lock contention never begins transaction', static function (): void {
    $db = new FakeDatabase(); $db->lockAvailable = false;
    expectError(409, static fn () => Transaction::run($db, ['mode:remote'], static fn () => true));
    check(!in_array('begin', $db->events, true));
});
test('lock acquisition order deterministic', static function (): void {
    $a = new FakeDatabase(); $b = new FakeDatabase();
    Transaction::run($a, ['z', 'a', 'z'], static fn () => null);
    Transaction::run($b, ['a', 'z'], static fn () => null);
    check($a->events === $b->events);
});
test('monthly next session stored and replay is safe', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    BookingService::create($db, input(3), $app, $key);
    $id = (int) array_values($db->rows['bookings'])[0]['id'];
    $result = AdminBookingService::schedule($db, $id, 2, '2099-01-12', '10:15', 1);
    check($result['status'] === 'scheduled' && count($db->rows['booking_sessions']) === 2);
    check(AdminBookingService::schedule($db, $id, 2, '2099-01-12', '10:15', 1)['replayed'] === true);
    expectError(422, static fn () => AdminBookingService::schedule($db, $id, 5, '2099-01-19', '10:15', 1));
    expectError(409, static fn () => AdminBookingService::schedule($db, $id, 3, '2099-01-12', '10:15', 1));
});
test('admin confirmation is persisted with history', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    BookingService::create($db, input(), $app, $key);
    $id = (int) array_values($db->rows['bookings'])[0]['id'];
    $result = AdminBookingService::changeStatus($db, $id, 'confirmed', null, 1);
    check($result['status'] === 'confirmed' && $db->rows['bookings'][$id]['status'] === 'confirmed');
    check(count($db->rows['booking_status_history']) === 2);
    check(AdminBookingService::changeStatus($db, $id, 'confirmed', null, 1)['replayed'] === true);
});
test('manager and inactive accounts denied', static function (): void {
    check(AdminAuth::allowed(['is_active' => 1, 'role' => 'admin']));
    check(AdminAuth::allowed(['is_active' => 1, 'role' => 'super_admin']));
    check(!AdminAuth::allowed(['is_active' => 1, 'role' => 'manager']));
    check(!AdminAuth::allowed(['is_active' => 0, 'role' => 'admin']));
    check(!AdminBookingService::canTransition('cancelled', 'confirmed'));
    check(!AdminBookingService::canTransition('pending', 'awaiting_payment'));
});
test('range subtraction and joining contiguous opening windows', static function (): void {
    check(AvailabilityService::subtract([[1, 10]], [[4, 7]]) === [[1, 4], [7, 10]]);
    check(AvailabilityService::merge([[5, 10], [1, 5]]) === [[1, 10]]);
});

test('availability offers verified cross-midnight starts for a long package', static function (): void {
    $db = new FakeDatabase();
    foreach ($db->rows['availability_rules'] as &$rule) {
        $rule['start_time'] = '22:00:00'; $rule['end_time'] = '04:00:00';
    }
    unset($rule);
    $windows = AvailabilityService::windows($db, 'remote', '2099-01-05', 2)['windows'];
    $late = array_values(array_filter($windows, static fn ($w) => str_contains($w['start_at'], '2099-01-05T22:00:00')));
    check(count($late) === 1 && str_contains($late[0]['end_at'], '2099-01-06T04:00:00'));
    check(str_contains($late[0]['latest_start_at'], '2099-01-05T23:59:00'));
});
test('exceptional opening replaces previous-night carry into the day', static function (): void {
    $db = new FakeDatabase();
    foreach ($db->rows['availability_rules'] as &$rule) {
        $rule['start_time'] = '22:00:00'; $rule['end_time'] = '04:00:00';
    }
    unset($rule);
    $db->rows['availability_exceptions'] = [['exception_date' => '2099-01-05', 'mode' => 'all', 'is_closed' => 0, 'start_time' => '12:00:00', 'end_time' => '15:00:00']];
    $windows = AvailabilityService::windows($db, 'remote', '2099-01-05', null)['windows'];
    check(count($windows) === 1 && str_contains($windows[0]['start_at'], 'T12:00:00'));
});
test('status write failure rolls back status and history', static function () use ($app, $key): void {
    $db = new FakeDatabase();
    BookingService::create($db, input(), $app, $key);
    $id = (int) array_values($db->rows['bookings'])[0]['id'];
    $db->failOn = 'INSERT INTO booking_status_history';
    try {
        AdminBookingService::changeStatus($db, $id, 'confirmed', null, 1);
        throw new LogicException('Expected failure');
    } catch (RuntimeException $error) {
        check($error->getMessage() === 'Injected failure');
    }
    check($db->rows['bookings'][$id]['status'] === 'pending' && count($db->rows['booking_status_history']) === 1);
});

function fixtureDirectory(): string
{
    $dir = sys_get_temp_dir() . '/ocd-config-' . bin2hex(random_bytes(6));
    mkdir($dir . '/config', 0700, true);
    return $dir;
}
function removeDirectory(string $dir): void
{
    foreach (array_diff(scandir($dir) ?: [], ['.', '..']) as $item) {
        is_dir($dir . '/' . $item) ? removeDirectory($dir . '/' . $item) : unlink($dir . '/' . $item);
    }
    rmdir($dir);
}
test('config precedence: environment, secrets.php then dotenv', static function (): void {
    $dir = fixtureDirectory();
    try {
        file_put_contents($dir . '/config/secrets.php', "<?php if (!defined('OCD_CONFIG_LOADING')) { exit; } return ['DB_NAME' => 'from-secrets', 'DB_USER' => 'secret-user', 'UNKNOWN' => 'ignored'];");
        file_put_contents($dir . '/.env', "DB_NAME=from-dotenv\nDB_USER=dotenv-user\nDB_HOST=dotenv-host\nAPP_ENV=local\n");
        $values = Config::values($dir, ['DB_NAME' => 'from-env', 'ANYTHING' => 'ignored'], '');
        check($values['DB_NAME'] === 'from-env' && $values['DB_USER'] === 'secret-user' && $values['DB_HOST'] === 'dotenv-host');
        check(!isset($values['UNKNOWN']) && !isset($values['ANYTHING']));
    } finally {
        removeDirectory($dir);
    }
});
test('secrets.php reveals nothing when executed directly', static function (): void {
    $output = (string) shell_exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(dirname(__DIR__) . '/config/secrets.example.php'));
    check($output === '');
});
test('plain dotenv inside the public root is ignored outside local mode', static function (): void {
    $dir = fixtureDirectory();
    try {
        file_put_contents($dir . '/.env', "DB_PASS=must-not-load\nAPP_ENV=production\n");
        check(!isset(Config::values($dir, [], $dir)['DB_PASS']));
        check(Config::values($dir, [], $dir . '-another-root')['DB_PASS'] === 'must-not-load');
        check(Config::values($dir, ['APP_ENV' => 'local'], $dir)['DB_PASS'] === 'must-not-load');
    } finally {
        removeDirectory($dir);
    }
});
test('client address uses a forwarded header only when explicitly configured and valid', static function (): void {
    $_SERVER['REMOTE_ADDR'] = '10.1.2.3';
    $_SERVER['HTTP_X_FORWARDED_FOR'] = '198.51.100.7, 10.0.0.1';
    check(ClientIp::get(['client_ip_header' => '']) === '10.1.2.3');
    check(ClientIp::get(['client_ip_header' => 'HTTP_X_FORWARDED_FOR']) === '198.51.100.7');
    $_SERVER['HTTP_X_FORWARDED_FOR'] = 'not-an-address';
    check(ClientIp::get(['client_ip_header' => 'HTTP_X_FORWARDED_FOR']) === '10.1.2.3');
    check(ClientIp::masked('198.51.100.7') === '198.51.x.x');
    unset($_SERVER['HTTP_X_FORWARDED_FOR'], $_SERVER['REMOTE_ADDR']);
});
test('preflight is hidden outside a control role and without the token', static function (): void {
    $app = ['role' => 'production', 'preflight_token' => str_repeat('a', 40)];
    $_SERVER['HTTP_X_PREFLIGHT_TOKEN'] = str_repeat('a', 40);
    expectError(404, static fn () => PreflightController::index($app));
    $app['role'] = 'control';
    $_SERVER['HTTP_X_PREFLIGHT_TOKEN'] = 'wrong';
    expectError(404, static fn () => PreflightController::index($app));
    $app['preflight_token'] = 'short';
    $_SERVER['HTTP_X_PREFLIGHT_TOKEN'] = 'short';
    expectError(404, static fn () => PreflightController::index($app));
    unset($_SERVER['HTTP_X_PREFLIGHT_TOKEN']);
});
test('log file starts with a guard that prevents reading it over HTTP', static function (): void {
    $file = dirname(__DIR__) . '/storage/logs/app.log.php';
    $existed = is_file($file);
    $backup = $existed ? file_get_contents($file) : null;
    if ($existed) { unlink($file); }
    try {
        Logger::error('fixture', ['type' => 'Fixture']);
        check(str_starts_with((string) file_get_contents($file), '<?php http_response_code(404); exit; ?>'));
        check((string) shell_exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($file)) === '');
    } finally {
        $existed ? file_put_contents($file, $backup) : @unlink($file);
    }
});

echo PHP_EOL . $passed . ' passed; ' . $failed . ' failed (in-memory PDO doubles, no database connection).' . PHP_EOL;
exit($failed === 0 ? 0 : 1);
