package com.example.happydining.ui.screens

import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn // リスト表示
import androidx.compose.foundation.lazy.items // リストアイテム
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel // ViewModelを取得
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController // Preview用
import com.example.happydining.ui.theme.HappydiningTheme
import com.example.happydining.data.LikedRecipe
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// ViewModelとデータクラスをインポート
import com.example.happydining.data.HistoryViewModel
import java.time.format.DateTimeFormatter // 日付のフォーマット


// --- HistoryScreen (履歴画面) の定義 ---
@RequiresApi(Build.VERSION_CODES.O)
@Composable
fun HistoryScreen(
    navController: NavController,
    viewModel: HistoryViewModel = viewModel() // ViewModel を取得
) {
    // ViewModelのhistoryListを監視し、変更があれば自動的に再描画
    val historyItems by viewModel.historyList.collectAsState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background), // テーマの背景色
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween // コンテンツとナビゲーションバーを上下に配置
    ) {
        // --- ヘッダー部分 ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp) // ヘッダーの高さ
                .background(Color.LightGray) // ヘッダーの背景色
                .padding(top = 40.dp, start = 16.dp, end = 16.dp), // タイトルとアイコンの位置調整
            contentAlignment = Alignment.CenterStart // タイトルを左寄せに設定
        ) {
            Text(
                text = "履歴", // 履歴画面のタイトル
                fontSize = 24.sp,
                color = Color.Black,
                modifier = Modifier.align(Alignment.CenterStart) // 左寄せ
            )
            // プロフィールアイコン (右上に配置)
            Box(
                modifier = Modifier
                    .align(Alignment.CenterEnd) // 右寄せ
                    .height(40.dp)
                    .background(Color.Gray, RoundedCornerShape(20.dp)) // 丸いアイコンの仮デザイン
                    .padding(horizontal = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "👤", fontSize = 24.sp, color = Color.White) // 仮のアイコン（絵文字）
            }
        }

        // --- メインコンテンツ部分 (履歴リスト) ---
        if (historyItems.isEmpty()) {
            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                Text("履歴はありません")
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxWidth().weight(1f),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(historyItems) { item ->
                    HistoryListItem(item = item)
                }
            }
        }

        // --- 下部ナビゲーションバー ---
        BottomNavigationBar(navController = navController)
    }
}

// --- 履歴リストの各アイテムを表示するコンポーザブル ---
@RequiresApi(Build.VERSION_CODES.O)
@Composable
fun HistoryListItem(item: LikedRecipe) {
    val date = Date(item.timestamp)
    val dateFormat = SimpleDateFormat("yyyy年M月d日", Locale.JAPAN)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* 履歴アイテムクリック時の詳細表示など */ },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), // カードの背景色
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp) // カードの影
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = dateFormat.format(date), // 日付フォーマット
                fontSize = 14.sp,
                color = Color.Gray
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = item.menuName,
                fontSize = 18.sp,
                color = Color.Black
            )
        }
    }
}

// --- プレビュー用のコンポーザブル ---
@RequiresApi(Build.VERSION_CODES.O)
@Preview(showBackground = true, widthDp = 412, heightDp = 917)
@Composable
fun HistoryScreenPreview() {
    HappydiningTheme {
        val navController = rememberNavController()
        HistoryScreen(navController = navController)
    }
}