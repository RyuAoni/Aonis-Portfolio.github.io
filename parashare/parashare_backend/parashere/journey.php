<?php
// /var/www/html/parashere/journey.php
// 移動履歴取得

// データベースとつなげる
require_once 'db_connect.php';

header('Content-Type: application/json');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// 傘のidを取得
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

$id_umbrella = isset($body['id_umbrella']) ? (int)$body['id_umbrella'] : null;

if (!$id_umbrella) {
    respond(400, ['ok'=>false, 'error'=>'傘のidがありません']);
}

$sql_first = "SELECT
                T2.adress_latitude,
                T2.adress_longitude
            FROM
                share AS T1
            INNER JOIN
                storage AS T2 ON T1.id_storage = T2.id_storage
            WHERE
                T1.id_umbrella = :id_umbrella AND T1.type = 1
            ORDER BY
                T1.time ASC
            LIMIT 1";

$sql = "SELECT
            T2.adress_latitude,
            T2.adress_longitude
        FROM
            share AS T1
        INNER JOIN
            storage AS T2 ON T1.id_storage = T2.id_storage
        WHERE
            T1.id_umbrella = :id_umbrella AND T1.type = 2";

try {
    $stmt_first = $dbh->prepare($sql_first);
    $stmt_first->bindParam(':id_umbrella', $id_umbrella);
    $stmt_first->execute();
    $first_record = $stmt_first->fetch(PDO::FETCH_ASSOC);

    // shareテーブルから指定された傘IDの全ての移動履歴（緯度経度）を取得
    $stmt = $dbh->prepare($sql);
    $stmt->bindParam(':id_umbrella', $id_umbrella);
    $stmt->execute();
    // 結果を取得
    $shares = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($first_record) {
        array_unshift($shares, $first_record);
    }

    respond(200, $shares);

} catch (PDOException $e) {
    respond(500, ['error' => 'データベースエラー: ' . $e->getMessage()]);
}
