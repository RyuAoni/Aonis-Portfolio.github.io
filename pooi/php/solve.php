<?php

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
$opt = "opt";
try {
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $opt = $opt . "データベースの接続に成功しました";
} catch (PDOException $e) {
    $opt = $opt . "データベースの接続に失敗しました";
}

if ($_SERVER['CONTENT_TYPE'] === 'application/json') {
    // POSTされたJSONを取得してデコード
    $json = file_get_contents('php://input');
    $data = json_decode($json, true); // trueで連想配列として取得

    //echo "a";

    if ($data) {
        // 取得したデータを使用する例
        $bin_id = $data['bin_id'] ?? null;
        //echo "b";

        // クライアントから送られているか確認
        if ($bin_id) {
            // クライアントから送られたものを変数に代入
            //$bin_id = (int) $data['bin_id'];
            //var_dump($_POST['bin_id']);
            $opt = $opt . "bin_id=" . $bin_id;
            $opt = $opt . "bin_id変数に代入しました";

            // SQLを実行
            $sql = "UPDATE bins SET bin_situation = 'ok' WHERE bin_id = :bin_id;";

            try {
                $stmt = $dbh->prepare($sql);
                $stmt->bindValue(':bin_id', $bin_id, PDO::PARAM_INT);
                $stmt->execute();
    
                // 成功時に成功メッセージを返す
                $opt = $opt . "sqlを実行しました";
            } catch (PDOException $e) {
                // エラーハンドリング（JSONで返す）
                $opt = $opt . "sqlが動きません";
            }
        }else {
            $opt = $opt . "bin_idがありません";
        }
    }else {
        $opt = $opt . "dataがない";
    }
}else {
    $opt = $opt . "足りない";
}
$response = [
    'error' => $stmt,
    'message' => $opt
];
$box = json_encode($response);
echo $box;
?>