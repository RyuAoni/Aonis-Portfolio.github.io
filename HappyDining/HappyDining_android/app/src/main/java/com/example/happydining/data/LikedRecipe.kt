package com.example.happydining.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "liked_recipes") // テーブル名を定義
data class LikedRecipe(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0, // 自動生成されるID
    val menuName: String, // 料理名
    val imageUrl: String, // 画像URL
    val timestamp: Long = System.currentTimeMillis() // 保存された日時
)