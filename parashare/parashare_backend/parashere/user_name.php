<?php
// /var/www/html/parashere/user_name.php
// id_userによって名前を設定する

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// JSON 受け取り
$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
if (!is_array($in)) $in = [];

$id_user = isset($in['id_user']) ? (int)$in['id_user'] : 0;
$name    = isset($in['name'])    ? trim($in['name'])    : '';

if ($id_user <= 0) {
    respond(400, ['ok'=>false, 'error'=>'id_user が不正です']);
}
if ($name === '') {
    respond(400, ['ok'=>false, 'error'=>'名前を入力してください']);
}
if (mb_strlen($name) > 100) {
    respond(400, ['ok'=>false, 'error'=>'名前は100文字以内で入力してください']);
}

try {
    // ユーザー存在確認
    $sql = "SELECT
                id_user,
                mail,
                name,
                point,
                type,
                id_title,
                co
            FROM user
            WHERE id_user = :id
            LIMIT 1";
    $st = $dbh->prepare($sql);
    $st->execute([':id'=>$id_user]);
    $user = $st->fetch();
    if (!$user) {
        respond(404, ['ok'=>false, 'error'=>'USER_NOT_FOUND']);
    }

    // 名前を更新
    $sql = "UPDATE user
            SET name = :name
            WHERE id_user = :id";
    $upd = $dbh->prepare($sql);
    $upd->execute([':name'=>$name, ':id'=>$id_user]);

    // 更新後の情報を返す
    $st->execute([':id'=>$id_user]);
    $user = $st->fetch();

    respond(200, [
        'ok'   => true,
        'user' => $user,
        'message' => '名前を登録しました'
    ]);

} catch (PDOException $e) {
    respond(500, ['ok'=>false, 'error'=>'DBエラー', 'detail'=>$e->getMessage()]);
}
