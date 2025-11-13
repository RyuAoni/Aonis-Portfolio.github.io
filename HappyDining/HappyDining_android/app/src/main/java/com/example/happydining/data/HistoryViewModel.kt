package com.example.happydining.data

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

// HistoryItemはLikedRecipeとほぼ同じなので、LikedRecipeをそのまま使います
// HistoryItemデータクラスは不要になります

class HistoryViewModel(application: Application) : AndroidViewModel(application) {

    private val likedRecipeDao = AppDatabase.getDatabase(application).likedRecipeDao()

    // RoomからのデータフローをViewModelのStateFlowに変換します
    // これにより、データが追加されたら自動的に画面が更新されます
    val historyList: StateFlow<List<LikedRecipe>> = likedRecipeDao.getAllLikedRecipes()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000), // 5秒間購読者がいなければ停止
            initialValue = emptyList() // 初期値は空リスト
        )
}