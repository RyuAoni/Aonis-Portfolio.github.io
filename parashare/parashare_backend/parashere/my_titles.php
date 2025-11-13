<?php
// /var/www/html/parashere/my_title.php
// 称号候補の取得
declare(strict_types=1);

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

$dbname = "parashare";
$db_password = "123456789";
$user_name = "IzumiSouta";
$host = "localhost";
$dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

function read_json(): array {
	$raw = file_get_contents('php://input');
	$b = json_decode($raw, true);
	if (!is_array($b)) respond(400, ['ok'=>false,'error'=>'INVALID_JSON']);
	return $b;
}

$in = read_json();
$id_user = isset($in['id_user']) ? (int)$in['id_user'] : 0;
if ($id_user <= 0) respond(400, ['ok'=>false,'error'=>'id_user is required']);

$sql = "SELECT
			level,
			id_title
		FROM user
		WHERE id_user=:u
		LIMIT 1";
$u = $dbh->prepare($sql);
$u->execute([':u'=>$id_user]);
$row = $u->fetch();
if (!$row) respond(404, ['ok'=>false,'error'=>'USER_NOT_FOUND']);
$level   = (int)$row['level'];
$current = isset($row['id_title']) ? (int)$row['id_title'] : null;

// id_title を必要レベルとして扱う運用
$sql = "SELECT
			id_title,
			title_name
		FROM title
		WHERE id_title <= :lv
		ORDER BY id_title ASC";
$st = $dbh->prepare($sql);
$st->execute([':lv'=>$level]);
$titles = [];
foreach ($st->fetchAll() as $r) {
	$titles[] = [
		'id_title'       => (int)$r['id_title'],
		'title_name'     => (string)$r['title_name'],
		'level_required' => (int)$r['id_title'],
	];
}

respond(200, ['ok'=>true, 'titles'=>$titles, 'current_title_id'=>($current && $current <= $level) ? $current : null]);

