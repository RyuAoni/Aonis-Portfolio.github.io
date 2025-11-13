<?php
//pooiにログインするためのもの
//使用者 : 管理者、スポンサー
//使用データベース : login
//使用テーブル : login
//データベース変数宣言

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
$flag = 2;
$sensor = 0;

//クライアントから情報を取得
//pass、mailはクライアントの手入力
if (filter_input(INPUT_POST, 'mailadress') && filter_input(INPUT_POST, 'password')) {
    //クライアントから取得した情報を変数に代入
    $mailadress = (string) $_POST['mailadress'];
    $password = (string) $_POST['password'];

    //mail、passどちらも一致した場合user_idを取得
    $sql = "SELECT * FROM login WHERE mailadress = :mailadress;";
    
    try {
        $stmt = $dbh->prepare($sql);
        $stmt->bindParam(':mailadress', $mailadress);
        $stmt->execute();
        // 結果を取得
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        header('Error:'.$e->getMessage());
        $result['error'] = $e->getMessage();
        return $result;
    }

    // ユーザーが存在し、パスワードが一致するか確認
    if ($user && password_verify($password, $user['password'])) {
        $flag = $user['flag'];
        $id = $user['user_id'];
        $comment =  "flag =" . $flag . "ok";
        if($flag == 0){
            // ログイン成功、管理画面へ遷移する処理
            $comment = $comment . "ログイン成功！管理画面へ遷移します。";
            $sensor = 1;
        } elseif($flag == 1){
            // ログイン成功、管理画面へ遷移する処理
            $comment = $comment . "ログイン成功！スポンサー画面へ遷移します。";
            $sensor = 1;
        } else {
            $comment = $comment .  "管理者に問い合わせてください。";
        }
        
        // 例: header("Location: admin_dashboard.php");
    } else {
        //もし、pass、mailのどちらかに空欄がある場合「空欄があります」とコメントを返す
        // メールアドレスまたはパスワードが一致しない場合
        $comment =  "メールアドレスまたはパスワードが違います。";
    }
} else {
    //どちらか違う場合「メールアドレスまたはパスワードが違います」とコメントを返す
    // メールアドレスまたはパスワードが空欄の場合
    $comment =  "空欄があります。メールアドレスとパスワードを入力してください。";
    
}

if($sensor == 0){
    header("Location: ../pages_login/after_new_login.html?result=" . urlencode($comment));
} else if($sensor == 1){
    header("Location: ../pages_manager/manage.html?user_id=" . $id . urlencode($comment));
}
?>