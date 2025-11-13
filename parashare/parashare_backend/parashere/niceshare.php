<?php
// /var/www/html/parashere/niceshare.php
// ナイシェア送信 & ポイント加算

declare(strict_types=1);

require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Tokyo');

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 受信
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

// 必須パラメータ（数値に寄せる）
$id_umbrella  = isset($body['id_umbrella'])  ? (int)$body['id_umbrella']  : 0;
$id_history   = isset($body['id_history'])   ? (int)$body['id_history']   : 0;
$id_user_from = isset($body['id_user_from']) ? (int)$body['id_user_from'] : 0;

if ($id_umbrella <= 0 || $id_history <= 0 || $id_user_from <= 0) {
    respond(400, ['ok' => false, 'error' => '必要なパラメータが不足しています']);
}

try {
    $dbh->beginTransaction();

    // 二重送信チェック（同一履歴×同一送信者）
    $sql = "SELECT COUNT(*) FROM niceShare WHERE id_history = :hid AND id_user_from = :uid";
    $stmt_check = $dbh->prepare($sql);
    $stmt_check->execute([':hid' => $id_history, ':uid' => $id_user_from]);
    if ((int)$stmt_check->fetchColumn() > 0) {
        $dbh->rollBack();
        respond(409, ['ok' => false, 'error' => 'すでにナイシェア済みです']);
    }

    // 傘のオーナー & サブオーナー取得
    $sql = "SELECT owner FROM umbrella WHERE id_umbrella = :uid";
    $stmt_owner = $dbh->prepare($sql);
    $stmt_owner->execute([':uid' => $id_umbrella]);
    $id_owner = (int)$stmt_owner->fetchColumn();

    $sql = "SELECT id_user FROM umbrella_sub_owners WHERE id_umbrella = :uid";
    $stmt_sub = $dbh->prepare($sql);
    $stmt_sub->execute([':uid' => $id_umbrella]);
    $sub_owners = array_map('intval', $stmt_sub->fetchAll(PDO::FETCH_COLUMN));

    // ナイシェアの記録（これが成功したら付与する）
    $sql = "INSERT INTO niceShare (id_umbrella, id_history, id_user_from)
            VALUES (:umb_id, :hist_id, :user_id)";
    $stmt_log = $dbh->prepare($sql);
    $stmt_log->execute([
        ':umb_id'  => $id_umbrella,
        ':hist_id' => $id_history,
        ':user_id' => $id_user_from
    ]);

    // ユーザーへのポイント（Owner & SubOwner に +5）
    $points_to_add = 5;
    $sql = "UPDATE user SET point = point + :p WHERE id_user = :uid";
    $stmt_add_point = $dbh->prepare($sql);

    if ($id_owner > 0) {
        $stmt_add_point->execute([':p' => $points_to_add, ':uid' => $id_owner]);
    }
    foreach ($sub_owners as $sub_owner_id) {
        $stmt_add_point->execute([':p' => $points_to_add, ':uid' => $sub_owner_id]);
    }

    // 傘自体のポイントを +5（要件）
    $sql = "UPDATE umbrella
            SET point = COALESCE(point, 0) + 5
            WHERE id_umbrella = :uid";
    $stmt_umb = $dbh->prepare($sql);
    $stmt_umb->execute([':uid' => $id_umbrella]);

    $dbh->commit();

    // 成功レスポンス（余計な echo は出さない）
    respond(200, ['ok' => true, 'message' => 'ナイシェアが送信されました']);

} catch (Throwable $e) {
    if (isset($dbh) && $dbh->inTransaction()) {
        $dbh->rollBack();
    }
    respond(500, ['ok' => false, 'error' => 'サーバーエラーが発生しました', 'detail' => $e->getMessage()]);
}
