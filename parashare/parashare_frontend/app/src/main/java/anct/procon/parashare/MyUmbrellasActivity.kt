// app/src/main/java/anct/procon/parashare/MyUmbrellasActivity.kt
package anct.procon.parashare

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import anct.procon.parashare.network.*
import com.google.gson.Gson
import kotlinx.coroutines.launch
import java.util.Locale

class MyUmbrellasActivity : AppCompatActivity() {

    private val prefs by lazy { getSharedPreferences("user_prefs", Context.MODE_PRIVATE) }
    private lateinit var container: LinearLayout
    private lateinit var inflater: LayoutInflater
    private var currentlyExpandedItem: View? = null

    companion object { private const val TAG = "MyUmbrellas" }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_my_umbrellas)

        setupNavigationBar()

        container = findViewById(R.id.umbrella_list_container)
        inflater = LayoutInflater.from(this)

        val user = readLocalUser()
            ?: return navigateToLoginWithToast("ユーザー情報の取得に失敗しました。再度ログインしてください。")

        fetchAndRender(user.idUser)
    }

    override fun onResume() {
        super.onResume()
        readLocalUser()?.let { fetchAndRender(it.idUser) }
    }

    private fun readLocalUser(): User? =
        prefs.getString("user_data", null)
            ?.let { runCatching { Gson().fromJson(it, User::class.java) }.getOrNull() }

    private fun fetchAndRender(userId: Int) {
        lifecycleScope.launch {
            runCatching {
                val res = ApiClient.apiService.getMyUmbrellas(mapOf("owner" to userId))
                if (!res.isSuccessful) error("HTTP ${res.code()}: ${res.errorBody()?.string().orEmpty()}")
                val body = res.body() ?: error("Empty body")
                if (body.ok || body.items.isNullOrEmpty()) body.items.orEmpty()
                else error(body.error ?: body.message ?: "unknown error")
            }.onSuccess { items ->
                val validItems = items.filter { it.idUmbrella != null }
                container.removeAllViews()
                if (validItems.isEmpty()) {
                    showEmptyState()
                    return@onSuccess
                }
                validItems.forEach { dto ->
                    val item = inflater.inflate(R.layout.list_item_my_umbrella, container, false)
                    bindUmbrellaData(item, dto.toUiModel())
                    container.addView(item)
                }
            }.onFailure { e ->
                Log.e(TAG, "一覧取得失敗", e)
                toast("一覧取得に失敗：${e.message}")
                showEmptyState()
            }
        }
    }

    data class UmbrellaUi(
        val id: Int,
        val name: String,
        val usageCount: Int,
        val userCount: Int,
        val distanceKm: Double,
        val co2ReductionG: Int,
        val niceShares: Int
    )

    private fun MyUmbrellaDto.toUiModel() = UmbrellaUi(
        id = idUmbrella!!,
        name = nameUmbrella ?: "(名称未設定)",
        usageCount = num ?: 0,
        userCount = userCount ?: 0,
        distanceKm = distance ?: 0.0,
        co2ReductionG = co ?: 0,
        niceShares = niceShares ?: 0
    )

    private fun bindUmbrellaData(itemView: View, umbrella: UmbrellaUi) {
        val name = itemView.findViewById<TextView>(R.id.text_umbrella_name)
        val detailsLayout = itemView.findViewById<LinearLayout>(R.id.details_layout)
        val mapViewButton = itemView.findViewById<Button>(R.id.map_button)

        // ★ 追加: コメントUI
        val commentButton = itemView.findViewById<Button?>(R.id.comments_button)
        val commentsBox   = itemView.findViewById<LinearLayout?>(R.id.comments_container)

        name.text = umbrella.name
        itemView.findViewById<TextView>(R.id.text_usage_count).text =
            "${umbrella.usageCount}回"
        itemView.findViewById<TextView>(R.id.text_distance).text =
            String.format(Locale.JAPAN, "%.1fkm", umbrella.distanceKm)
        itemView.findViewById<TextView>(R.id.text_co2_reduction).text =
            "${umbrella.co2ReductionG}g"
        itemView.findViewById<TextView>(R.id.text_niceshare_count).text =
            umbrella.niceShares.toString()

        itemView.findViewById<LinearLayout>(R.id.header_layout).setOnClickListener {
            toggleDetails(detailsLayout, itemView)
        }

        // マップ
        mapViewButton.setOnClickListener {
            lifecycleScope.launch {
                runCatching {
                    ApiClient.apiService.getUmbrellaJourney(JourneyRequest(umbrellaId = umbrella.id))
                }.onSuccess { res ->
                    if (res.isSuccessful) {
                        val points = res.body()
                        if (!points.isNullOrEmpty()) {
                            startActivity(
                                Intent(this@MyUmbrellasActivity, UmbrellaHistoryMapActivity::class.java).apply {
                                    putExtra("JOURNEY_POINTS", ArrayList(points))
                                }
                            )
                        } else {
                            toast("この傘の移動履歴はありません。")
                        }
                    } else {
                        Log.e(TAG, "API Error: ${res.errorBody()?.string()}")
                        toast("履歴の取得に失敗しました。")
                    }
                }.onFailure {
                    Log.e(TAG, "Network Error", it)
                    toast("通信エラーが発生しました。")
                }
            }
        }

        // ★ コメントを見る（初回ロード → 以降はトグル表示）
        commentButton?.setOnClickListener {
            val box = commentsBox ?: return@setOnClickListener
            if (box.visibility == View.VISIBLE) {
                box.visibility = View.GONE
                commentButton.text = "コメントを見る"
            } else {
                box.visibility = View.VISIBLE
                commentButton.text = "コメントを閉じる"

                if (box.tag != "loaded") {
                    box.removeAllViews()
                    box.addView(ProgressBar(box.context))
                    loadComments(box, umbrella.id)
                    box.tag = "loaded"
                }
            }
        }
    }

    private fun toggleDetails(detailsLayout: View, selectedItemView: View) {
        if (currentlyExpandedItem != null && currentlyExpandedItem != selectedItemView) {
            currentlyExpandedItem?.findViewById<LinearLayout>(R.id.details_layout)?.visibility = View.GONE
        }
        val visible = detailsLayout.visibility == View.VISIBLE
        detailsLayout.visibility = if (visible) View.GONE else View.VISIBLE
        currentlyExpandedItem = if (visible) null else selectedItemView
    }

    private fun setupNavigationBar() = NavigationUtil.setupBottomNavigationBar(this)

    private fun showEmptyState() {
        container.removeAllViews()
        val tv = TextView(this).apply {
            text = "旅傘はありません"
            textSize = 18f
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(48), dp(24), dp(48))
        }
        container.addView(
            tv,
            LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                topMargin = dp(16)
            }
        )
    }

    private fun navigateToLoginWithToast(msg: String) {
        toast(msg, Toast.LENGTH_LONG)
        startActivity(Intent(this, LoginActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        finish()
    }

    /** ★ コメント取得＆表示 */
    private fun loadComments(commentsContainer: LinearLayout, umbrellaId: Int) {
        lifecycleScope.launch {
            try {
                val res = ApiClient.apiService.getComments(CommentListRequest(umbrellaId))
                val body = res.body()

                commentsContainer.removeAllViews()

                if (res.isSuccessful && body?.ok == true) {
                    val items = body.items.orEmpty()
                    if (items.isEmpty()) {
                        commentsContainer.addView(TextView(commentsContainer.context).apply {
                            text = "コメントはありません"
                        })
                    } else {
                        items.forEach { c ->
                            commentsContainer.addView(
                                TextView(commentsContainer.context).apply {
                                    text = "${c.userName ?: "匿名"} : ${c.comment}   (${c.time})"
                                    textSize = 13f
                                }
                            )
                        }
                    }
                } else {
                    commentsContainer.addView(TextView(commentsContainer.context).apply {
                        text = body?.error ?: "コメント読み込みに失敗しました"
                    })
                }
            } catch (e: Exception) {
                commentsContainer.removeAllViews()
                commentsContainer.addView(TextView(commentsContainer.context).apply {
                    text = "読み込みエラー"
                })
            }
        }
    }

    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) =
        Toast.makeText(this, msg, length).show()

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
}
