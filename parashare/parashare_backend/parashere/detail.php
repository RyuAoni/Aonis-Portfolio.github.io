<?php
// /var/www/html/parashere/detail.php
// 傘の詳細

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// 入力 (GETパラメータ)
$id_umbrella = isset($_GET['id_umbrella']) ? (int)$_GET['id_umbrella'] : 0;

if (!$id_umbrella) {
    respond(400, ['ok' => false, 'error' => '傘IDが指定されていません']);
}

try {
    // 傘の基本情報を取得
    $sql = "SELECT 
                id_umbrella, 
                name_umbrella, 
                status, 
                distance, 
                num, 
                point,
                point AS niceShares
            FROM umbrella
            WHERE id_umbrella = :id_umbrella";
    $st = $dbh->prepare($sql);
    $st->execute([':id_umbrella' => $id_umbrella]);
    $row = $st->fetch();

    if (!$row) {
        respond(404, ['ok' => false, 'error' => '該当の傘が見つかりませんでした']);
    }

    // CO2削減量を計算 (1回の利用 = 692g削減と仮定)
    $co2_per_use = 692;
    $co2_reduction = (int)$row['num'] * $co2_per_use;

    // アプリが必要とする形式でレスポンスデータを構築
    $response_data = [
        'ok' => true,
        'id_umbrella' => (int)$row['id_umbrella'],
        'name_umbrella' => $row['name_umbrella'],
        'status' => (int)$row['status'],
        'distance' => (float)$row['distance'],
        'co' => $co2_reduction,       // 計算したCO2削減量
        'num' => (int)$row['num'],
        'point' => (int)$row['point'],
        'niceShares' => (int)$row['niceShares']  // pointから取得したナイシェア数
    ];

    respond(200, $response_data);


} catch (PDOException $e) {
    respond(500, ['ok' => false, 'error' => $e->getMessage()]);

}
