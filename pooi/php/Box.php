<?php
//どのゴミ箱にどの質問を設定するためのもの
//使用者 : スポンサー
//使用データベース : sponsor
//使用テーブル : x(user_id,bin_id),y(user_id,questionnaire_id)【新たに作成する必要がある。bin_questionnaireは消そうかと。久保田君に伝える】
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

//データベースに接続
try {
    $dbh = new PDO($dsn, $user_name, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    header('Error:'.$e->getMessage());
    exit();
}

//password、mailadressの変数宣言 pass,mail:string.null(文字列)
//型宣言は必要ない
//持ち合わせのuser_idを取得。持っていない場合問い合わせてもらう
if(!empty($_POST['user_id'])){
    $user_id = (int) $_POST['user_id'];

    //どの質問を用いるか選択。空欄のままだと「選択して」という
    if(!empty($_POST['questionnaire_id'])){
        $questionnaire_id = (int) $_POST['questionnaire_id'];

        $sql = "UPDATE user_questionnaire SET questionnaire_id = :questionnaire_id WHERE user_id = :user_id;";

        try {
            $stmt = $dbh->prepare($sql);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':questionnaire_id', $questionnaire_id);
            $stmt->execute();
    
            echo "ID" . $user_id . "番、質問ID" . $questionnaire_id . "に変更しました。";
        } catch (PDOException $e) {
            header('Error:'.$e->getMessage());
            $result['error'] = $e->getMessage();
            return $result;
        }
        

        
        
    } else {
        echo "空欄です。アンケートを選択してください。";
    }
} else {
    echo "問い合わせてください。";
}
    

//【追記】アカウント制作時に、login.loginのflagが1(スポンサー)である場合、sponsor.xのuser_idにもAUTO_INCREMENTで採番されたlogin.loginのuser_idを追加するものを作成する
?>