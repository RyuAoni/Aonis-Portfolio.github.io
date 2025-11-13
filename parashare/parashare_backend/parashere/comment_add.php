<?php
// /var/www/html/parashere/comment_add.php
// コメントの追加

declare(strict_types=1);

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

$raw  = file_get_contents('php://input');
$in   = json_decode($raw, true);
if (!is_array($in)) $in = [];

$id_user     = isset($in['id_user']) ? (int)$in['id_user'] : 0;
$id_umbrella = isset($in['id_umbrella']) ? (int)$in['id_umbrella'] : 0;
$comment     = trim((string)($in['comment'] ?? ''));

if ($id_user <= 0 || $id_umbrella <= 0 || $comment === '') {
	respond(400, ['ok'=>false,'error'=>'MISSING_PARAMS']);
}
if (mb_strlen($comment) > 100) {
	respond(413, ['ok'=>false,'error'=>'COMMENT_TOO_LONG']);
}

// 傘が存在するかチェック
$sql = "SELECT 1
		FROM umbrella
		WHERE id_umbrella=:u
		LIMIT 1";
$chk = $dbh->prepare($sql);
$chk->execute([':u'=>$id_umbrella]);
if (!$chk->fetch()) {
	respond(404, ['ok'=>false,'error'=>'UMBRELLA_NOT_FOUND']);
}

$sql = "INSERT INTO comment (id_user,id_umbrella,comment,time)
		VALUES (:uid,:um,:c,NOW())";
$stmt = $dbh->prepare($sql);
$stmt->execute([':uid'=>$id_user, ':um'=>$id_umbrella, ':c'=>$comment]);

respond(200, ['ok'=>true,'message'=>'comment added','id_comment'=>$dbh->lastInsertId()]);
