<?php
// /var/www/html/parashere/storage_amount.php
// 傘の量（多い・少ない・丁度良い）を正しく判定する

// 在庫率を計算
// $maxが0の場合のエラー(DivisionByZeroError)を避ける
$ratio = ($max > 0) ? ($number / $max) : 0;

if ($ratio <= 0.2) {
    // 在庫率が20%以下なら「少ない」
    $det = 1;
} else if ($ratio >= 0.8) {
    // 在庫率が80%以上なら「多い」
    $det = 3;
} else {
    // それ以外（21%～79%）は「丁度いい」
    $det = 2;
}
