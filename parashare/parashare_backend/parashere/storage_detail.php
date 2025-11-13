<?php
// /var/www/html/parashere/storage_detail.php
// 傘立ての詳細

require_once 'db_connect.php';

header('Content-Type: application/json');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
	exit;
}

// 傘立てidの取得

$id_storage = 0;

// 1. ポケットを探す (GET)
if (isset($_GET['id_storage'])) {
    $id_storage = (int)$_GET['id_storage'];
// 2. カバンを探す (POST)
} elseif (isset($_POST['id_storage'])) {
    $id_storage = (int)$_POST['id_storage'];
// 3. 最後の手段：スーツケースを探す
} else {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $json = json_decode($raw, true);
        if (is_array($json) && isset($json['id_storage'])) {
            $id_storage = (int)$json['id_storage'];
        }
    }
}

if ($id_storage <= 0) {
    // 400 Bad Request というHTTPステータスコードを設定
    respond(400, ['ok' => false, 'error' => '必須パラメータ id_storage が見つかりません']);
}

// 傘立てidをもとにstorageテーブルから拾う
// storage_name、image、sentence
$sql = "SELECT
            image,
            sentence,
            storage_name
        FROM login
        WHERE id_storage = :id_storage";

try {
    // 指定されたprefecture_idに属する全ての「型」をDBから取得する
    $stmt = $dbh->prepare($sql);
    $stmt->bindParam(':id_storage', $id_storage);
    $stmt->execute();
    // 結果を取得
    $storages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($storages);
    respond(200, $storages);

} catch (PDOException $e) {
    respond(500, ['error' => 'データベースエラー: ' . $e->getMessage()]);
}
