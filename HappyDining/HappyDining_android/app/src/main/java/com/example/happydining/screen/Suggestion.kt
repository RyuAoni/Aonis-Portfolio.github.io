package com.example.happydining.screen

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.rememberAsyncImagePainter
import com.example.happydining.data.Recipe
import com.example.happydining.data.SuggestionViewModel
import com.example.happydining.ui.screens.BottomNavigationBar
import android.widget.Toast // ★ Toast用にインポート
import androidx.compose.ui.platform.LocalContext // ★ Context取得用にインポート
import androidx.compose.ui.res.painterResource
import com.example.happydining.data.Message
import com.example.happydining.R


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SuggestionScreen(
    navController: NavController,
    backgroundColor: Color,
    messages: List<Message>, // ★★★ mood, condition の代わりにmessagesを受け取る ★★★
    modifier: Modifier = Modifier,
    suggestionViewModel: SuggestionViewModel = viewModel()
) {
    val uiState = suggestionViewModel.uiState
    val context = LocalContext.current // ★ Contextを取得

    // この画面が最初に表示された時にAPIを呼び出す
    LaunchedEffect(key1 = Unit) {
        // TODO: 今は仮のデータ。前の画面から気分や体調を受け取るように変更する
        //suggestionViewModel.getSuggestions(mood = "happy", condition = "healthy")
        // ...渡された引数を使うように変更します
        suggestionViewModel.getSuggestions(messages = messages)
    }

    Scaffold(
        modifier = modifier.fillMaxSize().background(backgroundColor),
        bottomBar = { BottomNavigationBar(navController = navController) }
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            when {
                // 読み込み中の表示
                uiState.isLoading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                // エラー発生時の表示
                uiState.error != null -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = "エラーが発生しました: ${uiState.error}")
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = {
                            // ViewModelの同じ関数を再度呼び出す
                            suggestionViewModel.getSuggestions(messages = messages)
                        }) {
                            Text("再試行")
                        }
                    }
                }
                // 現在表示すべき献立がある場合
                uiState.currentSuggestion != null -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        // 料理画像
                        Image(
                            painter = rememberAsyncImagePainter(uiState.currentSuggestion.image_url,
                                // 読み込みに失敗した場合に表示する画像
                                error = painterResource(id = R.drawable.no_image),

                                // URLがnullまたは空の場合に表示する画像
                                fallback = painterResource(id = R.drawable.no_image)
                            ),
                            contentDescription = uiState.currentSuggestion.menu_name,
                            modifier = Modifier.fillMaxWidth().height(250.dp),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        // 料理名
                        Text(
                            text = uiState.currentSuggestion.menu_name,
                            style = MaterialTheme.typography.headlineSmall
                        )
                        Spacer(modifier = Modifier.height(32.dp))

                        // リロードといいねボタン
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Button(
                                onClick = { suggestionViewModel.showNextSuggestion() },
                                modifier = Modifier.size(100.dp)
                            ) {
                                Image(painter = painterResource(id = R.drawable.reload_button), contentDescription = "次の候補")
                            }
                            Button(
                                onClick = {
                                    uiState.currentSuggestion?.let {
                                        suggestionViewModel.addLikedRecipe(it) // <-- Use 'it' here
                                        Toast.makeText(context, "${it.menu_name} を保存しました", Toast.LENGTH_SHORT).show()
                                        suggestionViewModel.showNextSuggestion()
                                    }
                                },
                                modifier = Modifier.size(100.dp)
                            ) {
                                Image(painter = painterResource(id = R.drawable.good_button), contentDescription = "食べたい")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RecipeItem(recipe: Recipe, onLikeClicked: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            Image(
                painter = rememberAsyncImagePainter(recipe.image_url),
                contentDescription = recipe.menu_name,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                contentScale = ContentScale.Crop
            )
            Row(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = recipe.menu_name,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f) // テキストが長くなってもボタンが押し出されないように
                )
                Button(onClick = onLikeClicked) { // ★ 引数で受け取った処理を呼び出す
                    Text("食べたい")
                }
            }
        }
    }
}