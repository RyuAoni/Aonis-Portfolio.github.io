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

// スポンサーデータベースに接続
$dsn = "{$driver}:host={$host};port={$port};dbname={$dbname};charset={$charset}";
try {
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    header('Error:'.$e->getMessage());
    exit();
}

$cost = 0;
$vost = 'opt';
$sect = 0;
$countSum = 0;
$count = 0;
$tadasi = 0;

// クライアントからスポンサーIDを取得
if(!empty($_POST['user_id'])){
    if(!empty($_POST['filter_number'])){
        $filter_number = (int) $_POST['filter_number'];
        $user_id = (int) $_POST['user_id'];

    // スポンサーIDを用いて使用されている質問IDを取得
        $sql = "SELECT * FROM user_questionnaire WHERE user_id = :user_id;";
        try {
            $stmt = $dbh->prepare($sql);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            // もし結果が見つからなければエラー表示
            if (!$result) {
                echo "質問が見つかりませんでした。";
                exit();
            }

            // questionnaire_id を取得して保持
            $questionnaire_id = $result['questionnaire_id'];
            echo "質問ID: " . $questionnaire_id . "<br>";

        } catch (PDOException $e) {
            header('Error:'.$e->getMessage());
            echo $e->getMessage();
            exit();
        }
    } else {
        echo "フィルターがうまくできていません。問い合わせてください。";
    }
} else {
    echo "idが取得できていません。問い合わせてください";
}


// votes テーブルから特定の questionnaire_id の解答を調査
if (!empty($questionnaire_id)) {
    if($filter_number == 1){
        $sql = "SELECT vote_id,SUM(vote_dis) as vote_count FROM votes WHERE questionnaire_id = :questionnaire_id GROUP BY vote_id;";
    } elseif($filter_number == 2){
        $sql = "SELECT vote_id,COUNT(*) as vote_count FROM votes WHERE questionnaire_id = :questionnaire_id AND custom_consumer = 1 GROUP BY vote_id;";
    } else {
        echo "問い合わせてください。";
    }

    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':questionnaire_id', $questionnaire_id);
        $stmt->execute();
        $voteResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 結果を格納するための配列を初期化
        $vote_array = [];

        // 投票結果を表示
        foreach ($voteResults as $vote) {
            $cost++;
            echo "選択肢ID: " . $vote['vote_id'] . " - 投票数: " . $vote['vote_count'] . "<br>";
            $vote_array[] = [
                'question' => $vost,
                'vote_name' => $vost,
                'vote_id' => $vote['vote_id'],
                'vote_count' => $vote['vote_count']
            ];
        }
        $tadasi = 1;

    } catch (PDOException $e) {
        header('Error:'.$e->getMessage());
        echo $e->getMessage();
        exit();
    }

    if($tadasi == 1 && $filter_number == 1){
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
            echo $count;
            $countSum -= $count;
            echo $countSum;
            $just = json_encode($vote_array_count);
            echo $just;

            foreach ($vote_array as &$vote) {
                foreach ($vote_array_count as &$voice) {
                    // vote_id が 1 の場合、vote_count を 5 に変更
                    if ($vote['vote_id'] == $voice['vote_id']) {
                        $vote['vote_count'] -= $voice['vote_count'];
                    }
                }
            }

        } catch (PDOException $e) {
            header('Error:'.$e->getMessage());
            //echo "エラー: " . $e->getMessage();
            exit();
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
            echo "質問が見つかりませんでした。";
            exit();
        }

        // questionnaire_id を取得して保持
        $questionnaire_title = $result['questionnaire_title'];
        $sect = 1;
    } catch (PDOException $e) {
        header('Error:'.$e->getMessage());
        $result['error'] = $e->getMessage();
        return $result;
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
        
                // もし結果が見つからなければエラー表示
                if (!$result) {
                    echo "選択肢が見つかりませんでした。";
                    exit();
                }
        
                // questionnaire_id を取得して保持
                $choice_name = $result['choice_name'];
                $sect = 1;
                foreach ($vote_array as &$vote) {
                    // vote_id が 1 の場合、vote_count を 5 に変更
                    if ($i == $vote['vote_id']) {
                        $vote['vote_name'] = $choice_name;
                    }
                    $vote['question'] = $questionnaire_title;
                }
            } catch (PDOException $e) {
                header('Error:'.$e->getMessage());
                $result['error'] = $e->getMessage();
                echo $result;
                return $result;
            }
        }
        print_r($vote_array);
        
        //配列をJSON形式に変換
        $jsonstr = json_encode($vote_array);
        
        echo "<br>";

        echo $jsonstr;
    } else {
        echo "gest";
    }
} else {
    echo "有効な質問IDがありません。";
}

?>
