<?php
// /var/www/html/parashere/set_title.php
// 称号獲得

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

date_default_timezone_set('Asia/Tokyo');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
	exit;
}

function read_json(): array {
	$raw = file_get_contents('php://input');
	$b = json_decode($raw, true);
	return is_array($b) ? $b : [];
}

// 予期せぬ致命的エラーもJSONで返す
set_error_handler(function($severity, $message, $file, $line){
	throw new ErrorException($message, 0, $severity, $file, $line);
});
register_shutdown_function(function(){
	$e = error_get_last();
	if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
		// まだ何も出していなければJSONを返す
		if (!headers_sent()) header('Content-Type: application/json; charset=utf-8');
		echo json_encode(['ok'=>false,'error'=>'FATAL','detail'=>$e['message']], JSON_UNESCAPED_UNICODE);
	}
});

// 入力
$in = read_json();
$id_user  = isset($in['id_user'])  ? (int)$in['id_user']  : 0;
$id_title = isset($in['id_title']) ? (int)$in['id_title'] : 0;
if ($id_user <= 0 || $id_title <= 0) {
	respond(400, ['ok'=>false,'error'=>'BAD_REQUEST','message'=>'id_user と id_title は必須です']);
}

/** DB接続（db_connect.php が無くても動くようにフォールバック） */
$dsn = $user_name = $db_password = null;
$dbc = __DIR__ . '/db_connect.php';
if (file_exists($dbc)) {
	require_once $dbc; // ここで $dsn / $user_name / $db_password が定義される想定
}
if (!$dsn || !$user_name) {
	// フォールバック（あなたの環境に合わせて）
	$dbname = "parashare";
	$db_password = "123456789";
	$user_name   = "IzumiSouta";
	$host = "localhost";
	$dsn  = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
}

try {
	$dbh = new PDO($dsn, $user_name, $db_password, [
		PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
	]);

	// user存在＆レベル取得
	$sql = "SELECT level
			FROM user
			WHERE id_user = :u
			LIMIT 1";
	$st = $dbh->prepare($sql);
	$st->execute([':u'=>$id_user]);
	$userRow = $st->fetch();
	if (!$userRow) respond(404, ['ok'=>false,'error'=>'USER_NOT_FOUND']);
	$level = (int)$userRow['level'];

	// title存在確認
	$sql = "SELECT title_name
			FROM title
			WHERE id_title = :t
			LIMIT 1";
	$st2 = $dbh->prepare($sql);
	$st2->execute([':t'=>$id_title]);
	$tRow = $st2->fetch();
	if (!$tRow) respond(404, ['ok'=>false,'error'=>'TITLE_NOT_FOUND']);

	// 仕様：id_title を必要レベルとして扱う
	if ($id_title > $level) {
		respond(403, ['ok'=>false,'error'=>'LEVEL_NOT_ENOUGH','message'=>'この称号は現在のレベルでは選べません']);
	}

	$sql = "UPDATE user
			SET id_title = :t 
			WHERE id_user = :u";
	$upd = $dbh->prepare($sql);
	$upd->execute([':t'=>$id_title, ':u'=>$id_user]);

	respond(200, [
		'ok'               => true,
		'message'          => 'title updated',
		'current_title_id' => $id_title,
		'title_name'       => $tRow['title_name'],
	]);

} catch (Throwable $e) {
	respond(500, ['ok'=>false,'error'=>'SERVER_ERROR','detail'=>$e->getMessage()]);
}
