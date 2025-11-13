package com.example.happydining.data

import android.app.Application // ★ 追加
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.happydining.data.RetrofitClient // RetrofitClientをインポート
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import com.example.happydining.data.SuggestionRequest
import com.example.happydining.data.SuggestionResponse
import com.example.happydining.data.LikedRecipe
import android.util.Log

// UIの状態（読み込み中、成功、エラー）を表現するクラス
data class SuggestionUiState(
    val currentSuggestion: Recipe? = null, // <-- Add this line
    val suggestions: List<Recipe> = emptyList(), // This might already be here, that's okay
    val isLoading: Boolean = false,
    val error: String? = null
)

class SuggestionViewModel(application: Application) : AndroidViewModel(application) {
    var uiState by mutableStateOf(SuggestionUiState())
        private set

    // ★★★ データベース操作用のDAOを取得 ★★★
    private val likedRecipeDao = AppDatabase.getDatabase(application).likedRecipeDao()
    private val userSettingsManager = UserSettingsManager(application) // ★追加
    private var suggestionList: List<Recipe> = emptyList()
    private var currentIndex = 0
    private var conversationHistory: List<Message> = emptyList()

    // This is the function that should be called from your screen
    fun getSuggestions(messages: List<Message>) {
        this.conversationHistory = messages // Save the conversation
        fetchSuggestionsFromServer(messages, null)
    }

    // 最初の提案を取得する関数
    //fun getInitialSuggestions(mood: String, condition: String) {
        // ★★★ moodとconditionを保存 ★★★
        //this.currentMood = mood
        //this.currentCondition = condition
        // ★★★ dislikedSuggestionsは含めずにAPIを呼び出す ★★★
        //getSuggestions(mood, condition, null)
    //}

    // APIを呼び出して献立を取得する関数
    private fun fetchSuggestionsFromServer(messages: List<Message>, dislikedSuggestions: List<String>?) {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, error = null) // 読み込み開始
            try {
                // MessageリストをQAPairリストに変換
                val qaPairs = mutableListOf<QAPair>()
                for (i in 0 until messages.size step 2) {
                    if (i + 1 < messages.size) {
                        val question = messages[i].text
                        val answer = messages[i + 1].text
                        qaPairs.add(QAPair(question, answer))
                    }
                }

                val likedDishes = likedRecipeDao.getLikedRecipeNames()
                val allergies = userSettingsManager.allergies.first().toList()
                val dislikes = userSettingsManager.dislikes.first().toList()

                val request = SuggestionRequest(
                    qaPairs = qaPairs, // mood, condition の代わりにqaPairsを渡す
                    positiveFeedback = likedDishes,
                    allergies = allergies,
                    dislikes = dislikes
                )
                // APIを呼び出し！
                val response = RetrofitClient.instance.getSuggestions(request)
                Log.d("SuggestionViewModel", "APIから受け取ったデータ: ${response.menus}")
                suggestionList = response.menus
                currentIndex = 0

                if (suggestionList.isNotEmpty()) {
                    uiState = uiState.copy(isLoading = false, currentSuggestion = suggestionList[0])
                } else {
                    uiState = uiState.copy(isLoading = false, error = "提案が見つかりませんでした。")
                }
            } catch (e: Exception) {
                uiState = uiState.copy(
                    isLoading = false,
                    error = e.message // エラーメッセージをセット
                )
            }
        }
    }

    // 「リロード」ボタンが押されたときの処理
    fun showNextSuggestion() {
        currentIndex++
        if (currentIndex < suggestionList.size) {
            // 次の候補があれば表示
            uiState = uiState.copy(currentSuggestion = suggestionList[currentIndex])
        } else {
            // 3つとも見終わったら、Geminiに再問い合わせ
            val rejectedNames = suggestionList.map { it.menu_name }
            fetchSuggestionsFromServer(conversationHistory, rejectedNames)
        }
    }


    // ★★★「食べたい」ボタンが押されたときに呼ばれる関数を追加 ★★★
    fun addLikedRecipe(recipe: Recipe) {
        uiState.currentSuggestion?.let { recipe ->
            viewModelScope.launch {
                val likedRecipe = LikedRecipe(
                    menuName = recipe.menu_name,
                    imageUrl = recipe.image_url
                )
                likedRecipeDao.insert(likedRecipe)
            }
        }
    }
}