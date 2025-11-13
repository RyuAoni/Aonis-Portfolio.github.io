// app/src/main/java/anct/procon/parashare/MakeUmbrellaActivity.kt
package anct.procon.parashare

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MakeUmbrellaActivity : AppCompatActivity() {

    // CameraX スキャナ（登録用）を起動して結果を受け取る
    private val scanForRegister = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { res ->
        if (res.resultCode == RESULT_OK) {
            val scanned = res.data?.getStringExtra("qr")
            if (scanned.isNullOrBlank()) {
                Toast.makeText(this, "読み取り失敗", Toast.LENGTH_LONG).show()
                return@registerForActivityResult
            }
            forwardToRegister(parseUmbrellaId(scanned))
        } else {
            Toast.makeText(this, "スキャンをキャンセルしました", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_make_umbrella)

        // QrCodeActivity から既にIDが渡されている場合はスキャンを省略
        intent.getStringExtra("qr_code")?.let { preScanned ->
            forwardToRegister(parseUmbrellaId(preScanned))
            finish()
            return
        }

        // 「QRをスキャン」ボタンで CameraX スキャナを起動
        findViewById<Button>(R.id.scan_qr_button).setOnClickListener {
            scanForRegister.launch(Intent(this, CameraXScanActivity::class.java))
        }

        NavigationUtil.setupBottomNavigationBar(this)
    }

    /** 登録画面へ遷移 */
    private fun forwardToRegister(qrId: String) {
        startActivity(
            Intent(this, RegisterUmbrellaActivity::class.java).apply {
                // RegisterUmbrellaActivity が期待しているキー名を維持
                putExtra("SCANNED_ID", qrId)
            }
        )
    }

    /** URLでもIDでも受け取れるように整形 */
    private fun parseUmbrellaId(scanned: String): String {
        val prefix = "http://153.125.137.180/umbrella/"
        return if (scanned.startsWith(prefix)) scanned.substringAfter(prefix) else scanned
    }
}
