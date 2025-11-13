<?php
// /var/www/html/parashere/get_master_data.php
declare(strict_types=1);
require_once '../parashere/db_connect.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // 傘の一覧を取得 (貸出可能/貸出中がわかるようにstatusも取得)
    $sql_umbrellas = "SELECT id_umbrella, name_umbrella, qr_adress, status FROM umbrella ORDER BY id_umbrella ASC";
    $stmt_umbrellas = $dbh->query($sql_umbrellas);
    $umbrellas = $stmt_umbrellas->fetchAll(PDO::FETCH_ASSOC);

    // 傘立ての一覧を取得
    $sql_storages = "SELECT id_storage, storage_name, adress_latitude, adress_longitude FROM storage ORDER BY id_storage ASC";
    $stmt_storages = $dbh->query($sql_storages);
    $storages = $stmt_storages->fetchAll(PDO::FETCH_ASSOC);

    // 2つのリストをJSONで返す
    echo json_encode([
        'ok' => true,
        'umbrellas' => $umbrellas,
        'storages' => $storages
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server_error', 'detail' => $e->getMessage()]);
}