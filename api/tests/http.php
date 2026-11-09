<?php
declare(strict_types=1);

$directory = sys_get_temp_dir() . '/ocd-http-' . bin2hex(random_bytes(8));
mkdir($directory, 0700);
$socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
if (!$socket) {
    throw new RuntimeException('Unable to reserve local port');
}
$address = stream_socket_get_name($socket, false);
fclose($socket);
$environment = getenv();
foreach (['APP_ENV' => 'local', 'APP_KEY' => str_repeat('http-unit-', 5), 'CORS_ORIGIN' => 'http://127.0.0.1:5173', 'SESSION_COOKIE_SECURE' => '0', 'DB_HOST' => '', 'DB_NAME' => '', 'DB_USER' => '', 'DB_PASS' => '', 'RATE_LIMIT_DIRECTORY' => $directory] as $key => $value) {
    $environment[$key] = $value;
}
$process = proc_open([PHP_BINARY, '-d', 'session.save_path=' . $directory, '-S', $address, dirname(__DIR__) . '/index.php'], [0 => ['pipe', 'r'], 1 => ['file', $directory . '/server.out', 'a'], 2 => ['file', $directory . '/server.err', 'a']], $pipes, dirname(__DIR__), $environment);
if (!is_resource($process)) {
    throw new RuntimeException('Unable to start local HTTP server');
}
fclose($pipes[0]);
$base = 'http://' . $address . '/api/';
$passed = 0;
function request(string $path, string $method = 'GET', ?string $body = null, array $headers = []): array
{
    global $base;
    $headers = array_merge(['Content-Type: application/json'], $headers);
    $ctx = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'content' => $body ?? '', 'ignore_errors' => true, 'timeout' => 5]]);
    $content = file_get_contents($base . $path, false, $ctx);
    if ($content === false || !isset($http_response_header[0])) {
        throw new RuntimeException('HTTP request failed');
    }
    preg_match('/\s(\d{3})\s/', $http_response_header[0], $match);
    return [(int) $match[1], $content, $http_response_header];
}
function httpCheck(string $name, int $expected, array $response): void
{
    global $passed;
    if ($response[0] !== $expected) {
        throw new RuntimeException($name . ': expected ' . $expected . ', received ' . $response[0] . ' ' . $response[1]);
    }
    if ($expected !== 204) {
        $json = json_decode($response[1], true, 32, JSON_THROW_ON_ERROR);
        if (!isset($json['success']) || preg_match('/SQLSTATE|password_hash|pdo_mysql|Stack trace|DB_PASS/i', $response[1])) {
            throw new RuntimeException('Invalid or unsafe error response');
        }
    }
    echo 'PASS ' . $name . PHP_EOL;
    $passed++;
}
try {
    for ($i = 0; $i < 50; $i++) {
        $probe = @fsockopen('tcp://' . $address, -1, $errno, $error, 0.1);
        if ($probe) {
            fclose($probe);
            break;
        }
        usleep(100000);
    }
    httpCheck('GET packages fails closed without configured database', 503, request('packages'));
    httpCheck('GET availability malformed mode', 422, request('availability?mode[]=remote&date=2099-01-05'));
    httpCheck('GET availability invalid date', 422, request('availability?mode=remote&date=2099-02-30'));
    httpCheck('GET availability arbitrary duration refused', 422, request('availability?mode=remote&date=2099-01-05&duration=15'));
    httpCheck('GET availability fails closed without database', 503, request('availability?mode=remote&date=2099-01-05&package_id=1'));
    httpCheck('unknown internal directory not served', 404, request('database/schema.sql'));
    httpCheck('preflight hidden outside a control role', 404, request('preflight', 'GET', null, ['X-Preflight-Token: ' . str_repeat('a', 40)]));
    httpCheck('unsupported HTTP method', 405, request('packages', 'POST', '{}'));
    httpCheck('foreign origin refused', 403, request('packages', 'GET', null, ['Origin: https://invalid.example']));
    httpCheck('CORS preflight', 204, request('bookings', 'OPTIONS', null, ['Origin: http://127.0.0.1:5173']));
    httpCheck('anonymous reservation list denied', 401, request('admin/bookings'));
    httpCheck('anonymous reservation details denied', 401, request('admin/bookings/1'));
    httpCheck('anonymous status mutation denied', 401, request('admin/bookings/1/status', 'PATCH', '{"status":"confirmed"}'));
    httpCheck('anonymous scheduling denied', 401, request('admin/bookings/1/sessions', 'POST', '{}'));
    $session = request('admin/session');
    httpCheck('anonymous CSRF session issued without database', 200, $session);
    $csrf = json_decode($session[1], true)['data']['csrf_token'];
    $cookie = null;
    foreach ($session[2] as $header) {
        if (stripos($header, 'Set-Cookie: OCDADMIN=') === 0) {
            $cookie = explode(';', substr($header, strlen('Set-Cookie: ')))[0];
            if (stripos($header, 'HttpOnly') === false || stripos($header, 'SameSite=Strict') === false) {
                throw new RuntimeException('Session cookie flags missing');
            }
        }
    }
    if ($cookie === null) {
        throw new RuntimeException('Session cookie missing');
    }
    httpCheck('login without CSRF rejected', 403, request('admin/login', 'POST', '{}', ['Cookie: ' . $cookie]));
    httpCheck('login malformed credentials rejected', 422, request('admin/login', 'POST', '{}', ['Cookie: ' . $cookie, 'X-CSRF-Token: ' . $csrf]));
    $input = ['first_name' => 'Ama', 'last_name' => 'Mensah', 'phone' => '+22890000000', 'mode' => 'remote', 'date' => '2099-01-05', 'time' => '10:15', 'package_id' => 1, 'business' => ['business_name' => 'Atelier']];
    httpCheck('booking honeypot does not fake success', 422, request('bookings', 'POST', '{"website":"spam"}'));
    httpCheck('booking malformed JSON', 400, request('bookings', 'POST', '{'));
    httpCheck('booking invalid nested business', 422, request('bookings', 'POST', json_encode(array_replace($input, ['business' => 'invalid']))));
    httpCheck('booking missing idempotency key', 422, request('bookings', 'POST', json_encode($input)));
    httpCheck('booking database failure never returns success', 503, request('bookings', 'POST', json_encode($input), ['Idempotency-Key: http-submission-000001']));
    httpCheck('booking rate limit enforced', 429, request('bookings', 'POST', json_encode($input), ['Idempotency-Key: http-submission-000001']));
    httpCheck('quote missing required fields', 422, request('quotes', 'POST', '{}'));
    httpCheck('quote database failure never returns success', 503, request('quotes', 'POST', json_encode($input), ['Idempotency-Key: http-submission-000002']));
    echo $passed . " HTTP checks passed. Database deliberately unconfigured: no SQL executed.\n";
} finally {
    proc_terminate($process);
    proc_close($process);
    foreach (glob($directory . '/*') ?: [] as $file) {
        unlink($file);
    }
    rmdir($directory);
}
