<?php
error_reporting(E_ALL);
ini_set("display_errors", 1);

// EnvSet.phpをインクルード
include_once 'EnvSet.php';

// 環境変数からデータベース情報を取得
$driver = $_ENV['DB_DRIVER'];
$host = $_ENV['DB_HOST'];
$port = $_ENV['DB_PORT'];
$dbname = $_ENV['DB_NAME'];
$charset = $_ENV['DB_CHARSET'];
$db_password = $_ENV['PARKING_AREA']; // password
$user_name = $_ENV['USER_NAME'];
$dsn = "{$driver}:host={$host};port={$port};dbname={$dbname};charset={$charset}";
try {
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $vrst = "データベース接続に成功しました";
} catch (PDOException $e) {
    $vrst = "データベース接続に失敗しました";
    $vrst = $e->getMessage();
    header('Error:'.$e->getMessage());
    exit();
}
//$dsn = "{$driver}:host={$host};port={$port};dbname={$dbname};charset={$charset}";
//try {
    //$dbh = new PDO($dsn, $user_name, $db_password, [
        //PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    //]);
//} catch (PDOException $e) {
    // JSONでエラーを返す
    //http_response_code(500);
    //$jsonstr = json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
//}

$best = 0;
$custom_consumer = 1;

// クライアントから送られているか確認
if (filter_input(INPUT_POST, 'bin_id') && filter_input(INPUT_POST, 'vote_id') && filter_input(INPUT_POST, 'vote_dis')) {
    // クライアントから送られたものを変数に代入
    $photo_url = !empty($_POST['photo_url']) ? (string) $_POST['photo_url'] : null; // photo_urlが空ならnullにする
    $bin_situation = !empty($_POST['bin_situation']) ? (int) $_POST['bin_situation'] : 0;
    $bin_id = (int) $_POST['bin_id'];
    //$questionnaire_id = (int) $_POST['questionnaire_id'];
    $vote_id = (int) $_POST['vote_id'];
    $vote_dis = (int) $_POST['vote_dis'];

    $best = 1;
} else {
    // 不足しているパラメータがある場合は400エラーを返す
    http_response_code(400);
    $jsonstr = json_encode(['error' => 'Missing required fields']);
}

if($best == 1){
    $sql = "SELECT * FROM bin_user WHERE bin_id = :bin_id;";
    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':bin_id', $bin_id, PDO::PARAM_INT);
        $stmt->execute();
        // 結果を取得
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // もし結果が見つからなければエラー表示
        if (!$result) {
            $vrst = "ユーザーが見つかりませんでした。";
            $jsonstr = json_encode($vrst);
        }

        // user_id を取得して保持
        $user_id = $result['user_id'];
    } catch (PDOException $e) {
        $result['error'] = $e->getMessage();
        $jsonstr = json_encode($e->getMessage());
    }

    if (!empty($user_id)) {
        $sql = "SELECT * FROM user_questionnaire WHERE user_id = :user_id;";
        try {
            $stmt = $dbh->prepare($sql);
            $stmt->bindParam(':user_id', $uer_id, PDO::PARAM_INT);
            $stmt->execute();
            // 結果を取得
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
            // もし結果が見つからなければエラー表示
            if (!$result) {
                $vrst = "質問IDが見つかりませんでした。";
                $jsonstr = json_encode($vrst);
            }
    
            // questionnaire_id を取得して保持
            $questionnaire_id = $result['questionnaire_id'];
        } catch (PDOException $e) {
            $result['error'] = $e->getMessage();
            $vrst = $e->getMessage();
            $jsonstr = json_encode($vrst);
        }
    }

    // SQLを実行
    $sql = "INSERT INTO votes(photo_url, bin_situation, bin_id, questionnaire_id, vote_id, vote_dis, custom_consumer) VALUES(:photo_url, :bin_situation, :bin_id, :questionnaire_id, :vote_id, :vote_dis, :custom_consumer);";

    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindValue(':photo_url', $photo_url, $photo_url !== null ? PDO::PARAM_STR : PDO::PARAM_NULL); // photo_urlがnullならPARAM_NULLを使う
        $stmt->bindValue(':bin_situation', $bin_situation, PDO::PARAM_INT);
        $stmt->bindValue(':bin_id', $bin_id, PDO::PARAM_INT);
        $stmt->bindValue(':questionnaire_id', $questionnaire_id, PDO::PARAM_INT);
        $stmt->bindValue(':vote_id', $vote_id, PDO::PARAM_INT);
        $stmt->bindValue(':vote_dis', $vote_dis, PDO::PARAM_INT);
        $stmt->bindValue(':custom_consumer', $custom_consumer, PDO::PARAM_INT);
        $stmt->execute();
    
        // 成功時に成功メッセージを返す
        $result = ['result' => true];
        $jsonstr = json_encode($result);
    } catch (PDOException $e) {
        // エラーハンドリング（JSONで返す）
        http_response_code(500);
        $jsonstr = json_encode(['error' => 'Insert failed: ' . $e->getMessage()]);
    }
}

echo $jsonstr;

?>