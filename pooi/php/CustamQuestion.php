<?php
//アンケートを作成するためのもの
//使用者 : スポンサー
//使用データベース : sponsor
//使用テーブル : quesstionnaire,choice
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

//questionnaire_id、questionnaire_title、choice_id、choice_nameの変数宣言 pass,mail:string.null(文字列)
//型宣言は必要ない
$number = 0;
$nob = 0;

//タイトルと入力する質問の選択肢の数を受け取る
if(filter_input(INPUT_POST, 'questionnaire_title')){
    $questionnaire_title = (string) $_POST['questionnaire_title'];

    //選択肢の数だけfor文を回す
    if(!empty($_POST['number'])){
        $number = (int) $_POST['number'];

        switch($number) {
            case 2:
                if(filter_input(INPUT_POST, 'choice_name_one') && filter_input(INPUT_POST, 'choice_name_two')){
                    $choice_name_one = (string) $_POST['choice_name_one'];
                    $choice_name_two = (string) $_POST['choice_name_two'];
                    $nob = 1;
                } else {
                    echo "2入力のエラーです。";
                    echo "空欄があります。選択肢を入力してください。";
                }
                break;
            case 3:
                if(filter_input(INPUT_POST, 'choice_name_one') && filter_input(INPUT_POST, 'choice_name_two') && filter_input(INPUT_POST, 'choice_name_thr')){
                    $choice_name_one = (string) $_POST['choice_name_one'];
                    $choice_name_two = (string) $_POST['choice_name_two'];
                    $choice_name_thr = (string) $_POST['choice_name_thr'];
                    $nob = 1;
                } else {
                    echo "3入力のエラーです。";
                    echo "空欄があります。選択肢を入力してください。";
                }
                break;
            default:
                echo "選択肢は2つか3つにしてください";
                break;
        }

        if($nob == 1){
            //タイトルをデータベース上に上げ、questionnaire_idをもらってくる
            $sql = "INSERT INTO questionnaire(questionnaire_title)VALUES(:questionnaire_title);";
            
            try {
                $stmt = $dbh->prepare($sql);
                $stmt->bindParam(':questionnaire_title', $questionnaire_title);
                $stmt->execute();
            } catch (PDOException $e) {
                header('Error:'.$e->getMessage());
                $result['error'] = $e->getMessage();
                return $result;
            }            

            $questionnaire_id = $dbh->lastInsertId();
            echo "「" . $questionnaire_title . "」のIDは" . $questionnaire_id . "です。";

            for($i = 0; $i < $number; $i++){
                //$i+1をchoice_idとしてchoice_nameをクライアントから受け取ってくる
                $choice_id = $i + 1;
    
                //questionnaire_id,choice_id,choice_nameをデータベースに送る
                switch($i) {
                    case 0:
                        $choice_name = $choice_name_one;
                        
                        $sql = "INSERT INTO choice(questionnaire_id, choice_id, choice_name)VALUES(:questionnaire_id, :choice_id, :choice_name);";
                        
                        try {
                            $stmt = $dbh->prepare($sql);
                            $stmt->bindParam(':questionnaire_id', $questionnaire_id);
                            $stmt->bindParam(':choice_id', $choice_id);
                            $stmt->bindParam(':choice_name', $choice_name);
                            $stmt->execute();
    
                            echo "選択肢「" . $choice_name . "」が保存されました。";
                        } catch (PDOException $e) {
                            header('Error:'.$e->getMessage());
                            $result['error'] = $e->getMessage();
                            return $result;
                        }
                        break;
                    case 1:
                        $choice_name = $choice_name_two;
                        
                        $sql = "INSERT INTO choice(questionnaire_id, choice_id, choice_name)VALUES(:questionnaire_id, :choice_id, :choice_name);";
                        
                        try {
                            $stmt = $dbh->prepare($sql);
                            $stmt->bindParam(':questionnaire_id', $questionnaire_id);
                            $stmt->bindParam(':choice_id', $choice_id);
                            $stmt->bindParam(':choice_name', $choice_name);
                            $stmt->execute();
    
                            echo "選択肢「" . $choice_name . "」が保存されました。";
                        } catch (PDOException $e) {
                            header('Error:'.$e->getMessage());
                            $result['error'] = $e->getMessage();
                            return $result;
                        }
                        break;
                    case 2:
                        $choice_name = $choice_name_thr;
                        
                        $sql = "INSERT INTO choice(questionnaire_id, choice_id, choice_name)VALUES(:questionnaire_id, :choice_id, :choice_name);";
                        
                        try {
                            $stmt = $dbh->prepare($sql);
                            $stmt->bindParam(':questionnaire_id', $questionnaire_id);
                            $stmt->bindParam(':choice_id', $choice_id);
                            $stmt->bindParam(':choice_name', $choice_name);
                            $stmt->execute();
    
                            echo "選択肢「" . $choice_name . "」が保存されました。";
                        } catch (PDOException $e) {
                            header('Error:'.$e->getMessage());
                            $result['error'] = $e->getMessage();
                            return $result;
                        }
                        break;
                    default:
                        echo "管理人に問い合わせてください。";
                        break;
                }
            }
        }        
    } else {
        echo "管理人に問い合わせてください。";
    }
} else {
    echo "質問を入力してください";
}
?>