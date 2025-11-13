// app/src/main/java/anct/procon/parashare/NavigationUtil.kt
package anct.procon.parashare

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.view.View

/** 下部ナビゲーションバーのセットアップを行う共通オブジェクト */
object NavigationUtil {

    private const val SPONSOR_URL = "https://parashare.jp/sponser-web.html"
    private const val INSTALL_REQUEST_URL = "https://parashare.jp/customer-web.html"

    fun setupBottomNavigationBar(activity: Activity) {
        /** ホーム：URLは開かない。ホームに戻すだけ。 */
        activity.findViewById<View>(R.id.home_button)?.setOnClickListener { v ->
            if (activity !is MainActivity) {
                v.isEnabled = false; v.postDelayed({ v.isEnabled = true }, 250) // 連打ガード
                val intent = Intent(activity, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                }
                activity.startActivity(intent)
            }
        }

        /** 旅傘の記録 */
        activity.findViewById<View>(R.id.umlog_button)?.setOnClickListener { v ->
            if (activity !is MyUmbrellasActivity) {
                v.isEnabled = false; v.postDelayed({ v.isEnabled = true }, 250)
                val intent = Intent(activity, MyUmbrellasActivity::class.java)
                activity.startActivity(intent)
            }
        }

        /** 読み込む (中央のボタン) */
        activity.findViewById<View>(R.id.qrread_button_view)?.setOnClickListener { v ->
            if (activity !is QrCodeActivity) {
                v.isEnabled = false; v.postDelayed({ v.isEnabled = true }, 250)
                val intent = Intent(activity, QrCodeActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                }
                activity.startActivity(intent)
            }
        }

        /** ランキング */
        activity.findViewById<View>(R.id.ranking_button)?.setOnClickListener { v ->
            if (activity !is RankingActivity) {
                v.isEnabled = false; v.postDelayed({ v.isEnabled = true }, 250)
                val intent = Intent(activity, RankingActivity::class.java)
                activity.startActivity(intent)
            }
        }

        /** マイページ */
        activity.findViewById<View>(R.id.mypage_button)?.setOnClickListener { v ->
            if (activity !is MyPageActivity) {
                v.isEnabled = false; v.postDelayed({ v.isEnabled = true }, 250)
                val intent = Intent(activity, MyPageActivity::class.java)
                activity.startActivity(intent)
                activity.overridePendingTransition(0, 0)
            }
        }

        /** 広告要望（URLを外部ブラウザで開く） */
        activity.findViewById<View>(R.id.Sponser_add_Button)?.setOnClickListener { v ->
            v.isEnabled = false; v.postDelayed({ v.isEnabled = true }, 250)
            val i = Intent(Intent.ACTION_VIEW, Uri.parse(SPONSOR_URL))
            activity.startActivity(i)
        }

        /** 設置要望（URLを外部ブラウザで開く） */
        activity.findViewById<View>(R.id.putRequestButton)?.setOnClickListener { v ->
            v.isEnabled = false; v.postDelayed({ v.isEnabled = true }, 250)
            val i = Intent(Intent.ACTION_VIEW, Uri.parse(INSTALL_REQUEST_URL))
            activity.startActivity(i)
        }
    }
}
