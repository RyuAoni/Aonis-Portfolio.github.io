<?php
// /var/www/html/parashere/point_calculation.php
// ポイント換算

$po = 0;

if($rt == 1) {
    // 傘を少ないところに置いた
    $po = $po + 10;
} else if ($rt == 2) {
    // 傘を作った
    $po = $po + 10;
} else if ($rt == 3) {
    // 傘を返した
    $po = $po + 10;
} else if ($rt == 4) {
    // owner確定pt
    $po = $po + 2;
} else if ($rt == 5) {
    // sub_owner確定pt
    $po = $po + 2;
} else if ($rt == 6) {
    // ownerナイシェアpt
    $po = $po + 5;
} else if ($rt == 7) {
    // sub_ownerナイシェアpt
    $po = $po + 5;
} else if ($rt == 8) {
    // 傘を捨てる
    $po = $po + 50;
} else {
    // エラー
    http_response_code(404);
    echo json_encode(['ok'=>false, 'error'=>'変数$rtの値がおかしいです']);
    exit;
}





