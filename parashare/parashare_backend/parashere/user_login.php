<?php
// /var/www/html/parashere/user_login.php
// ログイン
// メールアドレスとパスワードでユーザーを認証し、成功すればユーザー情報を返す

declare(strict_types=1);

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * JSON形式でレスポンスを返すための共通関数
 * @param int $status HTTPステータスコード
 * @param array $payload 返却するデータ
 */
function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// JSONリクエストボディの受け取り
$raw  = file_get_contents('php://input');
$in   = json_decode($raw, true);
if (!is_array($in)) $in = [];

$mail     = isset($in['mail'])     ? trim($in['mail'])     : '';
$password = isset($in['password']) ? (string)$in['password'] : '';


// 入力値バリデーション
if ($mail === '' || $password === '') {
    respond(400, ['ok' => false, 'error' => 'メールアドレスとパスワードを入力してください']);
}
if (!filter_var($mail, FILTER_VALIDATE_EMAIL)) {
    respond(400, ['ok' => false, 'error' => 'メールアドレスの形式が正しくありません']);
}

// ログイン処理
try {
    // メールアドレスを元にユーザーを検索
    // パスワードハッシュも取得しておく
    $sql = "SELECT
                id_user,
                mail,
                name,
                point,
                password,
                type,
                id_title,
                co,
                level
            FROM user
            WHERE mail = :mail
            LIMIT 1";
    $stmt = $dbh->prepare($sql);   // ★ $sql を渡す
	$stmt->execute([':mail' => $mail]);
	$user = $stmt->fetch(PDO::FETCH_ASSOC);

    // ユーザーが見つからない、またはパスワードが一致しない場合
    // セキュリティのため、どちらが間違っているかは教えず、同じエラーメッセージを返す
    if (!$user || !password_verify($password, $user['password'])) {
        respond(401, ['ok' => false, 'error' => 'メールアドレスまたはパスワードが違います']);
    }

    // ログイン成功
    // レスポンスにパスワードハッシュを含めないように削除する
    unset($user['password']);

    respond(200, [
        'ok'   => true,
        'user' => $user,
        'message' => 'ログインしました'
    ]);

} catch (PDOException $e) {
    respond(500, ['ok' => false, 'error' => 'DBエラー', 'detail' => $e->getMessage()]);
}
