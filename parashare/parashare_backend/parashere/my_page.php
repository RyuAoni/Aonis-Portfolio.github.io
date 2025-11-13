<?php
// /var/www/html/parashere/my_page.php
// マイページの情報取得

declare(strict_types=1);

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}
function read_json(): array {
	$raw = file_get_contents('php://input');
	$body = json_decode($raw, true);
	if (!is_array($body)) respond(400, ['ok'=>false,'error'=>'INVALID_JSON']);
	return $body;
}

// 入力(JSONのみ)
$in = read_json();
$id_user = isset($in['id_user']) ? (int)$in['id_user'] : 0;
if ($id_user <= 0) respond(400, ['ok'=>false,'error'=>'id_user is required']);

// レベルしきい値（point基準）
$LEVEL_INCREMENTS = [10,100,150,250,400,500,600,700,800,1000];
$TITLES = [
	1=>'ハローパラシェア', 2=>'パラシェアひよっこ', 3=>'パラシェアビギナー', 4=>'パラシェア中級者',
	5=>'パラシェア一人前', 6=>'パラシェア玄人', 7=>'パラシェア名人', 8=>'パラシェア師範',
	9=>'パラシェア達人', 10=>'パラシェアマスター',
];

function compute_level_progress(int $point, array $incs): array {
	$level = 1; $remain = $point;
	foreach ($incs as $need) { if ($remain >= $need){ $level++; $remain -= $need; } else break; }
	$max = count($incs);
	$level = min($level, $max);
	if ($level >= $max) return [$level, 100];
	$needNext = $incs[$level];
	$progress = (int)round(max(0, min(1, $remain / $needNext)) * 100);
	return [$level, $progress];
}

// user.id_title（選択中の称号）も取得
$sql = "SELECT
			id_user,
			name,
			point,
			level,
			co,
			id_title
		FROM user
		WHERE id_user = :id
		LIMIT 1";
$st = $dbh->prepare($sql);
$st->execute([':id'=>$id_user]);
$u = $st->fetch();
if (!$u) respond(404, ['ok'=>false,'error'=>'USER_NOT_FOUND']);

$point   = (int)$u['point'];
$dbLevel = (int)$u['level'];
$coTotal = (int)$u['co'];
$chosen  = isset($u['id_title']) ? (int)$u['id_title'] : null;

// レベル再計算（point→level）
[$level, $progress] = compute_level_progress($point, $LEVEL_INCREMENTS);

// 差があれば同期（任意）
if ($dbLevel !== $level) {
	$sql = "UPDATE user
			SET level = :lv
			WHERE id_user = :id";
	$upd = $dbh->prepare($sql);
	$upd->execute([':lv'=>$level, ':id'=>$id_user]);
}

// 表示称号：user.id_title（自分で選んだ）が level 以下で存在 → それ、ダメなら level デフォルト
$titleName = null;
if ($chosen && $chosen > 0 && $chosen <= $level) {
	$sql = "SELECT title_name
			FROM title
			WHERE id_title = :t
			LIMIT 1";
	$q = $dbh->prepare($sql);
	$q->execute([':t'=>$chosen]);
	$r = $q->fetch();
	if ($r && $r['title_name'] !== '') $titleName = $r['title_name'];
}
if ($titleName === null) {
	$sql = "SELECT title_name
			FROM title
			WHERE id_title = :t
			LIMIT 1";
	$q = $dbh->prepare($sql);
	$q->execute([':t'=>$level]);
	$r = $q->fetch();
	$titleName = $r['title_name'] ?? ($TITLES[$level] ?? null);
}

respond(200, [
	'ok'=>true,
	'profile'=>[
		'id_user'=>(int)$u['id_user'],
		'name'=>(string)$u['name'],
		'level'=>$level,
		'level_progress'=>$progress,
		'co'=>$coTotal,
		'point'=>$point,
		'title_name'=>$titleName
	]
]);
