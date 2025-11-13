package com.example.happydining.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.example.happydining.ui.theme.HappydiningTheme

// ViewModelとデータクラスをインポート
import com.example.happydining.data.AllergyItem
import com.example.happydining.data.DislikeFoodItem
import com.example.happydining.data.UserSettingViewModel


// --- UserSettingScreen (ユーザー設定画面) の定義 ---
@Composable
fun UserSettingScreen(
    navController: NavController,
    viewModel: UserSettingViewModel = viewModel()
) {
    val context = LocalContext.current

    // ダイアログの表示状態
    var showAllergyDialog by remember { mutableStateOf(false) }
    var showDislikeFoodDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // --- ヘッダー部分 ---
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .background(Color.LightGray)
                .padding(top = 40.dp, start = 16.dp, end = 16.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Text(
                text = "ユーザー設定",
                fontSize = 24.sp,
                color = Color.Black,
                modifier = Modifier.align(Alignment.CenterStart)
            )
            Box(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .height(40.dp)
                    .background(Color.Gray, RoundedCornerShape(20.dp))
                    .padding(horizontal = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "👤", fontSize = 24.sp, color = Color.White)
            }
        }

        // --- メインコンテンツ部分 ---
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.Start
        ) {
            // アレルギー入力欄のボタン
            Text(
                text = "アレルギー",
                fontSize = 16.sp,
                modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
            )
            Button(
                onClick = { showAllergyDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .background(Color(0xFFE0E0E0), RoundedCornerShape(28.dp)),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE0E0E0))
            ) {
                Text(text = "アレルギー入力欄", color = Color.Gray)
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 嫌いな食べ物入力欄のボタン
            Text(
                text = "嫌いな食べ物",
                fontSize = 16.sp,
                modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
            )
            Button(
                onClick = { showDislikeFoodDialog = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .background(Color(0xFFE0E0E0), RoundedCornerShape(28.dp)),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE0E0E0))
            ) {
                Text(text = "嫌いな食べ物入力欄", color = Color.Gray)
            }

            Spacer(modifier = Modifier.height(32.dp))

            // 保存ボタン
            Button(
                onClick = {
                    viewModel.saveSettings()
                    val message = "アレルギー: ${viewModel.selectedAllergies.joinToString()}, " +
                            "嫌いな食べ物: ${viewModel.selectedDislikeFoods.joinToString()}"
                    Toast.makeText(context, message, Toast.LENGTH_LONG).show()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("保存")
            }

            Spacer(modifier = Modifier.height(32.dp))

            // 現在の保存状態の表示
            Text(
                text = "選択中のアレルギー: ${viewModel.selectedAllergies.joinToString()}",
                fontSize = 14.sp,
                color = Color.DarkGray
            )
            Text(
                text = "選択中の嫌いな食べ物: ${viewModel.selectedDislikeFoods.joinToString()}",
                fontSize = 14.sp,
                color = Color.DarkGray
            )
        }

        // --- ダイアログの表示 ---
        if (showAllergyDialog) {
            SelectionDialog(
                title = "アレルギーを選択",
                items = viewModel.allAllergies,
                selectedItems = viewModel.selectedAllergies,
                onDismiss = { showAllergyDialog = false },
                onToggle = { itemId, isChecked -> viewModel.toggleAllergy(itemId, isChecked) }
            )
        }
        if (showDislikeFoodDialog) {
            SelectionDialog(
                title = "嫌いな食べ物を選択",
                items = viewModel.allDislikeFoods,
                selectedItems = viewModel.selectedDislikeFoods,
                onDismiss = { showDislikeFoodDialog = false },
                onToggle = { itemId, isChecked -> viewModel.toggleDislikeFood(itemId, isChecked) }
            )
        }

        // --- 下部ナビゲーションバー ---
        BottomNavigationBar(navController = navController)
    }
}

// --- 汎用的な選択ダイアログコンポーザブル ---
@Composable
fun <T : Any> SelectionDialog(
    title: String,
    items: List<T>,
    selectedItems: List<String>,
    onDismiss: () -> Unit,
    onToggle: (String, Boolean) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(items) { item ->
                    val itemId = when (item) {
                        is AllergyItem -> item.id
                        is DislikeFoodItem -> item.id
                        else -> ""
                    }
                    val itemName = when (item) {
                        is AllergyItem -> item.name
                        is DislikeFoodItem -> item.name
                        else -> ""
                    }
                    if (itemId.isNotBlank()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onToggle(itemId, !selectedItems.contains(itemId)) }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = itemName, fontSize = 18.sp)
                            Checkbox(
                                checked = selectedItems.contains(itemId),
                                onCheckedChange = { isChecked -> onToggle(itemId, isChecked) }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("OK")
            }
        }
    )
}

// --- プレビュー用のコンポーザブル ---
@Preview(showBackground = true, widthDp = 412, heightDp = 917)
@Composable
fun UserSettingScreenPreview() {
    HappydiningTheme {
        val navController = rememberNavController()
        UserSettingScreen(navController = navController)
    }
}