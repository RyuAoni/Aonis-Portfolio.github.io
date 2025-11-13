package com.example.happydining.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.happydining.ui.theme.HappydiningTheme

// SplashScreen (タイトル画面) の定義
@Composable
fun SplashScreen(
    onNavigateToAccountCreation: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    val gradientColors = listOf(Color(0xFFFDD835), Color(0xFFFFEB3B))
    val gradientBrush = Brush.verticalGradient(colors = gradientColors)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(gradientBrush),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Happy Dining",
            fontSize = 56.sp,
            color = Color.Black,
            modifier = Modifier.padding(bottom = 64.dp)
        )

        Button(
            onClick = onNavigateToLogin,
            modifier = Modifier
                .fillMaxWidth(0.7f)
                .height(56.dp)
        ) {
            Text(
                text = "ログイン",
                fontSize = 20.sp
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onNavigateToAccountCreation,
            modifier = Modifier
                .fillMaxWidth(0.7f)
                .height(56.dp)
        ) {
            Text(
                text = "アカウント作成",
                fontSize = 20.sp
            )
        }
    }
}

// プレビュー用のコンポーザブル
@Preview(showBackground = true, widthDp = 412, heightDp = 917)
@Composable
fun SplashScreenPreview() {
    HappydiningTheme {
        SplashScreen(onNavigateToAccountCreation = {}, onNavigateToLogin = {})
    }
}