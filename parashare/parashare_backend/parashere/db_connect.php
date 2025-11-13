<?php
// /var/www/html/parashere/db_connect.php
// データベース接続

$host = 'localhost';
$dbname = 'name';
$user = 'username';
$password = 'pass';

try {
    // データベースに接続
    $dbh = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $password);
    
    // エラーが発生した場合に、例外を投げるように設定（エラーハンドリングの基本）
    $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

} catch (PDOException $e) {
    // 接続自体でエラーが起きた場合は、処理を停止してエラーを返す
    // 500のエラー
    http_response_code(500);
    echo json_encode(['error' => 'データベース接続に失敗しました。']);
    exit(); // 処理を終了
}
