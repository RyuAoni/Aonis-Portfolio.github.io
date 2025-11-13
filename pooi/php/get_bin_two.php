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
//echo "l";

try {
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $vmw = $vmw . "データベースの接続に成功しました";
    //echo "o";
} catch (PDOException $e) {
    $vmw = $vmw . "データベースの接続に失敗しました";
    //echo "s";
}
//echo "m";

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
            $vmw = $vmw . "bin_id=" . $bin_id;
            //echo $bin_id;

            // SQLを実行して、bin_id に基づいてデータを取得
            $sql = "SELECT photo_time, photo_url FROM votes WHERE bin_id = :bin_id AND photo_url NOT LIKE '%noname%' AND photo_url NOT LIKE '%null%' AND photo_url NOT LIKE '%../imgs/tras%' ORDER BY photo_id DESC";
            try {
                $stmt = $dbh->prepare($sql);
                $stmt->bindValue(':bin_id', $bin_id, PDO::PARAM_INT);
                $stmt->execute();
        
                // データを取得
                $binResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
                //echo "e";


        
                if (!$binResults) {
                    $vmw = $vmw . "sqlの結果が空でした";
                    //echo "d";
                }

                $bin = [];
                //echo "c";

                // 投票結果を表示
                foreach ($binResults as $vote) {
                    // 配列にvote_idとvote_countを追加

                    $bin[] = [
                        'time' => $vote['photo_time'],
                        'image' => "../uploads/" . $vote['photo_url']
                    ];
                    //echo "f";
                }


                //echo "g";
                $vmw = $vmw . "bin_idを取得しました";

            } catch (PDOException $e) {
                $vmw = $vmw . "bin_idが取得できていません";
                //echo "h";
            }
        }else {
            //echo "j;"
        }
    }else {
        //echo "k";
    }
} else {
    $vmw = $vmw . "空のパラメータがあります" . $bin_id;
    //echo "n";
}

// 取得したデータをJSON形式で返す
$response = [
    'bin' => $bin,
    'message' => $vmw
];
echo json_encode($response);
?>