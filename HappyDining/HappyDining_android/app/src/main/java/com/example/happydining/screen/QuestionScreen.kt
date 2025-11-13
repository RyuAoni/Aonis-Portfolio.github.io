package com.example.happydining.ui.screens // パッケージ名が screen であることを確認

import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.example.happydining.data.Message
import com.example.happydining.ui.theme.Night
import kotlin.random.Random


@RequiresApi(Build.VERSION_CODES.O) // LocalTime を使うため
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuestionScreen(
    navController: NavController,
    onSendMessage: (String) -> Unit, // ユーザーからのメッセージ送信時のコールバック
    messages: List<Message>, // 親からメッセージリストを受け取る
    addSystemMessage: (String) -> Unit, // システムメッセージを追加してもらうためのコールバック
    addUserMessage: (String) -> Unit, // ユーザーメッセージを追加してもらうためのコールバック
    onNavigateToSuggestion: () -> Unit,
    modifier: Modifier = Modifier, // modifier を受け取る
    backgroundColor: Color, // backgroundColor を引数に追加
) {
    // 質問リスト群
    val questionList1 = remember {
        listOf(
            "今日のご気分はいかがですか？",
            "最近、何か新しい発見はありましたか？",
            "休日は何をしていますか？",
            "最近面白かったことは何ですか？",
            "何か新しいことに挑戦しましたか？",
            "今日の予定は何かありますか？"
        )
    }
    val questionList2 = remember {
        listOf(
            "好きな食べ物は何ですか？", "最近食べたもので一番美味しかったものは何ですか？",
            "得意な料理はありますか？", "甘いものとしょっぱいもの、どちらが好きですか？",
            "朝食はご飯派ですか？パン派ですか？", "おすすめのカフェやレストランはありますか？",
            "もし最後の晩餐だったら何を食べたいですか？"
        )
    }
    val questionList3 = remember {
        listOf(
            "最近ハマっていることは何ですか？", "最近読んだ本でおすすめはありますか？",
            "最近観た映画やドラマで面白かったものはありますか？", "好きな音楽のジャンルは何ですか？",
            "おすすめのゲームはありますか？", "何かスポーツはしますか？観ますか？"
        )
    }
    val questionList4 = remember {
        listOf(
            "行ってみたい場所はどこですか？", "旅行の思い出で一番印象的だったことは何ですか？",
            "子どもの頃の夢は何でしたか？", "人生で一番感動した出来事は何ですか？",
            "今までで一番楽しかった誕生日の思い出はありますか？", "一番思い出に残っている贈り物はありますか？"
        )
    }
    val questionList5 = remember {
        listOf(
            "もし宝くじが当たったら何をしますか？", "もし一日だけ透明人間になれるとしたら何をしますか？",
            "タイムマシンがあったら過去と未来、どちらに行きたいですか？", "世界中のどこでも行けるとしたら、最初に行きたい場所はどこですか？",
            "自分を動物に例えるとしたら何だと思いますか？", "人生で一番大切にしていることは何ですか？",
            "ストレス解消法はありますか？"
        )
    }
    val questionList6 = remember {
        listOf(
            "好きな季節はありますか？その理由は？", "雨の日は好きですか？過ごし方は？",
            "晴れの日は何をしたいですか？", "自然の中で一番好きな場所はどこですか？",
            "最近、空を見上げましたか？何か感じましたか？"
        )
    }

    val allQuestionLists = remember { listOf(
        questionList1, questionList2, questionList3, questionList4, questionList5, questionList6,
    ) }

    //val scope = rememberCoroutineScope()
    // val imageAhead = painterResource(id = R.drawable.pre_ahead_button) // 使わないので削除
    var selectedQuestionList by remember { mutableStateOf<List<String>?>(null) }
    var currentQuestionIndex by remember { mutableIntStateOf(0) }
    var questionCount by rememberSaveable { mutableStateOf(0) } // ★ 質問カウントを状態として保持

    // 現在表示中の質問 (状態として管理)
    var currentDisplayQuestion by remember { mutableStateOf("") } // 画面に表示する質問

    // リストのスクロール状態を管理
    val listState = rememberLazyListState()

    // ランダムな質問を取得するロジック関数 (副作用なし)
    fun getRandomQuestionLogic(): String? {
        if (selectedQuestionList == null || selectedQuestionList!!.isEmpty() || currentQuestionIndex >= selectedQuestionList!!.size) {
            selectedQuestionList = allQuestionLists[Random.nextInt(allQuestionLists.size)]
            currentQuestionIndex = 0
        }

        selectedQuestionList?.let { list ->
            if (currentQuestionIndex < list.size) {
                return list[currentQuestionIndex].also {
                    currentQuestionIndex++
                }
            }
        }
        return null
    }

    // アプリ起動時に最初のシステムメッセージ（質問）を送信
    LaunchedEffect(Unit) {
        if (messages.isEmpty()) { // メッセージがまだない場合のみ
            val firstQuestion = getRandomQuestionLogic()
            if (firstQuestion != null) {
                addSystemMessage(firstQuestion) // String を渡す
                currentDisplayQuestion = firstQuestion
                questionCount = 1 // 最初の質問でカウントを1にする
            }
        } else {
            // 既にメッセージがある場合は、最新のシステムメッセージを表示するか、次の質問を生成する
            val lastMessage = messages.lastOrNull()
            if (lastMessage != null && !lastMessage.isUser) { // 最後のメッセージがシステムからの質問なら
                currentDisplayQuestion = lastMessage.text
            } else { // 最後のメッセージがユーザーからの場合、次の質問を生成
                val nextQ = getRandomQuestionLogic()
                if(nextQ != null) {
                    addSystemMessage(nextQ)
                    currentDisplayQuestion = nextQ
                    questionCount++ // 新しい質問でカウントを増やす
                }
            }
        }
    }

    // メッセージが追加されたら、リストの最後までスクロール
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    Scaffold (
        modifier = modifier
            .fillMaxSize()
            .background(backgroundColor), // modifier と背景色を適用
        bottomBar = { // ★ ここに BottomNavigationBar を設定
            BottomNavigationBar(navController = navController)
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding) // Scaffoldからのパディングを適用
                .padding(horizontal = 16.dp, vertical = 16.dp), // さらにコンテンツのパディングを追加
            horizontalAlignment = Alignment.CenterHorizontally
            // verticalArrangement を削除し、LazyColumn の weight(1f) に任せる
        ) {
            val isNightMode = backgroundColor == Night

            // メッセージ表示部分
            LazyColumn(
                modifier = Modifier
                    .weight(1f) // 残りのスペースを埋める
                    .fillMaxWidth()
                    .padding(
                        horizontal = 16.dp, // 左右のパディング
                    )
                ,
                state = listState,
                verticalArrangement = Arrangement.spacedBy(8.dp) // 吹き出し間のスペース
            ) {
                items(messages) { message ->
                    MessageBubble(message = message, isNightMode = isNightMode)
                }
            }

            // 入力フォーム
            InputForm(
                onSendMessage = { newMessageText ->
                    addUserMessage(newMessageText) // ユーザーメッセージを追加

                    // 質問カウントを増やし、指定回数で提案画面へ遷移
                    questionCount++
                    if (questionCount >= 5) { // 5回以上で終了
                        addSystemMessage("これで質問は終わりです！Suggestion画面へどうぞ。")
                        onNavigateToSuggestion()
                    } else {
                        val nextQuestion = getRandomQuestionLogic()
                        if (nextQuestion != null) {
                            addSystemMessage(nextQuestion)
                            currentDisplayQuestion = nextQuestion // 画面表示も更新
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                isNightMode = isNightMode
            )

            // ★ リロードといいねボタン（Row全体）は削除
            /*
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = {
                        val newQuestion = getRandomQuestionLogic()
                        if (newQuestion != null) {
                            addSystemMessage(newQuestion)
                            currentDisplayQuestion = newQuestion
                        }
                    },
                    modifier = Modifier.size(100.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent)
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.reload_button),
                        contentDescription = "次の質問",
                        modifier = Modifier.fillMaxSize()
                    )
                }

                Spacer(Modifier.width(32.dp))

                Button(
                    onClick = {
                        onNavigateToSuggestion()
                    },
                    modifier = Modifier.size(100.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent)
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.good_button),
                        contentDescription = "献立提案",
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
            */
        }
    }
}

// MessageBubble は同じファイル内に定義
@Composable
fun MessageBubble(message: Message, isNightMode: Boolean) {
    val horizontalArrangement = if (message.isUser) Arrangement.End else Arrangement.Start
    val backgroundColor = if (message.isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val textColor = if (message.isUser) MaterialTheme.colorScheme.onPrimary else if (isNightMode) Color.White else MaterialTheme.colorScheme.onSurfaceVariant

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = horizontalArrangement
    ) {
        Text(
            text = message.text,
            color = textColor,
            modifier = Modifier
                .background(
                    color = backgroundColor,
                    shape = RoundedCornerShape(8.dp)
                )
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .wrapContentWidth(align = if (message.isUser) Alignment.End else Alignment.Start)
        )
    }
}

// InputForm も同じファイル内に定義
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InputForm(onSendMessage: (String) -> Unit, modifier: Modifier = Modifier, isNightMode: Boolean) {
    var inputText by remember { mutableStateOf("") }
    val inputTextColor = if (isNightMode) Color.White else Color.Black

    Row(modifier = modifier
        .fillMaxWidth()
        .padding(16.dp)) {

        OutlinedTextField( // TextField の代わりに OutlinedTextField を推奨
            value = inputText,
            onValueChange = { newValue ->
                inputText = newValue
            },
            label = { Text("メッセージを入力", color = inputTextColor) },
            modifier = Modifier.weight(1f)
        )

        Button(
            onClick = {
                if (inputText.isNotBlank()) {
                    onSendMessage(inputText)
                    inputText = ""
                }
            },
            modifier = Modifier.padding(start = 8.dp)
        ) {
            Text("送信")
        }
    }
}