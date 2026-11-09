<?php
declare(strict_types=1);

require dirname(__DIR__) . '/utils/ApiException.php';
require dirname(__DIR__) . '/middleware/RateLimitMiddleware.php';

if (($argv[1] ?? '') === '--worker') {
    $_SERVER['REMOTE_ADDR'] = 'fixture-address';
    try {
        RateLimitMiddleware::check('parallel', 5, 300, $argv[2]);
        exit(0);
    } catch (ApiException $error) {
        exit($error->status === 429 ? 2 : 3);
    }
}

$dir = sys_get_temp_dir() . '/ocd-rate-' . bin2hex(random_bytes(8));
mkdir($dir, 0700);
$workers = [];
$allowed = 0;
$limited = 0;
$failed = false;
try {
    for ($i = 0; $i < 20; $i++) {
        $process = proc_open([PHP_BINARY, __FILE__, '--worker', $dir], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($process)) {
            throw new RuntimeException('Unable to start worker');
        }
        fclose($pipes[0]);
        $workers[] = [$process, $pipes];
    }
    foreach ($workers as [$process, $pipes]) {
        $output = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        $code = proc_close($process);
        if ($code === 0) {
            $allowed++;
        } elseif ($code === 2) {
            $limited++;
        } else {
            $failed = true;
            echo $output . $error;
        }
    }
    if ($failed || $allowed !== 5 || $limited !== 15) {
        throw new RuntimeException('Unexpected limiter result: ' . $allowed . '/' . $limited);
    }
    echo "PASS concurrent file rate limit: 20 processes, 5 accepted, 15 limited. No database used.\n";
} finally {
    foreach (glob($dir . '/*') ?: [] as $file) {
        unlink($file);
    }
    rmdir($dir);
}
