<?php
// /var/www/html/parashere/borrow.php
// 傘移動の詳細

declare(strict_types=1);

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');
session_start();

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// JSON/POST をどちらも受ける
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

$qr_address = $body['qr_address'] ?? ($_POST['qr_address'] ?? null);

// セッション → JSON(id_user/user_id) → POST(id_user/user_id) の順で取得
$id_user = $_SESSION['id_user']
        ?? ($body['id_user'] ?? $body['user_id'] ?? null)
        ?? ($_POST['id_user'] ?? $_POST['user_id'] ?? null);

// 現在地
$user_lat = $body['latitude']  ?? ($_POST['latitude']  ?? null);
$user_lon = $body['longitude'] ?? ($_POST['longitude'] ?? null);

// 距離計算
function getDistance(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $r = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat/2) * sin($dLat/2)
       + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
       * sin($dLon/2) * sin($dLon/2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $r * $c; // km
}

if (!$qr_address) {
    respond(400, ['ok'=>false, 'error'=>'qr_address is required']);
}
if (!$id_user) {
    respond(401, ['ok'=>false, 'error'=>'user_id is required']);
}
$id_user = (int)$id_user;

try {
    $dbh->beginTransaction();

    // 対象傘を行ロックして取得
    $sql = "SELECT id_umbrella,
                    id_storage,
                    status
            FROM umbrella
            WHERE qr_adress = :qr
            LIMIT 1
            FOR UPDATE";
    $stmt = $dbh->prepare($sql);
    $stmt->execute([':qr' => $qr_address]);
    $umbrella = $stmt->fetch();

    if (!$umbrella) {
        $dbh->rollBack();
        respond(404, ['ok'=>false, 'error'=>'umbrella_not_found']);
    }

    $id_umbrella = (int)$umbrella['id_umbrella'];
    $id_storage  = isset($umbrella['id_storage']) ? (int)$umbrella['id_storage'] : null;
    $status      = (int)$umbrella['status'];

    // 状態チェック（1=貸出可能）
    if ($status !== 1) {
        $dbh->rollBack();
        respond(409, ['ok'=>false, 'error'=>'already_borrowed_or_unavailable']);
    }

    // 借りる距離A: ユーザー現在地→借りた傘立て
    $km_user_to_borrow = 0.0;
    if ($id_storage !== null && $user_lat !== null && $user_lon !== null) {
        $sql = "SELECT adress_latitude, adress_longitude
                FROM storage
                WHERE id_storage = :sid
                LIMIT 1";
        $stS = $dbh->prepare($sql);
        $stS->execute([':sid' => $id_storage]);
        $stRow = $stS->fetch();
        if ($stRow && $stRow['adress_latitude'] !== null && $stRow['adress_longitude'] !== null) {
            $km_user_to_borrow = getDistance(
                (float)$user_lat, (float)$user_lon,
                (float)$stRow['adress_latitude'],
                (float)$stRow['adress_longitude']
            );
        }
    }

    // 借りる距離B: 直前の返却スポット→今回の借りスポット
    $km_return_to_borrow = 0.0;
    if ($id_storage !== null) {
        $sql = "SELECT id_storage
                FROM share
                WHERE id_umbrella = :id
                AND type = 2
                ORDER BY time DESC
                LIMIT 1";
        $stLastReturn = $dbh->prepare($sql);
        $stLastReturn->execute([':id' => $id_umbrella]);
        $lastReturn = $stLastReturn->fetch();
        $prev_return_storage_id = $lastReturn ? (int)$lastReturn['id_storage'] : null;

        if ($prev_return_storage_id !== null) {
            $sql = "SELECT adress_latitude, adress_longitude
                    FROM storage
                    WHERE id_storage = :sid
                    LIMIT 1";

            $stPrev = $dbh->prepare($sql);
            $stPrev->execute([':sid' => $prev_return_storage_id]);
            $prev = $stPrev->fetch();

            $stNow = $dbh->prepare($sql);
            $stNow->execute([':sid' => $id_storage]);
            $now = $stNow->fetch();

            if ($prev && $now &&
                $prev['adress_latitude'] !== null && $prev['adress_longitude'] !== null &&
                $now['adress_latitude']  !== null && $now['adress_longitude']  !== null) {
                $km_return_to_borrow = getDistance(
                    (float)$prev['adress_latitude'], (float)$prev['adress_longitude'],
                    (float)$now['adress_latitude'],  (float)$now['adress_longitude']
                );
            }
        }
    }

    // share に INSERT（type=1:借りる）※履歴として「ユーザー→借りスポット」を保存
    $sql = "INSERT INTO share (id_umbrella, id_user, id_storage, kilomater, time, type)
            VALUES (:id_umbrella, :id_user, :id_storage, :km, NOW(), 1)";
    $stmt = $dbh->prepare($sql);
    $stmt->execute([
        ':id_umbrella' => $id_umbrella,
        ':id_user'     => $id_user,
        ':id_storage'  => $id_storage,
        ':km'          => $km_user_to_borrow
    ]);
    $id_history = (int)$dbh->lastInsertId();

    // umbrella を貸出中へ更新
    $sql = "UPDATE umbrella
            SET status = 2,
                id_user = :id_user
            WHERE id_umbrella = :id_umbrella";
    $stmt = $dbh->prepare($sql);
    $stmt->execute([
        ':id_user'     => $id_user,
        ':id_umbrella' => $id_umbrella
    ]);

    // 合計距離を傘に累積（A+B）
    $total_km_add = ($km_user_to_borrow ?? 0.0) + ($km_return_to_borrow ?? 0.0);
    $sql = "UPDATE umbrella
            SET distance = COALESCE(distance, 0) + :km
            WHERE id_umbrella = :id_umbrella";
    $updDist = $dbh->prepare($sql);
    $updDist->execute([
        ':km'          => $total_km_add,
        ':id_umbrella' => $id_umbrella
    ]);

    // storage 在庫を減算
    if ($id_storage !== null) {
        $sql = "UPDATE storage
                SET number = number - 1
                WHERE id_storage = :id_storage
                AND number > 0";
        $stmt = $dbh->prepare($sql);
        $stmt->execute([':id_storage' => $id_storage]);

        if ($stmt->rowCount() === 0) {
            $dbh->rollBack();
            respond(409, ['ok'=>false, 'error'=>'storage_empty_or_conflict']);
        }
    }

    $dbh->commit();

    respond(201, [
        'ok'                 => true,
        'message'            => 'borrowed',
        'id_history'         => $id_history,
        'id_umbrella'        => $id_umbrella,
        // 今回傘に加算した距離の内訳
        'distance_added_km'  => $total_km_add,
        'distance_components'=> [
            'user_to_storage_km'  => $km_user_to_borrow,
            'return_to_borrow_km' => $km_return_to_borrow
        ]
    ]);
} catch (Throwable $e) {
    if (isset($dbh) && $dbh->inTransaction()) $dbh->rollBack();
    respond(500, ['ok'=>false, 'error'=>'server_error', 'detail'=>$e->getMessage()]);
}
