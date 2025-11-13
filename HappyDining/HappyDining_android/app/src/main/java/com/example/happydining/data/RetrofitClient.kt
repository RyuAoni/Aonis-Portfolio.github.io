package com.example.happydining.data // パッケージ名が正しいか確認

import com.example.happydining.data.MenuApiService // import文を追加
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    private const val BASE_URL = "https://lvwayoiqtokyjfgtcowo.supabase.co/functions/v1/"

    // ★★★ あなたのanon keyをここに設定 ★★★
    const val API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2d2F5b2lxdG9reWpmZ3Rjb3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1OTM4ODMsImV4cCI6MjA2NzE2OTg4M30.nTdVpalQk1BSf8Mu5r8iy9V5gIoiO_ZpjDCHwxmFkA4"

    val instance: MenuApiService by lazy {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        retrofit.create(MenuApiService::class.java)
    }
}