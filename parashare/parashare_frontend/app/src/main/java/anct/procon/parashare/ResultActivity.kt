// app/src/main/java/anct/procon/parashare/ResultActivity.kt
package anct.procon.parashare

import android.app.Dialog
import android.content.Context
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.toColorInt
import androidx.lifecycle.lifecycleScope
import anct.procon.parashare.network.*
import com.google.gson.Gson
import kotlinx.coroutines.launch
import java.util.Locale

class ResultActivity : AppCompatActivity() {

    private var returnedUmbrellaId: Int = -1
    private var returnedHistoryId: Int = -1

    /** 画面生成 */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_result)

        NavigationUtil.setupBottomNavigationBar(this)

        intent.getStringExtra("RESULT_DATA_JSON")?.let {
            runCatching { Gson().fromJson(it, ReturnResponse::class.java) }
                .onSuccess(::updateUi)
                .onFailure { toast("結果の表示に失敗しました") }
        } ?: toast("結果の表示に失敗しました")

        findViewById<ImageView>(R.id.btnSendNiceshare).setOnClickListener {
            if (returnedUmbrellaId == -1 || returnedHistoryId == -1) {
                toast("ナイシェアを送るための情報が不足しています")
                return@setOnClickListener
            }
            sendNiceShare(it)
        }

        findViewById<Button>(R.id.btn_umbrella_details).setOnClickListener {
            if (returnedUmbrellaId != -1) showUmbrellaRecordDialog()
            else toast("傘情報の取得に失敗しました")
        }

        val etThankYou = findViewById<EditText>(R.id.etThankYouMessage)
        val btnSendMsg = findViewById<Button>(R.id.btnSendMessage)

        btnSendMsg.setOnClickListener {
            val text = etThankYou.text?.toString()?.trim().orEmpty()
            if (text.isEmpty()) { toast("メッセージを入力してください"); return@setOnClickListener }
            if (text.length > 100) { toast("100文字以内で入力してください"); return@setOnClickListener }

            // non-null なローカル変数に閉じ込める
            val umid = returnedUmbrellaId.takeIf { it > 0 } ?: run {
                toast("傘情報がありません"); return@setOnClickListener
            }
            val uid = readLocalUserId() ?: run {
                toast("ユーザー情報がありません"); return@setOnClickListener
            }

            btnSendMsg.isEnabled = false
            lifecycleScope.launch {
                try {
                    val res = ApiClient.apiService.postComment(
                        PostCommentRequest(
                            userId = uid,           // ← Int（non-null）
                            umbrellaId = umid,      // ← Int（non-null）
                            comment = text
                        )
                    )
                    val body = res.body()
                    if (res.isSuccessful && body?.ok == true) {
                        toast("メッセージを送りました！")
                        etThankYou.setText("")
                    } else {
                        toast(body?.error ?: "送信に失敗しました", Toast.LENGTH_LONG)
                    }
                } catch (e: Exception) {
                    Log.e("ResultActivity", "postComment error", e)
                    toast("通信エラー: ${e.message}", Toast.LENGTH_LONG)
                } finally {
                    btnSendMsg.isEnabled = true
                }
            }
        }
    }

    /** 返却レスポンスをUIに反映 */
    private fun updateUi(data: ReturnResponse) {
        val standStatusIcon    = findViewById<ImageView>(R.id.stand_status_icon)
        val standStatusText    = findViewById<TextView>(R.id.stand_status_text)
        val bonusMessageArea   = findViewById<LinearLayout>(R.id.bonus_message_area)
        val sendNiceshareText  = findViewById<TextView>(R.id.send_niceshare_text)
        val umbrellaOwnerText  = findViewById<TextView>(R.id.umbrella_owner_text)
        val pointsEarnedText   = findViewById<TextView>(R.id.text_points_earned)
        val titleLayout        = findViewById<LinearLayout>(R.id.title_layout)
        val titleEarnedText    = findViewById<TextView>(R.id.text_title_earned)
        val returnedStandText  = findViewById<TextView>(R.id.text_returned_stand_name)

        returnedUmbrellaId = data.idUmbrella ?: -1
        returnedHistoryId  = data.idHistory ?: -1

        returnedStandText.text = "${data.storageName ?: "不明な傘立て"}に返却しました"

        /** 混雑状況によってUI変化 */
        when (data.detail) {
            1 -> {
                standStatusText.text = "傘の少ないスポットに置いた"
                standStatusIcon.setImageResource(R.drawable.ic_umbrella_spot_blue)
                bonusMessageArea.visibility = View.VISIBLE
            }
            3 -> {
                standStatusText.text = "傘の多いスポットに置いた"
                standStatusIcon.setImageResource(R.drawable.ic_umbrella_red)
                bonusMessageArea.visibility = View.GONE
            }
            else -> {
                standStatusText.text = "傘の数が適切なスポットに置いた"
                standStatusIcon.setImageResource(R.drawable.ic_umbrella_green)
                bonusMessageArea.visibility = View.GONE
            }
        }

        pointsEarnedText.text = "+${data.point ?: 0}pt"
        (pointsEarnedText.parent as? ViewGroup)?.let { parent ->
            renderPointsBreakdown(
                parent = parent,
                anchor = pointsEarnedText,
                breakdown = data.pointsBreakdown,
                totalPoint = data.point,
                coDeltaG = data.coDeltaG
            )
        }

        if (!data.title.isNullOrEmpty()) {
            titleLayout.visibility = View.VISIBLE
            titleEarnedText.text = "「${data.title}」を獲得しました"
        } else {
            titleLayout.visibility = View.GONE
        }

        val ownerName = data.ownerName ?: "不明なオーナー"
        sendNiceshareText.text = "${ownerName}にナイシェアを送ろう"
        umbrellaOwnerText.text = "${ownerName}さんの傘"
    }

    /** 取得ポイントの内訳カードを作成、UIに挿入 */
    private fun renderPointsBreakdown(
        parent: ViewGroup,
        anchor: View,
        breakdown: List<PointDelta>?,
        totalPoint: Int?,
        coDeltaG: Int?
    ) {
        val tag = "points_breakdown_container"
        (0 until parent.childCount)
            .asSequence()
            .map { parent.getChildAt(it) }
            .firstOrNull { it.tag == tag }
            ?.let { parent.removeView(it) }

        if (breakdown.isNullOrEmpty() && coDeltaG == null) return

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            this.tag = tag
            setPadding(dp(8), dp(8), dp(8), dp(4))
            background = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.RECTANGLE
                cornerRadius = dp(12).toFloat()
                setColor("#FAFAFA".toColorInt())
                setStroke(dp(1), "#E0E0E0".toColorInt())
            }
        }

        val header = TextView(this).apply {
            text = "ポイント内訳"
            setTextColor("#424242".toColorInt())
            textSize = 14f
            setPadding(0, 0, 0, dp(4))
        }
        container.addView(header, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)

        breakdown.orEmpty().forEach { item ->
            container.addView(makeRow(item.label, formatPt(item.delta)))
        }

        totalPoint?.let {
            container.addView(makeDivider())
            container.addView(makeRow("合計", formatPt(it), bold = true))
        }

        coDeltaG?.let {
            container.addView(TextView(this).apply {
                text = "CO₂参考: +${it} g"
                setTextColor("#757575".toColorInt())
                textSize = 12f
                setPadding(0, dp(6), 0, 0)
            })
        }

        parent.addView(
            container,
            parent.indexOfChild(anchor) + 1,
            ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        )
    }

    /** ラベル｜値　の横並び行を生成 */
    private fun makeRow(label: String, value: String, bold: Boolean = false): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(4), 0, dp(4))
        }
        val tvLabel = TextView(this).apply {
            text = label
            setTextColor("#616161".toColorInt())
            textSize = 14f
        }
        val tvValue = TextView(this).apply {
            text = value
            setTextColor("#0062FF".toColorInt())
            textSize = if (bold) 16f else 14f
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
        row.addView(tvLabel, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(tvValue, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        return row
    }

    /** 内訳カードに使う横罫線を生成 */
    private fun makeDivider(): View =
        View(this).apply {
            setBackgroundColor("#E0E0E0".toColorInt())
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(1)).apply {
                setMargins(0, dp(4), 0, dp(4))
            }
        }

    private fun formatPt(delta: Int): String = (if (delta >= 0) "+$delta" else "$delta") + "pt"
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    /** ナイシェアを送信 */
    private fun sendNiceShare(button: View) {
        val userIdFrom = readLocalUserId() ?: run {
            toast("ユーザー情報が見つかりません"); return
        }

        lifecycleScope.launch {
            try {
                val res = ApiClient.apiService.sendNiceShare(
                    NiceShareRequest(
                        umbrellaId = returnedUmbrellaId,
                        historyId = returnedHistoryId,
                        userIdFrom = userIdFrom
                    )
                )
                val body = res.body()
                if (res.isSuccessful && body?.ok == true) {
                    toast("ナイシェアが送られました！")
                    button.isEnabled = false
                    button.alpha = 0.5f
                } else {
                    toast(body?.error ?: "ナイシェアの送信に失敗しました", Toast.LENGTH_LONG)
                }
            } catch (e: Exception) {
                toast("通信エラー: ${e.message}", Toast.LENGTH_LONG)
            }
        }
    }

    /** id_userを取り出し */
    private fun readLocalUserId(): Int? =
        getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
            .getString("user_data", null)
            ?.let { runCatching { Gson().fromJson(it, User::class.java).idUser }.getOrNull() }

    /** 返却した傘の利用状況を表示 */
    private fun showUmbrellaRecordDialog() {
        val dialog = Dialog(this).apply {
            setContentView(R.layout.dialog_umbrella_record)
            window?.setBackgroundDrawable(ColorDrawable(android.graphics.Color.TRANSPARENT))
            window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }

        lifecycleScope.launch {
            try {
                val res = ApiClient.apiService.getUmbrellaDetails(returnedUmbrellaId)
                val data = res.body()
                if (res.isSuccessful && data != null) {
                    dialog.findViewById<TextView>(R.id.text_umbrella_name).text = data.nameUmbrella
                    dialog.findViewById<TextView>(R.id.text_usage_count).text = "${data.num}回"
                    dialog.findViewById<TextView>(R.id.text_distance).text = String.format(Locale.JAPAN, "%.1fkm", data.distance)
                    dialog.findViewById<TextView>(R.id.text_co2_reduction).text = "${data.co}g"
                    dialog.findViewById<TextView>(R.id.text_niceshare_count).text = data.niceShares.toString()
                    dialog.show()
                } else {
                    Log.e("ResultActivity", "API Error: ${res.errorBody()?.string()}")
                    toast("情報の取得に失敗")
                }
            } catch (e: Exception) {
                Log.e("ResultActivity", "Network Error", e)
                toast("通信エラー")
            }
        }

        dialog.findViewById<Button>(R.id.dialog_close_button).setOnClickListener { dialog.dismiss() }
    }

    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) =
        Toast.makeText(this, msg, length).show()
}
