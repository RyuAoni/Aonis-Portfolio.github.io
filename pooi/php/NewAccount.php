<?php

    //使用データベース : login
    //使用テーブル : login
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

    //password、mailadress、flagの変数宣言 pass,mail:string.null(文字列) flag:int.2
    //型宣言は必要ない
    $flag = 2;
    $judgement = 0;
    $sensor = 0;

    //クライアントから情報を取得
    if(filter_input(INPUT_POST, 'mailadress') && filter_input(INPUT_POST, 'password')) {
        //pass、mailはクライアントの手入力、flagは飛んできたurlにより判別
        //クライアントから取得した情報を変数に代入
        $mailadress = (string) $_POST['mailadress'];
        $password = (string) $_POST['password'];

        if(filter_input(INPUT_POST, 'confirm-password')) {
            $confirmPassword = (string) $_POST['confirm-password'];

            if($password == $confirmPassword) {
                //mailadressが存在しているかチェック
                $sql = "SELECT * FROM login WHERE mailadress = :mailadress;";
    
                try {
                    $stmt = $dbh->prepare($sql);
                    $stmt->bindParam(':mailadress', $mailadress);
                    $stmt->execute();
                    $user = $stmt->fetch(PDO::FETCH_ASSOC);
                } catch (PDOException $e) {
                    header('Error:'.$e->getMessage());
                    $result['error'] = $e->getMessage();
                    return $result;
                }

                //無かったら
                if(!$user){
                    //passwordに使用されている文字は指定の範囲内か
                    //範囲内だったら
                    if (preg_match("/^[a-z0-9_]{8,16}$/i", $password)) {
                        if(isset($_POST['flag'])){
                            $flag = (int) $_POST['flag'];
        
                            // もしflagが2のままの場合
                            if ($flag == 2) {
                                // 「もう一度QRコードを読み込んでください」とコメントを返す
                                $comment = "もう一度QRコードを読み込みなおしてください。";
                            } elseif ($flag == 0) {
                                $comment = "あなたはオーナーです。";
                                $judgement = 1;
                            } elseif ($flag == 1) {
                                $comment = "あなたはスポンサーです。";
                                $judgement = 1;
                            } else {
                                $comment = "error/問い合わせてください。";
                            }
                        } else {
                            $comment = "error/問い合わせてください。";
                        }
                    
                    
                    //範囲外だったら
                    } else {
                        //もし、passに使用できない記号などを使用していた場合「このパスワードは使用できません」とコメントを返す
                        $comment = "このパスワードは使用できません。";
                    }
                } else {
                    //もし、mailがかぶっている場合「このメールアドレスは既に使用されています」とコメントを返す
                    $comment = "このメールアドレスは既に使用されています。";
                }
            } else {
                $comment = "パスワードが一致していません";
            }
        } else {
            $comment = "パスワードが未入力です";
        }

        //もし、pass、mailのどちらかに空欄がある場合「空欄があります」とコメントを返す
    } else {
        $comment = "空欄があります。";
    }

    //mail、passどちらも一致した場合書き込んでuser_idを取得
    if($judgement == 1){
        $hashed_password = password_hash($password, PASSWORD_DEFAULT); // パスワードをハッシュ化

        $sql = "INSERT INTO login(mailadress, password, flag)VALUES(:mailadress, :password, :flag);";
    
        try {
            $stmt = $dbh->prepare($sql);
            $stmt->bindParam(':mailadress', $mailadress);
            $stmt->bindParam(':password', $hashed_password);  // ハッシュ化されたパスワードを変数に保存して渡す
            $stmt->bindParam(':flag', $flag);
            $stmt->execute();

            // 挿入されたレコードのAUTO_INCREMENTのuser_idを取得
            $userId = $dbh->lastInsertId();  // 直近のAUTO_INCREMENT値を取得
    
            // 登録完了メッセージとuser_idの表示
            $comment = $comment . "登録完了！あなたのユーザーIDは: " . $userId . "です。<br>";
            $sensor = 1;
        } catch (PDOException $e) {
            header('Error:'.$e->getMessage());
            $result['error'] = $e->getMessage();
            return $result;
        }

        if($flag == 1){
            $sql = "INSERT INTO bin_user(user_id)VALUES(:userId);";
    
            try {
                $stmt = $dbh->prepare($sql);
                $stmt->bindParam(':user_id', $userId);
                $stmt->execute();
    
                // 登録完了メッセージとuser_idの表示
                $comment = $comment . "bin_userに登録しました";
                $sensor = 1;
            } catch (PDOException $e) {
                header('Error:'.$e->getMessage());
                $result['error'] = $e->getMessage();
                return $result;
            }

            $sql = "INSERT INTO user_questionnaire(user_id)VALUES(:userId);";
    
            try {
                $stmt = $dbh->prepare($sql);
                $stmt->bindParam(':user_id', $userId);
                $stmt->execute();
    
                // 登録完了メッセージとuser_idの表示
                $comment = $comment . "user_questionnaireに登録しました";
                $sensor = 1;
            } catch (PDOException $e) {
                header('Error:'.$e->getMessage());
                $result['error'] = $e->getMessage();
                return $result;
            }
        }

        //それを持って管理画面に遷移
        $comment = $comment . "画面遷移します";
    }

    if($sensor == 0){
        header("Location: ../pages_login/new_login.html?result=" . urlencode($comment));
    } else if($sensor == 1){
        header("Location: ../pages_login/success_new_login.html?result=" . urlencode($comment));
    }
?>