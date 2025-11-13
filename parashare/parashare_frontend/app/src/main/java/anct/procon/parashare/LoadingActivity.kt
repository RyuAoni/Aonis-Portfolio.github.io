// app/src/main/java/anct/procon/parashare/LoadingActivity.kt
package anct.procon.parashare

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import anct.procon.parashare.network.ApiClient
import anct.procon.parashare.network.PreloadedDataHolder
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.system.measureTimeMillis

class LoadingActivity : AppCompatActivity() {

    companion object {
        private const val MIN_DISPLAY_TIME_MS = 2500L // スプラッシュを最低でもこの時間は見せる（体感を安定させる）
        private const val FADE_OUT_DURATION_MS = 480L // Lottie（アニメ部品）のフェードアウト時間
        private const val LOGO_FADE_OUT_DURATION_MS = 500L // ロゴのフェードアウト時間
    }

    /** 画面を生成し、アニメーションの終了へ */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_loading)

        val logoView: View = findViewById(R.id.logo_image_view)
        val lottieView: View = findViewById(R.id.lottie_animation_view)

        lifecycleScope.launch {
            val elapsed = measureTimeMillis {
                try {
                    val res = ApiClient.apiService.getStorages()
                    if (res.isSuccessful) {
                        PreloadedDataHolder.storages = res.body()
                    } else {
                        PreloadedDataHolder.error = Exception("Failed to fetch storages")
                    }
                } catch (e: Exception) {
                    PreloadedDataHolder.error = e
                }
            }

            val remain = MIN_DISPLAY_TIME_MS - elapsed
            if (remain > 0) delay(remain)

            startFadeOutAnimation(lottieView, logoView)
        }
    }

    /** 終了後に遷移 */
    private fun startFadeOutAnimation(lottieView: View, logoView: View) {
        lottieView.animate().alpha(0f).setDuration(FADE_OUT_DURATION_MS)

        logoView.animate()
            .alpha(0f)
            .setDuration(LOGO_FADE_OUT_DURATION_MS)
            .setListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    navigateBasedOnLoginStatus()
                }
            })
            .start()
    }

    /** ログイン状況によって遷移先を決定 */
    private fun navigateBasedOnLoginStatus() {
        val prefs = getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
        val isLoggedIn = prefs.contains("user_data")

        val intent = Intent(
            this,
            if (isLoggedIn) MainActivity::class.java else LoginActivity::class.java
        )
        startActivity(intent)
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        finish()
    }
}
