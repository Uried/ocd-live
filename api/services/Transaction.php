<?php
declare(strict_types=1);

final class Transaction
{
    public static function run(PDO $db, array $keys, callable $work): mixed
    {
        $database = $db->query('SELECT DATABASE()')->fetchColumn();
        if (!is_string($database) || $database === '') {
            throw new ApiException(503, 'Service momentanément indisponible.');
        }
        $keys = array_values(array_unique($keys));
        sort($keys, SORT_STRING);
        $held = [];
        try {
            foreach ($keys as $key) {
                $name = 'ocd:' . substr(hash('sha256', $database . ':' . $key), 0, 56);
                $stmt = $db->prepare('SELECT GET_LOCK(?, 5)');
                $stmt->execute([$name]);
                if ((int) $stmt->fetchColumn() !== 1) {
                    throw new ApiException(409, 'Une opération est déjà en cours. Réessayez avec la même clé de soumission.');
                }
                $held[] = $name;
            }
            $db->beginTransaction();
            $result = $work();
            $db->commit();
            return $result;
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $error;
        } finally {
            foreach (array_reverse($held) as $name) {
                try {
                    $stmt = $db->prepare('SELECT RELEASE_LOCK(?)');
                    $stmt->execute([$name]);
                    if ((int) $stmt->fetchColumn() !== 1) {
                        error_log('OCD Live: lock release failed');
                    }
                } catch (Throwable) {
                    error_log('OCD Live: lock release failed');
                }
            }
        }
    }
}
