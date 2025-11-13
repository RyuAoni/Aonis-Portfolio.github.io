<?php
// /var/www/html/parashere/level.php
// レベル判定

if ($point >= 1000) {
    $levels = 11;
} elseif ($point >= 800) {
    $levels = 10;
} elseif ($point >= 700) {
    $levels = 9;
} elseif ($point >= 600) {
    $levels = 8;
} elseif ($point >= 500) {
    $levels = 7;
} elseif ($point >= 400) {
    $levels = 6;
} elseif ($point >= 250) {
    $levels = 5;
} elseif ($point >= 150) {
    $levels = 4;
} elseif ($point >= 100) {
    $levels = 3;
} elseif ($point >= 10) {
    $levels = 2;
} else {
    $levels = 1;
}
