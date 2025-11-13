<?php
// /var/www/html/parashere/my_umbrella.php
// ownerと一致する傘の一覧を取得する

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// 入力 (JSON body)
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

// owner, id_user のどちらかのキーでユーザーIDを受け取るように修正
$userId = null;
if (isset($body['owner'])) {
	$userId = (int)$body['owner'];
} elseif (isset($body['id_user'])) {
	$userId = (int)$body['id_user'];
}

// ユーザーIDが指定されていなければエラー
if ($userId === null || $userId <= 0) {
    respond(400, ['ok' => false, 'error' => 'ユーザーIDが指定されていません']);
}

try {
	$sql = "SELECT
				id_umbrella,
				name_umbrella,
				distance,
				num,
				point
			FROM umbrella
			WHERE owner = :user_id
			ORDER BY id_umbrella DESC";

	$st = $dbh->prepare($sql);
	$st->execute([':user_id' => $userId]);
	$rows = $st->fetchAll();

	$response_items = [];
	$co2_per_use = 692; // 1回の利用あたりのCO2削減量(g)

	foreach ($rows as $row) {
		$response_items[] = [
			'id_umbrella'   => (int)$row['id_umbrella'],
			'name_umbrella' => $row['name_umbrella'],
			'distance'      => (float)$row['distance'],
			'num'           => (int)$row['num'],
			'co'            => (int)$row['num'] * $co2_per_use, // CO2を都度計算
			'niceShares'    => (int)$row['point']
		];
	}

	// 結果を返す
    respond(200, ['ok' => true, 'items' => $response_items]);

} catch (PDOException $e) {
    respond(500, ['ok' => false, 'error' => $e->getMessage()]);
}
