// app/src/main/java/anct/procon/parashare/TitleSelectActivity.kt
package anct.procon.parashare

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.core.graphics.toColorInt
import androidx.core.content.edit
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import anct.procon.parashare.network.*
import com.google.gson.Gson
import kotlinx.coroutines.launch

@Suppress("SetTextI18n")
class TitleSelectActivity : AppCompatActivity() {

    private lateinit var list: RecyclerView
    private lateinit var emptyView: TextView
    private lateinit var progress: View

    private var idUser: Int = 0
    private var currentLocalTitleId: Int? = null

    private val prefs by lazy { getSharedPreferences("user_prefs", Context.MODE_PRIVATE) }
    private val gson by lazy { Gson() }

    private enum class UiState { LOADING, LIST, EMPTY }

    /** 画面生成 */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_title_select)

        list = findViewById(R.id.recycler_titles)
        emptyView = findViewById(R.id.empty_text)
        progress = findViewById(R.id.progress)

        list.layoutManager = GridLayoutManager(this, 2)

        idUser = intent.getIntExtra("id_user", 0)
        if (idUser <= 0) {
            toast("ユーザー情報が見つかりません")
            finish()
            return
        }

        currentLocalTitleId = readLocalUser()?.idTitle
        fetchTitles()
    }

    /** 称号一覧を取得、UI反映 */
    private fun fetchTitles() {
        setState(UiState.LOADING)
        lifecycleScope.launch {
            runCatching {
                val res = ApiClient.apiService.getAvailableTitles(UserIdRequest(idUser))
                if (!res.isSuccessful) error("HTTP ${res.code()}: ${res.errorBody()?.string().orEmpty()}")
                res.body() ?: error("Empty body")
            }.onSuccess { body ->
                if (!body.ok) {
                    toast(body.error ?: "取得に失敗しました")
                    setState(UiState.EMPTY)
                    return@onSuccess
                }

                val titles = body.titles.orEmpty()
                if (titles.isEmpty()) {
                    setState(UiState.EMPTY)
                } else {
                    list.adapter = TitleAdapter(
                        titles = titles,
                        currentId = currentLocalTitleId,
                        onSelect = { dto -> saveTitle(dto.idTitle) }
                    )
                    setState(UiState.LIST)
                }
            }.onFailure { e ->
                toast("通信エラー: ${e.message}")
                setState(UiState.EMPTY)
            }
        }
    }

    /** 選択した称号を保存 */
    private fun saveTitle(idTitle: Int) {
        setState(UiState.LOADING)
        lifecycleScope.launch {
            runCatching {
                val res = ApiClient.apiService.setTitle(SetTitleRequest(id_user = idUser, idTitle = idTitle))
                if (!res.isSuccessful) error("HTTP ${res.code()}: ${res.errorBody()?.string().orEmpty()}")
                res.body() ?: error("Empty body")
            }.onSuccess { body ->
                if (body.ok) {
                    updateLocalTitle(idTitle)
                    toast("称号を変更しました")
                    finish() // MyPageはonResumeで再取得
                } else {
                    toast(body.error ?: "保存に失敗しました")
                    setState(UiState.LIST)
                }
            }.onFailure { e ->
                toast("通信エラー: ${e.message}")
                setState(UiState.LIST)
            }
        }
    }

    /** 称号のスタイル */
    private data class TitleStyle(
        val startColor: Int,
        val endColor: Int,
        val strokeColor: Int,
        val textColor: Int
    )

    /** レベルによって色を決定 */
    private fun styleForLevel(level: Int): TitleStyle = when (level) {
        in 1..3 -> TitleStyle( // Bronze
            startColor = "#FFF3E0".toColorInt(),
            endColor   = "#FFE0B2".toColorInt(),
            strokeColor= "#F57C00".toColorInt(),
            textColor  = "#4E342E".toColorInt()
        )
        in 4..6 -> TitleStyle( // Silver
            startColor = "#ECEFF1".toColorInt(),
            endColor   = "#CFD8DC".toColorInt(),
            strokeColor= "#607D8B".toColorInt(),
            textColor  = "#263238".toColorInt()
        )
        in 7..9 -> TitleStyle( // Gold
            startColor = "#FFF8E1".toColorInt(),
            endColor   = "#FFE082".toColorInt(),
            strokeColor= "#F9A825".toColorInt(),
            textColor  = "#5D4037".toColorInt()
        )
        else -> TitleStyle(   // Master+
            startColor = "#EDE7F6".toColorInt(),
            endColor   = "#D1C4E9".toColorInt(),
            strokeColor= "#7E57C2".toColorInt(),
            textColor  = "#4A148C".toColorInt()
        )
    }

    /** 指定スタイルよって背景を生成 */
    private fun badgeBackground(style: TitleStyle, isCurrent: Boolean) =
        GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            intArrayOf(style.startColor, style.endColor)
        ).apply {
            cornerRadius = 14.dp().toFloat()
            setStroke(
                if (isCurrent) 3.dp() else 2.dp(),
                if (isCurrent) style.strokeColor else "#BDBDBD".toColorInt()
            )
        }

    /** 称号一覧アダプター */
    private inner class TitleAdapter(
        private val titles: List<TitleDto>,
        private val currentId: Int?,
        private val onSelect: (TitleDto) -> Unit
    ) : RecyclerView.Adapter<TitleVH>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TitleVH {
            val v = LayoutInflater.from(parent.context)
                .inflate(android.R.layout.simple_list_item_2, parent, false)
            return TitleVH(v)
        }

        override fun getItemCount() = titles.size

        override fun onBindViewHolder(holder: TitleVH, position: Int) {
            holder.bind(titles[position], titles[position].idTitle == currentId, onSelect)
        }
    }

    /** 称号名、必要レベル表示、現在の称号を強調 */
    private inner class TitleVH(v: View) : RecyclerView.ViewHolder(v) {
        private val t1 = v.findViewById<TextView>(android.R.id.text1)
        private val t2 = v.findViewById<TextView>(android.R.id.text2)

        fun bind(dto: TitleDto, isCurrent: Boolean, onSelect: (TitleDto) -> Unit) {
            val style = styleForLevel(dto.levelRequired)

            val prefix = when (dto.levelRequired) {
                in 7..9 -> "🏆 "
                in 10..Int.MAX_VALUE -> "👑 "
                else -> ""
            }

            t1.text = buildString { append(prefix); append(dto.titleName) }
            t2.text = "必要レベル ${dto.levelRequired} / タップで選択"
            t2.setTextColor(Color.DKGRAY)

            t1.background = badgeBackground(style, isCurrent)
            t1.setPadding(10.dp(), 6.dp(), 10.dp(), 6.dp())
            t1.setTextColor(if (isCurrent) style.strokeColor else style.textColor)

            itemView.setOnClickListener { onSelect(dto) }
        }
    }

    /** 画面の表示状態をまとめて切り替え */
    private fun setState(state: UiState) {
        progress.isVisible = state == UiState.LOADING
        list.isVisible     = state == UiState.LIST
        emptyView.isVisible= state == UiState.EMPTY
    }

    private fun Int.dp(): Int = (this * resources.displayMetrics.density).toInt()

    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) =
        Toast.makeText(this, msg, length).show()

    /** ユーザーを取得 */
    private fun readLocalUser(): User? =
        prefs.getString("user_data", null)
            ?.let { runCatching { gson.fromJson(it, User::class.java) }.getOrNull() }

    private fun updateLocalTitle(idTitle: Int) {
        readLocalUser()?.let { u ->
            prefs.edit {
                putString("user_data", gson.toJson(u.copy(idTitle = idTitle)))
            }
        }
    }
}
