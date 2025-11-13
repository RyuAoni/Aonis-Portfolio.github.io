package com.example.happydining.data // ★ 新しいパッケージ名

import android.app.Application
import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

// ★ アレルギー項目を表すデータクラス
data class AllergyItem(val id: String, val name: String)

// ★ 嫌いな食べ物項目を表すデータクラス
data class DislikeFoodItem(val id: String, val name: String)

class UserSettingViewModel(application: Application) : AndroidViewModel(application) {
    private val userSettingsManager = UserSettingsManager(application)

    // アレルギーの全リスト（写真から抽出、あいうえお順）
    val allAllergies = listOf(
        AllergyItem("abalone", "あわび"),
        AllergyItem("almond", "アーモンド"),
        AllergyItem("squid", "いか"),
        AllergyItem("ikura", "いくら"),
        AllergyItem("orange", "オレンジ"),
        AllergyItem("cashew_nut", "カシューナッツ"),
        AllergyItem("crab", "かに"),
        AllergyItem("kiwi_fruit", "キウイフルーツ"),
        AllergyItem("walnut", "くるみ"),
        AllergyItem("sesame", "ごま"),
        AllergyItem("salmon", "さけ"),
        AllergyItem("mackerel", "さば"),
        AllergyItem("soybean", "大豆"),
        AllergyItem("chicken", "鶏肉"),
        AllergyItem("pork", "豚肉"),
        AllergyItem("tomato", "トマト"), // ※画像にはないが例として追加
        AllergyItem("banana", "バナナ"),
        AllergyItem("peanut", "落花生"),
        AllergyItem("beef", "牛肉"),
        AllergyItem("peach", "もも"),
        AllergyItem("yam", "やまいも"),
        AllergyItem("apple", "りんご"),
        AllergyItem("gelatin", "ゼラチン"),
        AllergyItem("shrimp", "えび"),
        AllergyItem("egg", "卵"),
        AllergyItem("milk", "乳"),
        AllergyItem("buckwheat", "そば"),
        AllergyItem("wheat", "小麦"),
        AllergyItem("macadamia_nut", "マカダミアナッツ")
    ).sortedBy { it.name } // あいうえお順にソート

    // 嫌いな食べ物の全リスト（例としていくつか定義、あいうえお順）
    val allDislikeFoods = listOf(
        DislikeFoodItem("asparagus", "アスパラガス"),
        DislikeFoodItem("eggplant", "なす"),
        DislikeFoodItem("natto", "納豆"),
        DislikeFoodItem("carrot", "にんじん"),
        DislikeFoodItem("mushroom", "きのこ"),
        DislikeFoodItem("bitter_gourd", "ゴーヤ"),
        DislikeFoodItem("celery", "セロリ"),
        DislikeFoodItem("coriander", "パクチー")
    ).sortedBy { it.name }

    // 選択されたアレルギーを保持する State
    val selectedAllergies = mutableStateListOf<String>()

    // 選択された嫌いな食べ物を保持する State
    val selectedDislikeFoods = mutableStateListOf<String>()

    init {
        // ViewModel初期化時にDataStoreから保存済みの設定を読み込む
        viewModelScope.launch {
            selectedAllergies.addAll(userSettingsManager.allergies.first())
            selectedDislikeFoods.addAll(userSettingsManager.dislikes.first())
        }
    }

    // アレルギー選択のトグル
    fun toggleAllergy(allergyId: String, isChecked: Boolean) {
        if (isChecked) {
            if (!selectedAllergies.contains(allergyId)) {
                selectedAllergies.add(allergyId)
            }
        } else {
            selectedAllergies.remove(allergyId)
        }
    }

    // 嫌いな食べ物選択のトグル
    fun toggleDislikeFood(dislikeFoodId: String, isChecked: Boolean) {
        if (isChecked) {
            if (!selectedDislikeFoods.contains(dislikeFoodId)) {
                selectedDislikeFoods.add(dislikeFoodId)
            }
        } else {
            selectedDislikeFoods.remove(dislikeFoodId)
        }
    }

    // 保存処理の例（実際のバックエンド通信はここで行う）
    fun saveSettings() {
        viewModelScope.launch {
            // 例: APIに選択されたIDリストを送信
            // val result = apiService.sendAllergies(selectedAllergies.toList())
            // val result = apiService.sendDislikeFoods(selectedDislikeFoods.toList())
            // Log.d("UserSettingViewModel", "保存されたアレルギー: $selectedAllergies")
            // Log.d("UserSettingViewModel", "保存された嫌いな食べ物: $selectedDislikeFoods")
            userSettingsManager.saveAllergies(selectedAllergies.toSet())
            userSettingsManager.saveDislikes(selectedDislikeFoods.toSet())
        }
    }
}