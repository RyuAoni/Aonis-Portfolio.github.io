package com.example.happydining.data

import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface MenuApiService {
    // 献立提案API
    @POST("suggest-menu")
    suspend fun getSuggestions(@Body request: SuggestionRequest): SuggestionResponse

    // Supabaseアカウント作成API
    @POST("auth/v1/signup")
    suspend fun signUp(
        @Header("apikey") apiKey: String,
        @Body credentials: AuthRequest
    ): AuthResponse

    // SupabaseログインAPI
    @POST("auth/v1/token?grant_type=password")
    suspend fun signIn(
        @Header("apikey") apiKey: String,
        @Body credentials: AuthRequest
    ): AuthResponse
}