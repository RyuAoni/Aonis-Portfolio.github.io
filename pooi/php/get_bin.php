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

$vmw = "opt";
$abc = 0;
$def = "anc";
$tadasi = 0;

try {
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $vmw = $vmw . "データベースの接続に成功しました";
} catch (PDOException $e) {
    $vmw = $vmw . "データベースの接続に失敗しました";
}

// クライアントから bin_id が送られているか確認
if (filter_input(INPUT_GET, 'user_id')) {
    // クライアントから送られた bin_id を変数に代入
    $user_id = (int) $_GET['user_id'];





    //echo "a";





    // SQLを実行して、bin_id に基づいてデータを取得
    $sql = "SELECT bin_id, bin_name, bin_adress, bin_photo, adress_latitude, adress_longitude, bin_situation, photo_time FROM bins WHERE user_id = :user_id";
    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        // データを取得
        $binResults = $stmt->fetchAll(PDO::FETCH_ASSOC);



        //echo "b";




        if (!$binResults) {
            $vmw = $vmw . "sqlの結果が空でした";
            //echo $vmw;
        }

        // 結果を格納するための配列を初期化
        $bin = [];
        //echo "c";

        // 投票結果を表示
        foreach ($binResults as $vote) {
            // 配列にvote_idとvote_countを追加

            $bin[] = [
                'id' => $vote['bin_id'],
                'name' => $vote['bin_name'],
                'time' => $vote['photo_time'],
                'place' => $vote['bin_adress'],
                'imageSrc' => $vote['bin_photo'],
                'status' => $vote['bin_situation'],
                'lat' => $vote['adress_latitude'],
                'lng' => $vote['adress_longitude']
            ];
            //echo "d";
        }

        //$tadasi = 1;

        //echo "e" . $tadasi;

    } catch (PDOException $e) {
        $vmw = $vmw . "sqlか何かに間違いがあります";
        //echo $vmw;
    }
    //echo $tadasi;
} else {
    $vmw = $vmw . "user_idが取得できていません";
}

// 取得したデータをJSON形式で返す
$response = [
    'bin' => $bin,
    'message' => $vmw
];
$box = json_encode($response);
echo $box;
//print_r($box);
?>