<?php
// /var/www/html/parashere/pre_borrow.php
// 傘の詳細
// QRで傘を特定
// QRからumbrellaの情報、userの名前を取得して返す
// 使用テーブル：share, umbrella
// 使用データベース：parashere

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// 入力
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)){
	$body = [];
}

$qr_address=null;
$qr_address = isset($_GET['qr_address']) ? trim($_GET['qr_address'])
	: (isset($body['qr_address']) ? trim($body['qr_address']) : '');

if ($qr_address === '') {
	respond(400, ['ok'=>false, 'error'=>'qr_address がありません']);
}

try {
	// umbrella から傘を検索
	$sql = "SELECT
				id_umbrella,
				name_umbrella,
				id_user,
				status,
				message
			FROM umbrella
			WHERE qr_adress = :qr
			LIMIT 1";
	$st = $dbh->prepare($sql);
	$st->execute([':qr'=>$qr_address]);
	$umbrella = $st->fetch();

	if (!$umbrella) {
		respond(404, ['ok'=>false, 'error'=>'このQRは登録された旅傘ではありません']);
	}

	// user テーブルから作成者の名前を取得
	/*$maker_name = null;
	if (!empty($umbrella['id_user'])) {
		$sql2 = "SELECT name
				FROM user
				WHERE id_user = :id_user
				LIMIT 1";
		$st2 = $dbh->prepare($sql2);
		$st2->execute([':id_user'=>$umbrella['id_user']]);
		$userRow = $st2->fetch();
		if ($userRow) {
			$maker_name = $userRow['name'];
		}
	}*/

	respond(200, [
		'ok'	 => true,
		'item' => [
			'id_umbrella'   => (int)$umbrella['id_umbrella'],
			'name_umbrella' => $umbrella['name_umbrella'],
			'id_user'       => (int)$umbrella['id_user'],
			'status'        => (int)$umbrella['status'],
			'message'       => $umbrella['message']
			//'maker_name'    => $maker_name   // null の可能性あり
		]
	]);
} catch (PDOException $e) {
	respond(500, ['ok'=>false, 'error'=>$e->getMessage()]);
}
