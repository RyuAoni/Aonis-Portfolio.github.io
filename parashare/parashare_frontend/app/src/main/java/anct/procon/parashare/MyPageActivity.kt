// app/src/main/java/anct/procon/parashare/MyPageActivity.kt
package anct.procon.parashare

import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.toColorInt
import androidx.core.content.edit
import androidx.lifecycle.lifecycleScope
import anct.procon.parashare.network.ApiClient
import anct.procon.parashare.network.MyPageRequest
import anct.procon.parashare.network.MyPageResponse
import anct.procon.parashare.network.User
import com.google.gson.Gson
import kotlinx.coroutines.launch

class MyPageActivity : AppCompatActivity() {

    private lateinit var tvUserName: TextView
    private lateinit var tvUserId: TextView
    private lateinit var tvLevel: TextView
    private lateinit var progressLevel: ProgressBar
    private lateinit var tvTitleName: TextView
    private lateinit var tvCo2: TextView
    private lateinit var btnLogout: Button

    private val gaugeColor = "#42A5F5".toColorInt()
    private val prefs by lazy { getSharedPreferences("user_prefs", Context.MODE_PRIVATE) }
    private var userId: Int = -1

    /** 画面生成 */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_my_page)

        tvUserName    = findViewById(R.id.user_name_text)
        tvUserId      = findViewById(R.id.user_id_text)
        tvLevel       = findViewById(R.id.level_text)
        progressLevel = findViewById(R.id.level_progress_bar)
        tvTitleName   = findViewById(R.id.title_name_text)
        tvCo2         = findViewById(R.id.co2_text)
        btnLogout     = findViewById(R.id.logout_button)

        val localUser = readLocalUser() ?: return logout()
        userId = localUser.idUser

        tvUserName.text = localUser.name
        tvUserId.text   = "ID: ${localUser.idUser}"

        NavigationUtil.setupBottomNavigationBar(this)

        setMenuClicks(
            R.id.menu_item_profile_edit,
            R.id.menu_item_settings,
            R.id.menu_item_help
        )

        btnLogout.setOnClickListener { logout() }

        findViewById<Button?>(R.id.btn_change_title)?.setOnClickListener {
            startActivity(Intent(this, TitleSelectActivity::class.java).putExtra("id_user", userId))
        }

        fetchAndBindProfile(userId)
    }

    /** 画面再表示 */
    override fun onResume() {
        super.onResume()
        if (userId > 0) fetchAndBindProfile(userId)
    }

    /** サーバーの情報をUIに反映 */
    private fun fetchAndBindProfile(idUser: Int) {
        progressLevel.visibility = View.INVISIBLE

        lifecycleScope.launch {
            runCatching {
                val res = ApiClient.apiService.getMyPage(MyPageRequest(idUser))
                if (!res.isSuccessful) error("HTTP ${res.code()}: ${res.errorBody()?.string().orEmpty()}")
                res.body() ?: error("Empty body")
            }.onSuccess { body: MyPageResponse ->
                val profile = body.profile
                if (!body.ok || profile == null) {
                    toast(body.error ?: "取得に失敗しました", Toast.LENGTH_LONG)
                    return@onSuccess
                }

                tvUserName.text = profile.name
                tvLevel.text    = "Lv. ${profile.level}"

                progressLevel.apply {
                    max = 100
                    progress = profile.levelProgress.coerceIn(0, 100)
                    progressTintList = ColorStateList.valueOf(gaugeColor)
                    visibility = View.VISIBLE
                }

                // ローカルに保存された現在の称号ID（TitleSelectで更新済みの想定）
                val currentIdTitle = readLocalUser()?.idTitle ?: 0
                applyTitleBadge(profile.titleName, currentIdTitle)

                tvCo2.text = "CO₂削減量: ${profile.co} g"
            }.onFailure { e ->
                toast("通信エラー: ${e.message}", Toast.LENGTH_LONG)
            }
        }
    }

    /** 称号を適用 */
    private fun applyTitleBadge(titleName: String?, idTitle: Int) {
        if (titleName.isNullOrBlank()) {
            tvTitleName.text = "称号なし"
            tvTitleName.background = null
            tvTitleName.setTextColor(Color.BLACK)
            tvTitleName.setPadding(0, 0, 0, 0)
            return
        }

        tvTitleName.text = titleName

        val style = styleForLevel(idTitle)
        tvTitleName.background = badgeBackground(style, isCurrent = true) // マイページは“現在の称号”
        tvTitleName.setTextColor(style.strokeColor) // 現在の称号は枠線色で強調
        tvTitleName.setPadding(dp(10), dp(6), dp(10), dp(6))
    }

    /** 称号の色構成 */
    private data class TitleStyle(
        val startColor: Int,
        val endColor: Int,
        val strokeColor: Int,
        val textColor: Int
    )

    /** レベルに応じた称号スタイル */
    private fun styleForLevel(level: Int): TitleStyle = when (level) {
        in 1..3 -> TitleStyle(
            startColor = "#FFF3E0".toColorInt(),
            endColor   = "#FFE0B2".toColorInt(),
            strokeColor= "#F57C00".toColorInt(),
            textColor  = "#4E342E".toColorInt()
        )
        in 4..6 -> TitleStyle(
            startColor = "#ECEFF1".toColorInt(),
            endColor   = "#CFD8DC".toColorInt(),
            strokeColor= "#607D8B".toColorInt(),
            textColor  = "#263238".toColorInt()
        )
        in 7..9 -> TitleStyle(
            startColor = "#FFF8E1".toColorInt(),
            endColor   = "#FFE082".toColorInt(),
            strokeColor= "#F9A825".toColorInt(),
            textColor  = "#5D4037".toColorInt()
        )
        else -> TitleStyle( // 10+
            startColor = "#EDE7F6".toColorInt(),
            endColor   = "#D1C4E9".toColorInt(),
            strokeColor= "#7E57C2".toColorInt(),
            textColor  = "#4A148C".toColorInt()
        )
    }

    /** 称号の背景、枠線 */
    private fun badgeBackground(style: TitleStyle, isCurrent: Boolean) =
        GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            intArrayOf(style.startColor, style.endColor)
        ).apply {
            cornerRadius = dp(14).toFloat()
            setStroke(if (isCurrent) 3 else 2, if (isCurrent) style.strokeColor else "#BDBDBD".toColorInt())
        }

    // ====== 小ヘルパ ======
    private fun setMenuClicks(vararg ids: Int) = ids.forEach { id ->
        findViewById<TextView?>(id)?.setOnClickListener { toast("この機能は現在準備中です") }
    }

    private fun readLocalUser(): User? =
        prefs.getString("user_data", null)?.let {
            runCatching { Gson().fromJson(it, User::class.java) }.getOrNull()
        }

    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) =
        Toast.makeText(this, msg, length).show()

    /** ログアウト */
    private fun logout() {
        prefs.edit {
            remove("user_data")   // ← KTX拡張。apply()不要
        }
        startActivity(
            Intent(this, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
        )
        finish()
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
