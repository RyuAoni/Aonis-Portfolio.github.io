package com.example.happydining.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
//import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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

// LoginScreen (ログイン画面) の定義
@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .background(Color.LightGray)
                .padding(top = 40.dp, start = 16.dp),
            contentAlignment = Alignment.TopStart
        ) {
            Text(
                text = "ログイン・サインイン",
                fontSize = 24.sp,
                color = Color.Black
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = "メールアドレス",
                fontSize = 16.sp,
                modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                placeholder = { Text("メールアドレス") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .background(Color(0xFFE0E0E0), RoundedCornerShape(28.dp)),
                singleLine = true,
                shape = RoundedCornerShape(28.dp),
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "パスワード",
                fontSize = 16.sp,
                modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                placeholder = { Text("パスワード") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .background(Color(0xFFE0E0E0), RoundedCornerShape(28.dp)),
                singleLine = true,
                shape = RoundedCornerShape(28.dp),
            )

            Spacer(modifier = Modifier.height(48.dp))

            Button(
                onClick = {
                    if (email.isBlank() || password.isBlank()) {
                        Toast.makeText(
                            context,
                            "メールアドレスとパスワードを入力してください",
                            Toast.LENGTH_SHORT
                        ).show()
                        return@Button
                    } else {
                        Toast.makeText(context, "ログイン試行: $email", Toast.LENGTH_LONG).show()
                        onLoginSuccess()
                    }

                    // Supabaseにログイン処理
                    //scope.launch {
                        //isLoading = true
                        //try {
                            //val credentials = AuthRequest(email = email, password = password)
                            //RetrofitClient.instance.signIn(RetrofitClient.API_KEY, credentials) // ★修正
                            onLoginSuccess() // ログイン成功
                        //} catch (e: Exception) {
                            //Toast.makeText(context, "エラー: ${e.message}", Toast.LENGTH_LONG).show()
                        //} finally {
                            //isLoading = false
                        //}
                    //}
                },
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(28.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                } else {
                    Text(text = "ログイン", fontSize = 20.sp)

                }
            }
        }
    }
}

// プレビュー用のコンポーザブル
@Preview(showBackground = true, widthDp = 412, heightDp = 917)
@Composable
fun LoginScreenPreview() {
    HappydiningTheme {
        LoginScreen(onLoginSuccess = {})
    }
}