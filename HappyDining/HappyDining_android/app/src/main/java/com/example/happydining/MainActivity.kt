package com.example.happydining // ★ このパッケージ名にMainActivity.ktが配置されている

// 各画面のComposableを新しいパッケージからインポート

// 時間帯関連のインポートと定義

import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.annotation.RequiresApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.happydining.data.Message

import com.example.happydining.screen.SuggestionScreen
import com.example.happydining.ui.screens.AccountCreationScreen
import com.example.happydining.ui.screens.HistoryScreen
import com.example.happydining.ui.screens.LoginScreen
import com.example.happydining.ui.screens.QuestionScreen
import com.example.happydining.ui.screens.SplashScreen
import com.example.happydining.ui.screens.UserSettingScreen

import com.example.happydining.ui.theme.Afternoon
import com.example.happydining.ui.theme.Evening
import com.example.happydining.ui.theme.HappydiningTheme
import com.example.happydining.ui.theme.Morning
import com.example.happydining.ui.theme.Night
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.time.LocalTime
import java.util.UUID

// ★ 時間帯判定のEnumと関数を定義
enum class TimeOfDay {
    MORNING, AFTERNOON, EVENING, NIGHT
}
@RequiresApi(Build.VERSION_CODES.O)
fun getCurrentTimeOfDay(): TimeOfDay {
    val currentTime = LocalTime.now()
    return when {
        currentTime.isAfter(LocalTime.of(5, 0)) && currentTime.isBefore(LocalTime.of(11, 0)) -> TimeOfDay.MORNING
        currentTime.isAfter(LocalTime.of(11, 0)) && currentTime.isBefore(LocalTime.of(17, 0)) -> TimeOfDay.AFTERNOON // ここはそのまま
        currentTime.isAfter(LocalTime.of(17, 0)) && currentTime.isBefore(LocalTime.of(19, 0)) -> TimeOfDay.EVENING
        else -> TimeOfDay.NIGHT
    }
}

// --- ルート定義の定数 (AppScreens) ---
object AppScreens {
    const val SPLASH = "splash_screen"
    const val ACCOUNT_CREATION = "account_creation_screen"
    const val LOGIN = "login_screen"
    const val CHAT = "chat_screen" // このルートで QuestionScreen を呼び出す
    const val USER_SETTINGS = "user_settings_screen"
    const val HISTORY = "history_screen"
    const val SUGGESTION = "suggestion_screen"
    const val QUESTION = "question_screen"
}

@OptIn(ExperimentalMaterial3Api::class)
@Suppress("UNUSED_PARAMETER")
class MainActivity : ComponentActivity() {
    @RequiresApi(Build.VERSION_CODES.O)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        //enableEdgeToEdge()

        setContent {
            HappydiningTheme {
                val navController = rememberNavController()
                val messageState = remember { mutableStateListOf<Message>() } // メッセージのリストを保持 (mutableStateListOfを使用)
                var currentAppBackgroundColor by remember { mutableStateOf(Color.White) }
                var hasSuggestedFood by remember { mutableStateOf(false) }
                var displayTime by remember { mutableStateOf(LocalTime.now()) }

                LaunchedEffect(Unit) {
                    while (isActive) {
                        val currentTime = LocalTime.now()
                        displayTime = currentTime

                        currentAppBackgroundColor = when (getCurrentTimeOfDay()) {
                            TimeOfDay.MORNING -> Morning
                            TimeOfDay.AFTERNOON -> Afternoon
                            TimeOfDay.EVENING -> Evening
                            TimeOfDay.NIGHT -> Night
                        }
                        delay(60_000)
                    }
                }


                    NavHost(
                        navController = navController,
                        startDestination = AppScreens.SPLASH, // 起動画面を SplashScreen に設定
                        modifier = Modifier
                            //.padding(innerPadding) // Scaffoldのパディングを適用
                            .fillMaxSize()

                    ) {
                        composable(AppScreens.SPLASH) {
                            SplashScreen(
                                onNavigateToAccountCreation = { navController.navigate(AppScreens.ACCOUNT_CREATION) },
                                onNavigateToLogin = { navController.navigate(AppScreens.LOGIN) }
                            )
                        }

                        // CHAT ルートで QuestionScreen を呼び出す
                        composable(AppScreens.CHAT) {
                            QuestionScreen(
                                navController = navController,
                                onSendMessage = { messageText ->
                                    messageState.add(
                                        Message(
                                            id = UUID.randomUUID().toString(),
                                            text = messageText,
                                            isUser = true,
                                            timestamp = LocalTime.now()
                                        )
                                    )
                                },
                                addSystemMessage = { messageText ->
                                    messageState.add(
                                        Message(
                                            id = UUID.randomUUID().toString(),
                                            text = messageText,
                                            isUser = false,
                                            timestamp = LocalTime.now()
                                        )
                                    )
                                },
                                addUserMessage = { messageText ->
                                    messageState.add(
                                        Message(
                                            id = UUID.randomUUID().toString(),
                                            text = messageText,
                                            isUser = true,
                                            timestamp = LocalTime.now()
                                        )
                                    )
                                },
                                onNavigateToSuggestion = {
                                    // hasSuggestedFood = true // QuestionScreenで使わないので、削除済み
                                    navController.navigate(AppScreens.SUGGESTION)
                                },

                                messages = messageState,
                                modifier = Modifier
                                    //.padding(innerPadding)
                                    .fillMaxSize(),
                                backgroundColor = currentAppBackgroundColor
                            )
                        }

                        composable(AppScreens.SUGGESTION) {
                            SuggestionScreen(
                                navController = navController,
                                backgroundColor = currentAppBackgroundColor,
                                messages = messageState, // ★★★ 会話履歴を渡す ★★★
                                modifier = Modifier.fillMaxSize()
                            )
                        }



                        // その他の画面の定義
                        composable(AppScreens.ACCOUNT_CREATION) {
                            AccountCreationScreen()
                        }

                        composable(AppScreens.LOGIN) {
                            LoginScreen(onLoginSuccess = { navController.navigate(AppScreens.USER_SETTINGS) })
                        }

                        composable(AppScreens.USER_SETTINGS) {
                            UserSettingScreen(navController = navController)
                        }

                        composable(AppScreens.HISTORY) {
                            HistoryScreen(
                                navController = navController
                            )
                        }
                }
            }
        }
    }
}