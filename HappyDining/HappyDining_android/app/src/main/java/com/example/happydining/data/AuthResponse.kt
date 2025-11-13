package com.example.happydining.data

// 受信データ用（今は特に使わないが定義しておく）
data class AuthResponse(
    val access_token: String?,
    val user: User?
)

data class User(
    val id: String?,
    val email: String?
)