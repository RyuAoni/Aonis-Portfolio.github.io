<?php
// /var/www/html/parashere/register.php
// 最寄りの傘立て

declare(strict_types=1);

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Tokyo');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// データ受信
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) respond(400, ['ok' => false, 'error' => 'invalid_json']);

$name     = trim($data['name_umbrella'] ?? '');
$qr       = trim($data['qr_address'] ?? '');
$message  = trim($data['message'] ?? '');
$owner_id = isset($data['owner']) ? (int)$data['owner'] : null;
$latitude = $data['latitude'] ?? null;
$longitude = $data['longitude'] ?? null;

// 傘の名前、QR、オーナーIDの必須チェック
if ($name === '' || $qr === '' || $owner_id === null) {
    respond(400, ['ok' => false, 'error' => 'missing_parameters', 'message' => '必須項目が不足しています。']);
}

// 緯度・経度のチェック（これが原因の場合、専用のエラーメッセージを表示）
if ($latitude === null || $longitude === null) {
    respond(400, ['ok' => false, 'error' => 'location_missing', 'message' => '傘立ての近くで登録してください。']);
}

function getDistance(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $r = 6371; $dLat = deg2rad($lat2 - $lat1); $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) * sin($dLat / 2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) * sin($dLon / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a)); return $r * $c;
}

try {
    // 最寄りの傘立て特定
    $sql = "SELECT
                id_storage,
                adress_latitude,
                adress_longitude
            FROM storage";
    $stmt = $dbh->query($sql);
    $storages = $stmt->fetchAll();
    $closest_storage_id = null;
    $min_distance = PHP_FLOAT_MAX;
    foreach ($storages as $storage) {
        $distance = getDistance((float)$latitude, (float)$longitude, (float)$storage['adress_latitude'], (float)$storage['adress_longitude']);
        if ($distance < $min_distance) {
            $min_distance = $distance;
            $closest_storage_id = (int)$storage['id_storage'];
        }
    }
    $threshold = 0.02; // 20m
    if ($closest_storage_id === null || $min_distance > $threshold) {
        respond(400, ['ok' => false, 'error' => 'no_storage_nearby', 'message' => '傘立ての近くで登録してください。']);
    }
    $id_storage = $closest_storage_id;

    // 重複チェック
    $sql = "SELECT id_umbrella
            FROM umbrella
            WHERE qr_adress = :qr
            LIMIT 1";
    $stmt_check = $dbh->prepare($sql);
    $stmt_check->execute([':qr' => $qr]);
    if ($stmt_check->fetch()) {
        respond(409, ['ok' => false, 'error' => 'qr_already_registered', 'message' => 'このQRコードは既に使用されています。']);
    }

    $dbh->beginTransaction();

    $sql = "INSERT INTO umbrella (
                name_umbrella,status, id_storage, qr_adress, message, owner,
                distance, type, num, co, point
            ) VALUES (
                :name, 1, :id_storage, :qr, :message, :owner,
                0, 1, 0, 0, 0
            )";
    $stmt_umbrella = $dbh->prepare($sql);
    $stmt_umbrella->execute([
        ':name'       => $name,
        ':id_storage' => $id_storage,
        ':qr'         => $qr,
        ':message'    => $message,
        ':owner'      => $owner_id
    ]);
    $umbrella_id = (int)$dbh->lastInsertId();

    // storageの本数更新、userのポイント更新
    $sql = "UPDATE storage
            SET number = number + 1
            WHERE id_storage = :id_storage";
    $stmt_storage = $dbh->prepare($sql);
    $stmt_storage->execute([':id_storage' => $id_storage]);
    $sql = "UPDATE user
            SET point = point + 10
            WHERE id_user = :owner_id";
    $stmt_user = $dbh->prepare($sql);
    $stmt_user->execute([':owner_id' => $owner_id]);
    $dbh->commit();

    respond(201, ['ok' => true, 'message' => 'umbrella registered', 'id_umbrella' => $umbrella_id]);

} catch (Throwable $e) {
    if (isset($dbh) && $dbh->inTransaction()) {
        $dbh->rollBack();
    }
    respond(500, ['ok' => false, 'error' => 'server_error', 'detail' => $e->getMessage()]);
}
