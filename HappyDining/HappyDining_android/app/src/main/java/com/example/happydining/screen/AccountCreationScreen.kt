package com.example.happydining.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.happydining.data.AuthRequest
import com.example.happydining.data.RetrofitClient
import com.example.happydining.ui.theme.HappydiningTheme
//import io.github.jan.supabase.gotrue.auth
//import io.github.jan.supabase.gotrue.providers.builtin.Email
import kotlinx.coroutines.launch

// AccountCreationScreen (アカウント作成画面) の定義
@Composable
fun AccountCreationScreen() {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) } // ローディング状態を追加

    val context = LocalContext.current
    val scope = rememberCoroutineScope() // Coroutineを起動するために必要

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "アカウント作成画面",
            fontSize = 32.sp,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("メールアドレス") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
        )

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("パスワード") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
        )

        OutlinedTextField(
            value = confirmPassword,
            onValueChange = { confirmPassword = it },
            label = { Text("パスワード確認") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth().padding(bottom = 32.dp)
        )

        Button(
            onClick = {
                if (email.isBlank() || password.isBlank()) {
                    Toast.makeText(context, "全ての項目を入力してください", Toast.LENGTH_SHORT).show()
                    return@Button
                }
                if (password != confirmPassword) {
                    Toast.makeText(context, "パスワードが一致しません", Toast.LENGTH_SHORT).show()
                    return@Button
                }

                // Supabaseにサインアップ処理
                //scope.launch {
                    //isLoading = true
                    //try {
                        //val credentials = AuthRequest(email = email, password = password)
                        //RetrofitClient.instance.signUp(RetrofitClient.API_KEY, credentials) // ★修正
                        //Toast.makeText(context, "確認メールを送信しました。", Toast.LENGTH_LONG).show()
                    //} catch (e: Exception) {
                        //Toast.makeText(context, "エラー: ${e.message}", Toast.LENGTH_LONG).show()
                    //} finally {
                        //isLoading = false
                    //}
                //}
                if (email.isBlank() || password.isBlank() || confirmPassword.isBlank()) {
                    Toast.makeText(context, "全ての項目を入力してください", Toast.LENGTH_SHORT).show()
                } else if (password != confirmPassword) {
                    Toast.makeText(context, "パスワードが一致しません", Toast.LENGTH_SHORT).show()
                } else {
                    // ★ 成功メッセージだけ表示
                    Toast.makeText(context, "アカウント作成が完了しました。ログイン画面からログインしてください。", Toast.LENGTH_LONG).show()
                }
            },
            enabled = !isLoading, // ローディング中はボタンを押せないように
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp))
            } else {
                Text("アカウント作成")
            }
        }
    }
}

// プレビュー用のコンポーザブル
@Preview(showBackground = true)
@Composable
fun AccountCreationScreenPreview() {
    HappydiningTheme {
        AccountCreationScreen()
    }
}