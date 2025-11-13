<?php
// /var/www/html/parashere/home.php
// マップ画面に傘立てアイコンを表示する

require_once 'db_connect.php';

header('Content-Type: application/json');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// storageテーブルの利用
// id_storage、adress_latitude、adress_longitude、number、max　storage_name　を取得
$sql = "SELECT
            id_storage,
            adress_latitude, 
            adress_longitude,
            number,
            max,
            storage_name
        FROM storage";

try {
    // 指定されたprefecture_idに属する全ての「型」をDBから取得する
    $stmt = $dbh->prepare($sql);
    //$stmt->bindParam(':mailadress', $mailadress);
    $stmt->execute();
    // 結果を取得
    $storages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    respond(200, $storages);

} catch (PDOException $e) {
    respond(500, ['error' => 'データベースエラー: ' . $e->getMessage()]);
}
