<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/services/AvailabilityService.php';

final class AvailabilityController
{
    public static function index(array $app): void
    {
        $mode = Validator::mode($_GET['mode'] ?? null);
        $date = Validator::date($_GET['date'] ?? null);
        $packageId = isset($_GET['package_id']) ? Validator::id($_GET['package_id']) : null;
        if (isset($_GET['duration'])) {
            throw new ApiException(422, 'Utilisez package_id pour déterminer la durée de votre formule.');
        }
        Response::ok(AvailabilityService::windows(db($app), $mode, $date, $packageId));
    }
}
