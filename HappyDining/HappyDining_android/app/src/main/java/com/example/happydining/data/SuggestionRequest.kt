package com.example.happydining.data

data class SuggestionRequest(
    val qaPairs: List<QAPair>, // mood, condition から変更
    val positiveFeedback: List<String>,
    val allergies: List<String>,
    val dislikes: List<String>,
    val dislikedSuggestions: List<String>? = null
)