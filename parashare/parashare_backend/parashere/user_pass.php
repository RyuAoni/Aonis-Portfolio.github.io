<?php
// /var/www/html/parashere/user_pass.php
// アカウント登録

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

$mail            = isset($in['mail']) ? trim($in['mail']) : '';
$password        = isset($in['password']) ? (string)$in['password'] : '';
$passwordConfirm = isset($in['password_confirm']) ? (string)$in['password_confirm'] : '';

// バリデーション
if ($mail === '' || $password === '' || $passwordConfirm === '') {
    respond(400, ['ok'=>false, 'error'=>'必須項目不足（mail, password, password_confirm）']);
}
if (!filter_var($mail, FILTER_VALIDATE_EMAIL)) {
    respond(400, ['ok'=>false, 'error'=>'メール形式が不正です']);
}
if ($password !== $passwordConfirm) {
    respond(400, ['ok'=>false, 'error'=>'パスワードが一致しません']);
}
if (mb_strlen($password) < 6) {
    respond(400, ['ok'=>false, 'error'=>'パスワードは6文字以上にしてください']);
}

try {
    // メール重複チェック
    $sql = "SELECT id_user
            FROM user
            WHERE mail = :mail
            LIMIT 1";
    $st = $dbh->prepare($sql);
    $st->execute([':mail'=>$mail]);
    if ($st->fetch()) {
        respond(409, ['ok'=>false, 'error'=>'MAIL_ALREADY_EXISTS']);
    }

    // ハッシュ化して作成（他の数値列は 0 初期化、name は空文字）
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $sql = 'INSERT INTO `user` (mail, name, point, m_point, password, type, id_title, co, level)
            VALUES (:mail, :name, :point, :m_point, :password, :type, :id_title, :co, :level)';
    $st = $dbh->prepare($sql);
    $st->execute([
        ':mail'     => $mail,
        ':name'     => '',
        ':point'    => 0,
        ':m_point'  => 0,     // m_point の初期値として 0 を設定
        ':password' => $hash,
        ':type'     => 1,
        ':id_title' => 0,
        ':co'       => 0,
        ':level'    => 1,
    ]);

    $newId = (int)$dbh->lastInsertId();

    respond(201, [
        'ok'   => true,
        'user' => [
            'id_user' => $newId,
            'mail'    => $mail,
        ],
        'message' => 'アカウントを作成しました。続いて名前を登録してください。'
    ]);

} catch (PDOException $e) {
    respond(500, ['ok'=>false, 'error'=>'DBエラー', 'detail'=>$e->getMessage()]);
}
