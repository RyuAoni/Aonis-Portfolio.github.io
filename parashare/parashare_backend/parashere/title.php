<?php
// /var/www/html/parashere/title.php
// 取得ポイントによって得られる称号の判定

if ($point >= 1000) {
    $id_title = 10;
} elseif ($point >= 800) {
    $id_title = 9;
} elseif ($point >= 700) {
    $id_title = 8;
} elseif ($point >= 600) {
    $id_title = 7;
} elseif ($point >= 500) {
    $id_title = 6;
} elseif ($point >= 400) {
    $id_title = 5;
} elseif ($point >= 250) {
    $id_title = 4;
} elseif ($point >= 150) {
    $id_title = 3;
} elseif ($point >= 100) {
    $id_title = 2;
} elseif ($point >= 10) {
    $id_title = 1;
} else {
    $id_title = null;
}
