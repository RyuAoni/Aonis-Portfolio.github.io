package com.example.happydining.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface LikedRecipeDao {
    // 新しい「いいね」したレシピを追加する
    @Insert
    suspend fun insert(likedRecipe: LikedRecipe)

    // 保存されているすべての「いいね」したレシピを取得する
    @Query("SELECT * FROM liked_recipes ORDER BY timestamp DESC")
    fun getAllLikedRecipes(): Flow<List<LikedRecipe>>

    @Query("SELECT menuName FROM liked_recipes ORDER BY timestamp DESC")
    suspend fun getLikedRecipeNames(): List<String>
}