package com.example.happydining.ui.screens // このパッケージ名が正しいことを確認

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController // Preview用

// ★ AppScreens を正しくインポートする
import com.example.happydining.AppScreens // <-- この行が非常に重要です
import com.example.happydining.ui.theme.HappydiningTheme // テーマのインポート


// BottomNavigationBar (下部ナビゲーションバー)
@Composable
fun BottomNavigationBar(navController: NavController) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(70.dp)
            .background(Color.LightGray)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // ユーザー設定アイコン
        Button(
            onClick = { navController.navigate(AppScreens.USER_SETTINGS) },
            colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = Color.Black),
            modifier = Modifier.weight(1f)
        ) {
            Text("👤", fontSize = 30.sp) // 仮のアイコン
        }

        // 対話アイコン (ChatScreen はまだ開発中なので、AppScreens.CHAT ルートに遷移)
        Button(
            onClick = { navController.navigate(AppScreens.CHAT) },
            colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = Color.Black),
            modifier = Modifier.weight(1f)
        ) {
            Text("💬", fontSize = 30.sp) // 仮のアイコン
        }

        // 履歴アイコン
        Button(
            onClick = { navController.navigate(AppScreens.HISTORY) },
            colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = Color.Black),
            modifier = Modifier.weight(1f)
        ) {
            Text("⏰", fontSize = 30.sp) // 仮のアイコン
        }
    }
}

// プレビュー用
@Preview(showBackground = true)
@Composable
fun BottomNavigationBarPreview() {
    HappydiningTheme {
        val navController = rememberNavController()
        BottomNavigationBar(navController = navController)
    }
}