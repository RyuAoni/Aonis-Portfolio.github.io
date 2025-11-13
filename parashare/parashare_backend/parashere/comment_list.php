<?php
// /var/www/html/parashere/comment_list.php
// コメントのリスト表示

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

$id_umbrella = isset($in['id_umbrella']) ? (int)$in['id_umbrella'] : 0;
if ($id_umbrella <= 0) {
	respond(400, ['ok'=>false,'error'=>'MISSING_UMBRELLA_ID']);
}

$sql = "SELECT
			c.id_comment,
			c.id_user,
			u.name
		AS
			user_name,
			c.comment,
			c.time
		FROM comment c
		LEFT JOIN user u
		ON u.id_user = c.id_user
		WHERE c.id_umbrella = :um
		ORDER BY c.time DESC
		LIMIT 100";
$st = $dbh->prepare($sql);
$st->execute([':um'=>$id_umbrella]);
$rows = $st->fetchAll(PDO::FETCH_ASSOC);

respond(200, ['ok'=>true,'items'=>$rows]);
