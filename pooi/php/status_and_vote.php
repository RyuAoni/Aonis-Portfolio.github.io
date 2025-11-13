<?php
/*
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
*/
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

$best = 0;
$custom_consumer = 1;
$bin_situation = null;
$photo_url = null;

if ($_SERVER['CONTENT_TYPE'] === 'application/json') {
    // POSTされたJSONを取得してデコード
    $json = file_get_contents('php://input');
    $data = json_decode($json, true); // trueで連想配列として取得

    if ($data) {
        // 取得したデータを使用する例
        $bin_id = $data['bin_id'] ?? null;
        $vote_id = $data['vote_id'] ?? null;
        $vote_dis = $data['vote_dis'] ?? null;
        $bin_situation = $data['bin_situation'] ?? null;
        $photo_url = $data['photo_url'] ?? null;
        $photo = $data['photo'] ?? null;

        $vrst = $vrst . "bin_situation = " . $bin_situation;
        $best = 4;

        
        // Base64 データをファイルに変換して保存
        if ($photo && $photo_url) {
            $uploadDir = '../uploads/';
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0755, true)) {
                    $vrst = $vrst . "ディレクトリの作成に失敗しました";
                } else {
                    $vrst = $vrst . "ディレクトリの作成に成功しました";
                }
            } else {
                $vrst = $vrst . "uploadディレクトリはあります";
            }

            if (!$photo) {
                $vrst = $vrst . "Base64 データが空です";
            } else {
                $vrst = $vrst . "Base64 データあります";
            }

            
            // Base64 データをデコード
            $decodedImage = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $photo));
            if ($decodedImage === false) {
                $vrst = $vrst . "Base64 デコードに失敗しました";
            } else {
                $vrst = $vrst . "Base64 でコードに成功しました";
            }

            if (!$photo_url || preg_match('/[<>:"\/\\|?*\x00-\x1F]/', $photo_url)) {
                $vrst = $vrst . "不正なファイル名です: " . $photo_url;
            } else {
                $vrst = $vrst . "ファイル名は正しいです";
            }

            // ファイルを保存
            $filePath = $uploadDir . $photo_url;
            if (file_put_contents($filePath, $decodedImage)) {
                $vrst = $vrst . "画像保存に成功しました";
            } else {
                $vrst = $vrst . "画像保存に失敗しました";
                $best = 0;
            }
                
        } else {
            $vrst = $vrst . "画像データはないです。";
        }
            

        // クライアントから送られているか確認
        if ($bin_id && $vote_id && $vote_dis && $best == 4) {
            $best = 1;
        } else {
            $vrst = $vrst . "空のパラメータがあります" . $bin_id . " " . $vote_id . " " . $vote_dis;
        }
    } else {
        $vrst = $vrst . "dataがないです";
    }
} else {
    $vrst = $vrst . "無効なリクエストです";
}


if($best == 1) {
    $sql = "SELECT * FROM bin_user WHERE bin_id = :bin_id;";
    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':bin_id', $bin_id, PDO::PARAM_INT);
        $stmt->execute();
        // 結果を取得
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // もし結果が見つからなければエラー表示
        if (!$result) {
            $vrst = $vrst . "ユーザーが見つかりませんでした。";
        }

        // user_id を取得して保持
        $user_id = $result['user_id'];
        $vrst = $vrst . "user_idを取得しました";
    } catch (PDOException $e) {
        $vrst = $vrst . "user_id取得について何かエラーがあります";
    }

    if (!empty($user_id)) {
        $sql = "SELECT * FROM user_questionnaire WHERE user_id = :user_id;";
        try {
            $stmt = $dbh->prepare($sql);
            $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->execute();
            // 結果を取得
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
            // もし結果が見つからなければエラー表示
            if (!$result) {
                $vrst = $vrst . "質問IDが見つかりませんでした。";
            }
    
            // questionnaire_id を取得して保持
            $questionnaire_id = $result['questionnaire_id'];
            $vrst = $vrst . "質問IDを取得しました";
        } catch (PDOException $e) {
            $vrst = $vrst . "質問IDについてエラーが起こりました";
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
        $resu = ['result' => true];
        $vrst = $vrst . "レコードの追加に成功しました";
        $best = 2;
    } catch (PDOException $e) {
        $vrst = $vrst . "レコードの追加に失敗しました";
    }
    
    if($best == 2){
        // SQLを実行
        $sql = "UPDATE bins SET bin_situation = :bin_situation WHERE bin_id = :bin_id;";

        try {
            $stmt = $dbh->prepare($sql);
            $stmt->bindValue(':bin_id', $bin_id, PDO::PARAM_INT);
            $stmt->bindValue(':bin_situation', $bin_situation, PDO::PARAM_STR);
            $stmt->execute();

            // 成功時に成功メッセージを返す
            $vrst = $vrst . "sqlを実行しました";
            $best = 3;
        } catch (PDOException $e) {
            // エラーハンドリング（JSONで返す）
            $vrst = $vrst . "sqlが動きません" . $e . "bin_situation = " . $bin_situation;
        }
    }
}

if($best == 3){
    header("Location: ./ShowAncUser.php?bin_id=" . urlencode($bin_id) . "mess=" . urlencode($vrst));
} else {
    //$vrst = "にほんご";

    
    // 配列を定義
    $printarray = array(
        array("abc" => $vrst)
    );

    // 配列をオブジェクトで包む
    $wrappedObject = array(
        "data" => $printarray
    );
    

    /*
    $wrappedObject = [
        "error" => $vrst,
        "best" => $best
    ];
    */

    // オブジェクトをJSONに変換
    $jsonstr = json_encode($wrappedObject);

    // JSONを出力
    //header('Content-Type: application/json');
    echo $jsonstr;
}

?>