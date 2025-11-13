<?php
// /var/www/html/register.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$dbname = "parashere";
$db_password = "";
$user_name = "root";
$host = "localhost";
$dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

session_start();

try {
    // 認証済みか確認（セッション方式の場合）
    /*
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['ok'=>false, 'error'=>'unauthenticated']);
        exit;
    }
    $authUserId = (int)$_SESSION['user_id'];
    */
    $authUserId=1;//仮
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // JSONを受け取る
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['ok'=>false, 'error'=>'invalid_json']);
        exit;
    }

    // 必須項目チェック
    $name   = trim($data['name_umbrella'] ?? '');
    $qr     = trim($data['qr_address'] ?? '');
    $id_storage = isset($data['id_storage']) ? (int)$data['id_storage'] : null;

    if ($name === '' || $qr === '') {
        http_response_code(400);
        echo json_encode(['ok'=>false, 'error'=>'missing_parameters']);
        exit;
    }

    // INSERT
    $stmt = $dbh->prepare("
        INSERT INTO umbrella (name_umbrella, status, id_user, qr_address, id_storage, distance)
        VALUES (:name, 1, :id_user, :qr, :id_storage, 0)
    ");
    $stmt->execute([
        ':name'       => $name,
        ':id_user'    => $authUserId,
        ':qr'         => $qr,
        ':id_storage' => $id_storage
    ]);

    $id = (int)$dbh->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'ok' => true,
        'message' => 'umbrella registered',
        'id_umbrella' => $id
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false, 'error'=>'server_error', 'detail'=>$e->getMessage()]);
}
