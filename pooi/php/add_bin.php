<?php

// EnvSet.phpをインクルード
include_once 'EnvSet.php';

// 環境変数からデータベース情報を取得
$driver = $_ENV['DB_DRIVER'];
$host = $_ENV['DB_HOST'];
$port = $_ENV['DB_PORT'];
$dbname = $_ENV['DB_NAME'];
$charset = $_ENV['DB_CHARSET'];
$db_password = $_ENV['PARKING_AREA']; // password
$user_name = $_ENV['USER_NAME'];
$dsn = "{$driver}:host={$host};port={$port};dbname={$dbname};charset={$charset}";
try {
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    // JSONでエラーを返す
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// クライアントから送られているか確認
if (filter_input(INPUT_POST, 'user_id') && filter_input(INPUT_POST, 'bin_name') && filter_input(INPUT_POST, 'bin_adress') && filter_input(INPUT_POST, 'adress_latitude') && filter_input(INPUT_POST, 'adress_longitude') && filter_input(INPUT_POST, 'bin_photo')) {
    // クライアントから送られたものを変数に代入
    $user_id = (int) $_POST['user_id'];
    $bin_name = (string) $_POST['bin_name'];
    $bin_adress = (string) $_POST['bin_adress'];
    $adress_latitude = (float) $_POST['adress_latitude'];
    $adress_longitude = (float) $_POST['adress_longitude'];
    $bin_photo = (string) $_POST['bin_photo'];
} else {
    // 不足しているパラメータがある場合は400エラーを返す
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit();
}

// 最初にデータを挿入する（qrcodeなし）
$sql = "INSERT INTO bins(user_id, bin_name, bin_adress, adress_latitude, adress_longitude, bin_photo) 
        VALUES(:user_id, :bin_name, :bin_adress, :adress_latitude, :adress_longitude, :bin_photo);";

try {
    $stmt = $dbh->prepare($sql);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindValue(':bin_name', $bin_name, PDO::PARAM_STR);
    $stmt->bindValue(':bin_adress', $bin_adress, PDO::PARAM_STR);
    $stmt->bindValue(':adress_latitude', $adress_latitude, PDO::PARAM_STR);
    $stmt->bindValue(':adress_longitude', $adress_longitude, PDO::PARAM_STR);
    $stmt->bindValue(':bin_photo', $bin_photo, PDO::PARAM_STR);
    $stmt->execute();
    
    // 挿入されたbin_idを取得
    $bin_id = $dbh->lastInsertId();

    // qrcodeを生成
    $qrcode = sprintf('https://pooi.com/index.php?id=%05d', $bin_id);

    // qrcodeを更新
    $update_sql = "UPDATE bins SET qrcode = :qrcode WHERE bin_id = :bin_id";
    $update_stmt = $dbh->prepare($update_sql);
    $update_stmt->bindValue(':qrcode', $qrcode, PDO::PARAM_STR);
    $update_stmt->bindValue(':bin_id', $bin_id, PDO::PARAM_INT);
    $update_stmt->execute();

    // 成功時に成功メッセージを返す
    $result = ['result' => true];
    echo json_encode($result);

} catch (PDOException $e) {
    // エラーハンドリング（JSONで返す）
    http_response_code(500);
    echo json_encode(['error' => 'Insert failed: ' . $e->getMessage()]);
    exit();
}