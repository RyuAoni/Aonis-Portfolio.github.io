<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

declare(strict_types=1);

// このAPIはJSONを返すことを宣言
header('Content-Type: application/json; charset=utf-8');

// --- レスポンス用のヘルパー関数 ---
function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

// --- DB接続 (db_connect.phpなどを利用) ---
require_once 'parashere/db_connect.php'; // $dbh変数が定義されている前提

// --- メイン処理 ---
// リクエストメソッドがPOSTでなければエラー
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Method Not Allowed']);
}

// JSONリクエストボディの受け取り
$raw  = file_get_contents('php://input');
$in   = json_decode($raw, true);
if (!is_array($in)) {
    respond(400, ['ok' => false, 'error' => '無効なJSONデータです']);
}

// 入力値の取得とバリデーション
$lat  = isset($in['latitude']) ? (float)$in['latitude'] : null;
$lon  = isset($in['longitude']) ? (float)$in['longitude'] : null;
$name = isset($in['name']) ? trim($in['name']) : null;
$comment = isset($in['comment']) ? trim($in['comment']) : '';
$address = isset($in['address']) ? trim($in['address']) : null;
$max  = isset($in['max']) ? (int)$in['max'] : null;

if (empty($lat) || empty($lon) || empty($name) || empty($address) || empty($max)) {
    respond(400, ['ok' => false, 'error' => '緯度、経度、傘立て名は必須です']);
}

// データベースへの登録処理
try {
    $sql = "INSERT INTO storage (adress, adress_latitude, adress_longitude, number, image, sentence, storage_name, max) VALUES (:ad, :lat, :lon, :num, :img, :comment, :name, :max)";
    
    $stmt = $dbh->prepare($sql);
    
    $stmt->execute([
        ':ad'      => $address,
        ':lat'     => $lat,
        ':lon'     => $lon,
        ':num'     => 0,
        ':img'     => "default_img.png",
        ':comment' => $comment,
        ':name'    => $name,
        ':max'     => $max
    ]);

    // 成功レスポンス
    respond(201, ['ok' => true, 'message' => '傘立てが正常に登録されました。']);

} catch (PDOException $e) {
    // DBエラー
    respond(500, ['ok' => false, 'error' => 'データベースエラー', 'detail' => $e->getMessage()]);
}