package com.example.happydining.screen

package com.example.happydining.screen

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.rememberAsyncImagePainter
import com.example.happydining.data.Recipe

@Composable
fun RecipeDetailScreen(
    navController: NavController,
    recipe: Recipe?
) {
    if (recipe == null) {
        // もしレシピがなければエラー表示など
        Text("レシピ情報が見つかりませんでした。")
        return
    }

    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Image(
                painter = rememberAsyncImagePainter(recipe.image_url),
                contentDescription = recipe.menu_name,
                modifier = Modifier.fillMaxWidth().height(250.dp),
                contentScale = ContentScale.Crop
            )
        }
        item {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(recipe.menu_name, style = MaterialTheme.typography.headlineMedium)
                Spacer(modifier = Modifier.height(16.dp))

                Text("材料", style = MaterialTheme.typography.titleLarge)
                recipe.ingredients.forEach { ingredient ->
                    Text("- $ingredient", modifier = Modifier.padding(start = 8.dp))
                }
                Spacer(modifier = Modifier.height(16.dp))

                Text("作り方", style = MaterialTheme.typography.titleLarge)
                recipe.instructions.forEachIndexed { index, instruction ->
                    Text("${index + 1}. $instruction", modifier = Modifier.padding(start = 8.dp))
                }
            }
        }
    }
}