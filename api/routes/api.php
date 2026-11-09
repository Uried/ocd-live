<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';

$limited = static function (string $scope, callable $handler) use ($app): void {
    $limit = $app['rate_limit'][$scope];
    RateLimitMiddleware::check($scope, $limit['max'], $limit['window'], $app['rate_limit_dir'], ClientIp::get($app));
    $handler();
};

return [
    ['GET', '#^packages$#', static fn () => PackageController::index($app)],
    ['GET', '#^settings$#', static fn () => PackageController::settings($app)],
    ['GET', '#^preflight$#', static fn () => PreflightController::index($app)],
    ['GET', '#^availability$#', static fn () => AvailabilityController::index($app)],
    ['POST', '#^bookings$#', static fn () => $limited('bookings', static fn () => BookingController::create($app))],
    ['POST', '#^quotes$#', static fn () => $limited('quotes', static fn () => QuoteController::create($app))],
    ['GET', '#^admin/session$#', static fn () => AuthController::session($app)],
    ['POST', '#^admin/login$#', static fn () => $limited('login', static fn () => AuthController::login($app))],
    ['POST', '#^admin/logout$#', static fn () => AuthController::logout($app)],
    ['GET', '#^admin/bookings$#', static fn () => AdminController::index($app)],
    ['GET', '#^admin/bookings/([1-9][0-9]*)$#', static fn (array $m) => AdminController::detail($app, Validator::id($m[1]))],
    ['PATCH', '#^admin/bookings/([1-9][0-9]*)/status$#', static fn (array $m) => AdminController::status($app, Validator::id($m[1]))],
    ['POST', '#^admin/bookings/([1-9][0-9]*)/sessions$#', static fn (array $m) => AdminController::schedule($app, Validator::id($m[1]))],
    ['GET', '#^admin/quotes$#', static fn () => AdminController::index($app, true)],
    ['GET', '#^admin/quotes/([1-9][0-9]*)$#', static fn (array $m) => AdminController::detail($app, Validator::id($m[1]), true)],
];
