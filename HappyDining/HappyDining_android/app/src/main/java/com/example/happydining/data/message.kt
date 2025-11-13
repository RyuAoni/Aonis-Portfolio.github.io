package com.example.happydining.data
import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import java.time.LocalTime

@Parcelize
data class FoodSuggestion (
    val imageResId: Int,
    val name: String
) : Parcelable

data class Message(
    val text: String,
    val isUser: Boolean, // true ならユーザー（自分）、false なら相手（Geminiなど）
    val id: String,
    val timestamp: LocalTime
)