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

$vrst = "initial";

// ユーザーデータベースに接続
$dsn = "{$driver}:host={$host};port={$port};dbname={$dbname};charset={$charset}";
try {
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $vrst = $vrst . "データベース接続に成功しました";
} catch (PDOException $e) {
    $vrst = $vrst . "データベース接続に失敗しました";
    $vrst = $vrst . $e->getMessage();
    header('Error:'.$e->getMessage());
    exit();
}

//$url = "http://sample.com/jsondata.json";
//$json = file_get_contents($url);
//$json = mb_convert_encoding($json, 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
//$arr = json_decode($json,true);

$cost = 0;
$vost = 'opt';
$sect = 0;
$countSum = 0;
$count = 0;
$tadasi = 0;
$bos = 0;
$rest = 0;
$mess = 'aa';

if(!empty($_GET['mess'])){
    $mess = (int) $_GET['mess'];
}

// クライアントからスポンサーIDを取得
if(!empty($_GET['bin_id'])){
        $bin_id = (int) $_GET['bin_id'];
        /*
        if($bin_id == 2){
            $bin_id = 43;
        }
        $sql = "SELECT vote_id,SUM(vote_dis) as vote_count FROM votes WHERE bin_id = :bin_id GROUP BY vote_id;";

    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':bin_id', $bin_id, PDO::PARAM_INT);
        $stmt->execute();
        $voteResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 結果を格納するための配列を初期化
        $vote_array = [];

        // 投票結果を表示
        foreach ($voteResults as $vote) {
            $cost++;
            $countSum += $vote['vote_count'];
            // 配列にvote_idとvote_countを追加

            $vote_array[] = [
                'id' => $vote['vote_id'],
                'name' => $vost,
                'color' => $vost,
                'percent' => $vote['vote_count']
            ];
        }
        //$echo = $countSum;
        $tadasi = 1;

    } catch (PDOException $e) {
        header('Error:'.$e->getMessage());
        $vrst = $vrst . "エラー: " . $e->getMessage();
        $rest = 1;
    }
    
    if($tadasi == 1){
        $sql = "SELECT vote_id,COUNT(*) as vote_count FROM votes WHERE bin_id = :bin_id AND vote_dis = 3 GROUP BY vote_id;";

        try {
            $stmt = $dbh->prepare($sql);
            $stmt->bindParam(':bin_id', $bin_id, PDO::PARAM_INT);
            $stmt->execute();
            $voteResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 結果を格納するための配列を初期化
            $vote_array_count = [];

            // 投票結果を表示
            foreach ($voteResults as $vote) {
                $count += $vote['vote_count'];
                // 配列にvote_idとvote_countを追加

                $vote_array_count[] = [
                    'vote_id' => $vote['vote_id'],
                    'vote_count' => $vote['vote_count']
                ];
            }
            //echo $count;
            $countSum -= $count;
            //echo $countSum;
            $just = json_encode($vote_array_count);
            //echo $just;

            foreach ($vote_array as &$vote) {
                foreach ($vote_array_count as &$voice) {
                    // vote_id が 1 の場合、vote_count を 5 に変更
                    if ($vote['id'] == $voice['vote_id']) {
                        $vote['percent'] -= $voice['vote_count'];
                    }
                }
            }

            foreach($vote_array as &$vote) {
                $bos = $vote['percent'] / $countSum * 100;
                $vote['percent'] = round($bos);
                //echo $vote['percent'] . "<br>";
            }

        } catch (PDOException $e) {
            header('Error:'.$e->getMessage());
            $vrst = $vrst . "エラー: " . $e->getMessage();
            $rest = 1;
        }
    }
    */

    $sql = "SELECT * FROM bin_user WHERE bin_id = :bin_id;";
    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':bin_id', $bin_id);
        $stmt->execute();
        // 結果を取得
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // もし結果が見つからなければエラー表示
        if (!$result) {
            $vrst = $vrst . "スポンサーIDが見つかりませんでした。";
            $rest = 1;
        }

        // user_id を取得して保持
        $user_id = $result['user_id'];
    } catch (PDOException $e) {
        header('Error:'.$e->getMessage());
        $result['error'] = $e->getMessage();
        $vrst = $vrst . $e->getMessage();
        $rest = 1;
    }

    $sql = "SELECT * FROM user_questionnaire WHERE user_id = :user_id;";
    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        // 結果を取得
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // もし結果が見つからなければエラー表示
        if (!$result) {
            $vrst = $vrst . "質問IDが見つかりませんでした。";
            $rest = 1;
        }

        // questionnaire_id を取得して保持
        $questionnaire_id = $result['questionnaire_id'];
    } catch (PDOException $e) {
        header('Error:'.$e->getMessage());
        $result['error'] = $e->getMessage();
        $rest = 1;
        $vrst = $vrst . $e->getMessage();
    }
} else {
    $vrst = $vrst . "bin_idが取得できていません。問い合わせてください";
}


if (!empty($questionnaire_id)) {

    $sql = "SELECT vote_id,SUM(vote_dis) as vote_count FROM votes WHERE bin_id = :bin_id AND questionnaire_id = :questionnaire_id GROUP BY vote_id;";

    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':bin_id', $bin_id, PDO::PARAM_INT);
        $stmt->bindParam(':questionnaire_id', $questionnaire_id, PDO::PARAM_INT);
        $stmt->execute();
        $voteResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 結果を格納するための配列を初期化
        $vote_array = [];

        // 投票結果を表示
        foreach ($voteResults as $vote) {
            $cost++;
            $countSum += $vote['vote_count'];
            // 配列にvote_idとvote_countを追加

            $vote_array[] = [
                'id' => $vote['vote_id'],
                'name' => $vost,
                'color' => $vost,
                'percent' => $vote['vote_count']
            ];

            $count_array[] = [
                'dammy' => $cost,
                'count' => $vote['vote_count']
            ];
        }
        //$echo = $countSum;
        $tadasi = 1;

    } catch (PDOException $e) {
        header('Error:'.$e->getMessage());
        $vrst = $vrst . "エラー: " . $e->getMessage();
        $rest = 1;
    }
    
    if($tadasi == 1){
        $sql = "SELECT vote_id,COUNT(*) as vote_count FROM votes WHERE bin_id = :bin_id AND questionnaire_id = :questionnaire_id AND vote_dis = 3 GROUP BY vote_id;";

        try {
            $stmt = $dbh->prepare($sql);
            $stmt->bindParam(':bin_id', $bin_id, PDO::PARAM_INT);
            $stmt->bindParam(':questionnaire_id', $questionnaire_id, PDO::PARAM_INT);
            $stmt->execute();
            $voteResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 結果を格納するための配列を初期化
            $vote_array_count = [];

            // 投票結果を表示
            foreach ($voteResults as $vote) {
                $count += $vote['vote_count'];
                // 配列にvote_idとvote_countを追加

                $vote_array_count[] = [
                    'vote_id' => $vote['vote_id'],
                    'vote_count' => $vote['vote_count']
                ];
            }
            //echo $count;
            $countSum -= $count;
            //echo $countSum;
            $just = json_encode($vote_array_count);
            //echo $just;

            foreach ($vote_array as &$vote) {
                foreach ($vote_array_count as &$voice) {
                    // vote_id が 1 の場合、vote_count を 5 に変更
                    if ($vote['id'] == $voice['vote_id']) {
                        $vote['percent'] -= $voice['vote_count'];
                    }
                }
            }

            foreach($vote_array as &$vote) {
                $bos = $vote['percent'] / $countSum * 100;
                $vote['percent'] = round($bos);
                //echo $vote['percent'] . "<br>";
            }

        } catch (PDOException $e) {
            header('Error:'.$e->getMessage());
            $vrst = $vrst . "エラー: " . $e->getMessage();
            $rest = 1;
        }
    }


    $sql = "SELECT * FROM questionnaire WHERE questionnaire_id = :questionnaire_id;";
    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':questionnaire_id', $questionnaire_id, PDO::PARAM_INT);
        $stmt->execute();
        // 結果を取得
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // もし結果が見つからなければエラー表示
        if (!$result) {
            $vrst = $vrst . "質問が見つかりませんでした。";
            $rest = 1;
        }

        // questionnaire_id を取得して保持
        $questionnaire_title = $result['questionnaire_title'];
        $sect = 1;
    } catch (PDOException $e) {
        header('Error:'.$e->getMessage());
        $result['error'] = $e->getMessage();
        $rest = 1;
        $vrst = $vrst . "質問IDがないです";
    }

    if($sect == 1){
        for($i = 1; $i <= $cost; $i++){
            $sql = "SELECT * FROM choice WHERE questionnaire_id = :questionnaire_id AND choice_id = :choice_id";
            try {
                $stmt = $dbh->prepare($sql);
                $stmt->bindParam(':questionnaire_id', $questionnaire_id, PDO::PARAM_INT);
                $stmt->bindParam(':choice_id', $i, PDO::PARAM_INT);
                $stmt->execute();
                // 結果を取得
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                // 出力をバッファリングしてキャプチャ
                ob_start();
                $stmt->debugDumpParams();
                $output = ob_get_clean(); // バッファの内容を取得し、バッファをクリア
        
                // もし結果が見つからなければエラー表示
                if (!$result) {
                    $vrst = $vrst . "選択肢が見つかりませんでした。" . $output . " " . $cost . " " . $i;
                    $rest = 1;
                }
        
                // questionnaire_id を取得して保持
                $choice_name = $result['choice_name'];
                $sect = 1;
                foreach ($vote_array as &$vote) {
                    // vote_id が 1 の場合、vote_count を 5 に変更
                    if ($i == $vote['id']) {
                        $vote['name'] = $choice_name;
                        if($i == 1){
                            //$vote['color'] = "#f3a68c";
                            $vote['color'] = "#FF5900";
                        } else if($i == 2){
                            //$vote['color'] = "#043c78";
                            $vote['color'] = "#1e00ff";
                        } else if($i == 3){
                            $vote['color'] = "#15792f";
                        }
                    }
                    $vote['question'] = $questionnaire_title;
                }
            } catch (PDOException $e) {
                header('Error:'.$e->getMessage());
                $result['error'] = $e->getMessage();
                $vrst = $vrst . $result;
                $rest = 1;
            }
        }
    } else {
        $vrst = $vrst . "gest";
        $rest = 1;
    }
} else{
    $vrst = $vrst . "questionnaire_IDが取得できていません。問い合わせてください。";
    $rest = 1;
}

$response = [
    "mess" => $mess,
    "error" => $vrst,
    "choices" => $vote_array,
    "msg" => "ok",
    "question" => $questionnaire_title,
    "count" => $count_array
];

if($rest == 1){
    $jsonstr = json_encode(['error' => $vrst]);
}else{
    $jsonstr = json_encode($response);
}

header('Content-Type: application/json');
echo $jsonstr;
//print_r($vote_array);
?>