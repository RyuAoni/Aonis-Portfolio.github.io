<?php
// /var/www/html/parashere/rank.php
// ランキング上位5名と自分の順位を取得

// データベースと接続
require_once 'db_connect.php';

header('Content-Type: application/json');

function respond(int $status, array $payload): void {
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

// id_userを取得
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

$id_user = isset($body['id_umbrella']) ? (int)$body['id_umbrella'] : null;

if (!$id_user) {
    http_response_code(400);
    echo json_encode(['ok'=>false, 'error'=>'傘のidがありません']);
    exit;
}

// userテーブルのm_pointの多い順5人のnameとid_titleを取得
$sql = "SELECT
            name,
            id_title,
            m_point
        FROM user
        ORDER BY m_point DESC
        LIMIT 5;";

// userテーブルからid_userの順位を取得
$sql_b = "SELECT
            name,
            id_title,
            m_point,
            user_rank
        FROM (
            SELECT
                name,
                id_title,
                m_point,
                RUNK()
            OVER (
                ORDER BY m_point DESC
            ) AS user_rank
            FROM user
        ) AS ranked_users
        WHERE id_user = :id_user;";

try {
    $stmt_first = $dbh->prepare($sql);
    $stmt_first->bindParam(':id_umbrella', $id_umbrella);
    $stmt_first->execute();
    $ranker = $stmt_first->fetchAll(PDO::FETCH_ASSOC);

    if (!$ranker) {
        $dbh->rollBack();
        respond(404, ['ok'=>false, 'error'=>'上位組が見当たりません']);
    }

    $stmt = $dbh->prepare($sql_b);
    $stmt->bindParam(':id_user', $id_user);
    $stmt->execute();
    // 結果を取得
    $my_ranker = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$my_ranker) {
        $dbh->rollBack();
        respond(404, ['ok'=>false, 'error'=>'あなたの情報が見当たりません']);
    }
    $ranker[] = $my_ranker;

    echo json_encode($ranker);
    respond(200, $ranker);

} catch (PDOException $e) {
    respond(500, ['error' => 'データベースエラー: ' . $e->getMessage()]);
}
