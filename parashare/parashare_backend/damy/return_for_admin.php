<?php
// /var/www/html/parashere/return.php
// 傘の返却

declare(strict_types=1);

require_once '../parashere/db_connect.php';

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Tokyo');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
	exit;
}

// 入力
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

$qr_address = $body['qr_address'] ?? null;
$id_user    = isset($body['id_user']) ? (int)$body['id_user'] : null;
$id_storage = isset($body['id_storage']) ? (int)$body['id_storage'] : null; // ★返却先の傘立てIDを直接受け取る

if (!$qr_address || $id_user === null || $id_storage === null) {
    respond(400, ['ok' => false, 'error' => '必要なパラメータが不足しています']);
}

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

try {
    // 傘情報/状態
    $sql = "SELECT
                id_umbrella,
                owner,
                status
            FROM umbrella
            WHERE qr_adress = :qr
            LIMIT 1";
    $stmt = $dbh->prepare($sql);
    $stmt->execute([':qr' => $qr_address]);
    $umb = $stmt->fetch();

    if (!$umb || (int)$umb['status'] !== 2) {
        respond(409, ['ok' => false, 'error' => 'この傘は現在貸し出されていません']);
    }

    $id_umbrella = (int)$umb['id_umbrella'];
    $id_owner    = (int)$umb['owner'];

    $sql = "SELECT
                number,
                max
            FROM storage
            WHERE id_storage = :id_storage";
    $nm = $dbh->prepare($sql);
    $nm->execute([':id_storage' => $id_storage]);
    $obsd   = $nm->fetch();
    $number = $obsd ? (int)$obsd['number'] : 0;
    $max    = $obsd ? (int)$obsd['max'] : 0;

    // 返却先の混雑度: 1=少ない, 2=普通, 3=多い
    $det = 2;
    if ($max > 0) {
        $ratio = $number / $max;
        if ($ratio <= 0.2) $det = 1;
        elseif ($ratio >= 0.8) $det = 3;
    }
    $return_status = $det;

    // 直前の貸出時の設置先状態
    $sql = "SELECT origin_status
            FROM share
            WHERE id_umbrella = :id
            AND type = 1
            ORDER BY time DESC
            LIMIT 1";
    $stmt = $dbh->prepare($sql);
    $stmt->execute([':id' => $id_umbrella]);
    $share_history = $stmt->fetch();
    $origin_status = $share_history ? (int)$share_history['origin_status'] : null;

    // 直前の「借り」レコードから借りた傘立てIDを取得
    $sql = "SELECT id_storage
            FROM share
            WHERE id_umbrella = :id
            AND type = 1
            ORDER BY time DESC
            LIMIT 1";
    $stLastBorrow = $dbh->prepare($sql);
    $stLastBorrow->execute([':id' => $id_umbrella]);
    $lastBorrow = $stLastBorrow->fetch();
    $origin_storage_id = $lastBorrow ? (int)$lastBorrow['id_storage'] : null;

    // 返却距離（借り傘立て→返却傘立て）を計算
    $kilometer_return = 0.0;
    if ($origin_storage_id !== null) {
        $sql = "SELECT adress_latitude, adress_longitude
                FROM storage
                WHERE id_storage = :sid
                LIMIT 1";
        $stA = $dbh->prepare($sql);
        $stA->execute([':sid' => $origin_storage_id]);
        $a = $stA->fetch();

        $stB = $dbh->prepare($sql);
        $stB->execute([':sid' => $id_storage]);
        $b = $stB->fetch();

        if ($a && $b &&
            $a['adress_latitude'] !== null && $a['adress_longitude'] !== null &&
            $b['adress_latitude'] !== null && $b['adress_longitude'] !== null) {
            $kilometer_return = getDistance(
                (float)$a['adress_latitude'], (float)$a['adress_longitude'],
                (float)$b['adress_latitude'], (float)$b['adress_longitude']
            );
        }
    }
    // ※「ユーザー現在地→返却傘立て」を距離にしたい場合は、上の計算を下記に差し替え。
    // $kilometer_return = getDistance((float)$user_lat, (float)$user_lon, (float)$b['adress_latitude'], (float)$b['adress_longitude']);

    // ポイント（返却者の内訳)
    $points_for_returner = 10;
    $breakdown = [
        ['label' => '基本返却', 'delta' => 10],
    ];
    if ($return_status === 1) {
        $points_for_returner += 10; // 少ない所に返したボーナス
        $breakdown[] = ['label' => '少ないスポットボーナス', 'delta' => 10];
    }

    // サブオーナー候補
    $is_sub_owner_candidate = ($origin_status === 3 && $return_status === 1);

    // CO₂：返却1回につき +692 g を返却者に付与
    $CO_RETURN_PER_EVENT = 692; // g

    // DB更新
    $dbh->beginTransaction();

    // 返却者：point と co(+692g)
    $sql = "UPDATE user
            SET point = point + :p,
                co = co + :c
            WHERE id_user = :uid";
    $stmt_add_stats = $dbh->prepare($sql);
    $stmt_add_stats->execute([
        ':p'   => $points_for_returner,
        ':c'   => $CO_RETURN_PER_EVENT,
        ':uid' => $id_user
    ]);

    $points_added_users = [];
    $points_added_users[$id_user] = true;

    // オーナー：point のみ（co は加算しない）
    $sql = "UPDATE user
            SET point = point + :p
            WHERE id_user = :uid";
    $stmt_add_point_only = $dbh->prepare($sql);
    $stmt_add_point_only->execute([':p' => 2, ':uid' => $id_owner]);
    $points_added_users[$id_owner] = true;

    // サブオーナー：point のみ（co は加算しない）
    $sql = "SELECT id_user
            FROM umbrella_sub_owners
            WHERE id_umbrella = :uid";
    // prepare に SQL を渡す
    $stmt_sub = $dbh->prepare($sql);
    $stmt_sub->execute([':uid' => $id_umbrella]);
    $sub_owners = $stmt_sub->fetchAll(PDO::FETCH_COLUMN);
    foreach ($sub_owners as $sub_owner_id) {
        $sub_owner_id = (int)$sub_owner_id;
        $stmt_add_point_only->execute([':p' => 2, ':uid' => $sub_owner_id]);
        $points_added_users[$sub_owner_id] = true;
    }

    // 少ない→少ない なら サブオーナー候補に
    $sql = "INSERT INTO umbrella_sub_owners (id_umbrella, id_user)
            VALUES (:umb_id,:user_id)
            ON DUPLICATE KEY UPDATE id_user = id_user";
    if ($is_sub_owner_candidate) {
        $stmt_add_sub = $dbh->prepare($sql);
        $stmt_add_sub->execute([':umb_id' => $id_umbrella, ':user_id' => $id_user]);
    }

    // 傘の状態を戻し、在庫+1
    $sql = "UPDATE umbrella
            SET status = 1,
                id_user = NULL,
                id_storage = :id_storage,
                num = num + 1
            WHERE id_umbrella = :id_umbrella";
    $upU = $dbh->prepare($sql);
    $upU->execute([':id_storage' => $id_storage, ':id_umbrella' => $id_umbrella]);

    // 返却距離を傘に累積（借りスポット→返却スポット）
    $sql = "UPDATE umbrella
            SET distance = COALESCE(distance, 0) + :km
            WHERE id_umbrella = :id_umbrella";
    $updDist = $dbh->prepare($sql);
    $updDist->execute([
        ':km'          => $kilometer_return,
        ':id_umbrella' => $id_umbrella
    ]);

    // storage 在庫 +1
    $sql = "UPDATE storage
            SET number = number + 1
            WHERE id_storage = :id_storage";
    $stmt = $dbh->prepare($sql);
    $stmt->execute([':id_storage' => $id_storage]);

    // 返却履歴を share に追加（距離も保存：借りスポット→返却スポット）
    $sql = "INSERT INTO share (id_umbrella, id_user, id_storage, kilomater, time, type)
            VALUES (:id_umbrella, :id_user, :id_storage, :km, NOW(), 2)";
    $ins = $dbh->prepare($sql);
    $ins->execute([
        ':id_umbrella' => $id_umbrella,
        ':id_user'     => $id_user,
        ':id_storage'  => $id_storage,
        ':km'          => $kilometer_return
    ]);
    $id_history = (int)$dbh->lastInsertId();

    // タイトル・レベル更新
    $returner_title = null;
    foreach (array_keys($points_added_users) as $uid) {
        $sql = "SELECT point, level
                FROM user
                WHERE id_user = :uid";
        $user_info_stmt = $dbh->prepare($sql);
        $user_info_stmt->execute([':uid' => $uid]);
        $user_data = $user_info_stmt->fetch();
        $point = $user_data ? (int)$user_data['point'] : 0;
        $level = $user_data ? (int)$user_data['level'] : 0;

        require '../parashere/title.php';
        if (isset($id_title) && $id_title != null) {
            $sql = "SELECT COUNT(*)
                    FROM userTitle
                    WHERE id_user = :id_user
                    AND id_title = :id_title";
            $sql_check = $dbh->prepare($sql);
            $sql_check->execute([':id_user' => $uid, ':id_title' => $id_title]);
            if ((int)$sql_check->fetchColumn() === 0) {
                $sql = "INSERT INTO userTitle (id_user, id_title, time)
                        VALUES (:id_user, :id_title, NOW())";
                $sql_insert = $dbh->prepare($sql);
                $sql_insert->execute([':id_user' => $uid, ':id_title' => $id_title]);

                if ($uid === $id_user) {
                    $sql = "SELECT title_name
                            FROM title
                            WHERE id_title = :id_title";
                    $sql_check2 = $dbh->prepare($sql);
                    $sql_check2->execute([':id_title' => $id_title]);
                    $sch = $sql_check2->fetch();
                    if ($sch) $returner_title = $sch['title_name'];
                }
            }
        }

        require '../parashere/level.php';
        if (isset($levels) && $levels > $level) {
            $sql = "UPDATE user
                    SET level = :levels
                    WHERE id_user = :id_user";
            $sdp = $dbh->prepare($sql);
            $sdp->execute([':levels' => $levels, ':id_user' => $uid]);
        }
    }

    $dbh->commit();

    $sql = "SELECT name
            FROM user
            WHERE id_user = :id";
    $owner_info_stmt = $dbh->prepare($sql);
    $owner_info_stmt->execute([':id' => $id_owner]);
    $owner_name = $owner_info_stmt->fetchColumn() ?: '不明な製作者';

    respond(200, [
        'ok'                => true,
        'message'           => '返却処理が完了しました',
        'id_history'        => $id_history,
        'id_umbrella'       => $id_umbrella,
        'id_owner'          => $id_owner,
        'name_owner'        => $owner_name,
        'detail'            => $return_status,
        'point'             => $points_for_returner,
        'title'             => $returner_title,
        'storage_name'      => $closest_storage_name,
        // 参考: 返却で加算した距離
        'distance_added_km' => $kilometer_return,
        // アプリの内訳UI用
        'points_breakdown'  => $breakdown,
        'co_delta_g'        => $CO_RETURN_PER_EVENT
    ]);

} catch (Throwable $e) {
    if (isset($dbh) && $dbh->inTransaction()) {
        $dbh->rollBack();
    }
    respond(500, ['ok' => false, 'error' => 'サーバーエラーが発生しました', 'detail' => $e->getMessage()]);
}