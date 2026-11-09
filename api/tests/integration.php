<?php
declare(strict_types=1);

if (getenv('OCD_TEST_CONFIRM_ISOLATED') !== 'YES') {
    fwrite(STDOUT, "SKIP: requires explicit authorization and an already prepared isolated database/API. No request sent.\n");
    exit(2);
}
if (!extension_loaded('curl')) {
    throw new RuntimeException('The curl extension is required for concurrent HTTP integration tests.');
}
$required = ['OCD_TEST_API_URL', 'OCD_TEST_ADMIN_EMAIL', 'OCD_TEST_ADMIN_PASSWORD', 'OCD_TEST_DATE', 'OCD_TEST_TIME'];
foreach ([2, 3, 4] as $number) {
    $required[] = 'OCD_TEST_SESSION_' . $number . '_DATE';
    $required[] = 'OCD_TEST_SESSION_' . $number . '_TIME';
}
foreach ($required as $name) {
    if (getenv($name) === false || getenv($name) === '') {
        throw new RuntimeException('Missing integration setting: ' . $name);
    }
}
$base = rtrim((string) getenv('OCD_TEST_API_URL'), '/') . '/';
$parts = parse_url($base);
if (!isset($parts['scheme'], $parts['host']) || !in_array($parts['scheme'], ['http', 'https'], true) || isset($parts['user']) || ($parts['scheme'] === 'http' && !in_array($parts['host'], ['127.0.0.1', 'localhost'], true))) {
    throw new RuntimeException('Use HTTPS or localhost for the isolated API.');
}
$jar = tempnam(sys_get_temp_dir(), 'ocd-integration-');
$nonce = bin2hex(random_bytes(12));
$csrf = '';
$passed = 0;
function assertIntegration(bool $ok, string $name): void
{
    global $passed;
    if (!$ok) {
        throw new RuntimeException('Integration assertion failed: ' . $name);
    }
    $passed++;
    echo 'PASS ' . $name . PHP_EOL;
}
function client(string $path, string $method = 'GET', ?array $body = null, ?string $key = null): CurlHandle
{
    global $base, $jar, $csrf;
    $handle = curl_init($base . $path);
    $headers = ['Content-Type: application/json', 'Accept: application/json'];
    if ($key !== null) {
        $headers[] = 'Idempotency-Key: ' . $key;
    }
    if ($csrf !== '') {
        $headers[] = 'X-CSRF-Token: ' . $csrf;
    }
    curl_setopt_array($handle, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_RETURNTRANSFER => true, CURLOPT_COOKIEFILE => $jar, CURLOPT_COOKIEJAR => $jar, CURLOPT_TIMEOUT => 30]);
    if ($body !== null) {
        curl_setopt($handle, CURLOPT_POSTFIELDS, json_encode($body, JSON_THROW_ON_ERROR));
    }
    return $handle;
}
function received(CurlHandle $handle, string|false $content): array
{
    if ($content === false) {
        throw new RuntimeException('Integration HTTP transport failed.');
    }
    $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    return [$status, json_decode($content, true, 32, JSON_THROW_ON_ERROR)];
}
function call(string $path, string $method = 'GET', ?array $body = null, ?string $key = null): array
{
    $handle = client($path, $method, $body, $key);
    try {
        return received($handle, curl_exec($handle));
    } finally {
        curl_close($handle);
    }
}
function bookingId(string $reference): int
{
    [$status, $body] = call('admin/bookings');
    if ($status !== 200) {
        throw new RuntimeException('Unable to list persisted reservations.');
    }
    foreach ($body['data']['items'] as $row) {
        if ($row['reference'] === $reference) {
            return (int) $row['id'];
        }
    }
    throw new RuntimeException('Persisted reference missing from reservation list.');
}
try {
    [$status, $body] = call('packages');
    assertIntegration($status === 200 && count($body['data']['packages']) === 6, 'active packages read from isolated database');
    $packages = array_column($body['data']['packages'], null, 'code');
    foreach (['ESSENTIEL', 'MENSUEL', 'PREMIUM'] as $code) {
        if (!isset($packages[$code])) {
            throw new RuntimeException('Expected existing package missing.');
        }
    }
    [$status, $body] = call('availability?mode=in_person&date=' . rawurlencode(getenv('OCD_TEST_DATE')) . '&package_id=' . $packages['ESSENTIEL']['id']);
    assertIntegration($status === 200 && $body['data']['availability_checked'] === true, 'configured availability query');
    [$status, $body] = call('admin/session');
    assertIntegration($status === 200, 'CSRF bootstrap');
    $csrf = $body['data']['csrf_token'];
    [$status, $body] = call('admin/login', 'POST', ['email' => getenv('OCD_TEST_ADMIN_EMAIL'), 'password' => getenv('OCD_TEST_ADMIN_PASSWORD')]);
    assertIntegration($status === 200, 'existing authorized administrator login');
    $csrf = $body['data']['csrf_token'];
    $input = ['first_name' => 'QA', 'last_name' => $nonce, 'phone' => '+22890000000', 'email' => 'qa-' . $nonce . '@example.com', 'mode' => 'in_person', 'package_id' => $packages['ESSENTIEL']['id'], 'date' => getenv('OCD_TEST_DATE'), 'time' => getenv('OCD_TEST_TIME'), 'business' => ['business_name' => 'Isolated QA ' . $nonce]];
    $multi = curl_multi_init();
    $handles = [client('bookings', 'POST', $input, $nonce . '-a'), client('bookings', 'POST', $input, $nonce . '-b')];
    foreach ($handles as $handle) {
        curl_multi_add_handle($multi, $handle);
    }
    do {
        $state = curl_multi_exec($multi, $running);
        if ($state !== CURLM_OK) {
            throw new RuntimeException('Concurrent HTTP transport failed.');
        }
        if ($running) {
            curl_multi_select($multi, 0.1);
        }
    } while ($running);
    $responses = [];
    foreach ($handles as $handle) {
        $responses[] = received($handle, curl_multi_getcontent($handle));
        curl_multi_remove_handle($multi, $handle);
        curl_close($handle);
    }
    curl_multi_close($multi);
    $statuses = array_column($responses, 0);
    sort($statuses);
    assertIntegration($statuses === [201, 409], 'two concurrent requests create exactly one reservation');
    $winner = $responses[0][0] === 201 ? 0 : 1;
    $reference = $responses[$winner][1]['data']['reference'];
    [$status, $body] = call('bookings', 'POST', $input, $nonce . ($winner === 0 ? '-a' : '-b'));
    assertIntegration($status === 200 && $body['data']['reference'] === $reference && $body['data']['replayed'] === true, 'submission replay persisted without duplication');
    $id = bookingId($reference);
    [$status, $body] = call('admin/bookings/' . $id);
    assertIntegration($status === 200 && $body['data']['booking']['status'] === 'pending' && count($body['data']['sessions']) === 1, 'normal reservation and real session readable');
    $monthly = array_replace($input, ['mode' => 'remote', 'package_id' => $packages['MENSUEL']['id']]);
    [$status, $body] = call('bookings', 'POST', $monthly, $nonce . '-monthly');
    assertIntegration($status === 201 && $body['data']['sessions_to_plan'] === 3, 'monthly with first dated session');
    $monthlyId = bookingId($body['data']['reference']);
    foreach ([2, 3, 4] as $number) {
        [$status] = call('admin/bookings/' . $monthlyId . '/sessions', 'POST', ['session_number' => $number, 'date' => getenv('OCD_TEST_SESSION_' . $number . '_DATE'), 'time' => getenv('OCD_TEST_SESSION_' . $number . '_TIME')]);
        assertIntegration($status === 201, 'monthly session ' . $number . ' persisted');
    }
    [$status, $body] = call('admin/bookings/' . $monthlyId);
    assertIntegration($status === 200 && count(array_filter($body['data']['sessions'], static fn ($s) => $s['status'] === 'scheduled' && $s['start_at'] !== null)) === 4, 'all four monthly dates readable');
    [$status] = call('admin/bookings/' . $id . '/status', 'PATCH', ['status' => 'confirmed']);
    assertIntegration($status === 200, 'administrative confirmation written');
    [$status, $body] = call('admin/bookings/' . $id);
    assertIntegration($status === 200 && $body['data']['booking']['status'] === 'confirmed', 'confirmed status read back from database');
    [$status, $body] = call('quotes', 'POST', $input, $nonce . '-quote');
    assertIntegration($status === 201 && $body['data']['status'] === 'pending', 'Premium quote persisted without invented price');
    [$status, $body] = call('admin/quotes');
    assertIntegration($status === 200 && $body['data']['items'] !== [], 'Premium requests available to administrator');
    call('admin/logout', 'POST', []);
    echo $passed . " integration checks passed. Test records are retained in the isolated database; no SQL or cleanup script executed.\n";
} finally {
    unlink($jar);
}
