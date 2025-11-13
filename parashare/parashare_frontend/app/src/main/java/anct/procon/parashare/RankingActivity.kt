// app/src/main/java/anct/procon/parashare/RankingActivity.kt
package anct.procon.parashare

import android.os.Bundle
import android.text.Spannable
import android.text.SpannableString
import android.text.style.RelativeSizeSpan
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class RankingActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ranking)

        // 1位のランキング項目のTextViewを取得する例
        val rankingPointsTextView: TextView = findViewById(R.id.ranking_points)

        // 数字と文字を分ける
        val points = "699"
        val label = "NP"
        val fullText = points + label

        // SpannableStringを作成
        val spannableString = SpannableString(fullText)

        // 「NP」の部分にRelativeSizeSpanを適用
        spannableString.setSpan(
            RelativeSizeSpan(0.7f), // ★元のサイズの70%に
            points.length, // 「NP」の開始位置
            fullText.length, // 「NP」の終了位置
            Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
        )

        NavigationUtil.setupBottomNavigationBar(this)

        // 中央の丸ボタンの外側（コンテナ）をタップしても遷移できるようにする
        findViewById<LinearLayout>(R.id.center_action_container)?.setOnClickListener {
            findViewById<View>(R.id.qrread_button_view)?.performClick()
        }

        // TextViewに適用
        rankingPointsTextView.text = spannableString
    }
}