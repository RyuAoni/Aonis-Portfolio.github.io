package anct.procon.parashare

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.ImageView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class QrCodeActivity : AppCompatActivity() {

    // 旅傘を使う（貸出）
    private val scanForUse = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { res ->
        if (res.resultCode == RESULT_OK) {
            val scanned = res.data?.getStringExtra("qr") ?: return@registerForActivityResult
            val id = parseUmbrellaId(scanned)
            launchRentalConfirmation(id)
        } else {
            Toast.makeText(this, "スキャンをキャンセルしました", Toast.LENGTH_SHORT).show()
        }
    }

    // 旅傘を作る（登録）
    private val scanForRegister = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { res ->
        if (res.resultCode == RESULT_OK) {
            val scanned = res.data?.getStringExtra("qr") ?: return@registerForActivityResult
            val id = parseUmbrellaId(scanned)
            launchMakeUmbrella(id)
        } else {
            Toast.makeText(this, "スキャンをキャンセルしました", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_code)

        // 既存UIはそのまま
        findViewById<Button>(R.id.use_umbrella_button).setOnClickListener {
            scanForUse.launch(Intent(this, CameraXScanActivity::class.java))
        }
        findViewById<ImageView>(R.id.qrread_button_view)?.setOnClickListener {
            scanForUse.launch(Intent(this, CameraXScanActivity::class.java))
        }
        findViewById<Button>(R.id.create_umbrella_button).setOnClickListener {
            scanForRegister.launch(Intent(this, CameraXScanActivity::class.java))
        }

        NavigationUtil.setupBottomNavigationBar(this)
    }

    private fun parseUmbrellaId(scanned: String): String {
        val prefix = "http://153.125.137.180/umbrella/"
        return if (scanned.startsWith(prefix)) scanned.substringAfter(prefix) else scanned
    }

    private fun launchRentalConfirmation(qrId: String) {
        val intent = Intent(this, RentalConfirmationActivity::class.java).apply {
            putExtra("qr_code", qrId)
        }
        startActivity(intent)
        // この画面は残す（戻れるように）。従来どおり閉じたいなら finish()
    }

    private fun launchMakeUmbrella(qrId: String) {
        val intent = Intent(this, MakeUmbrellaActivity::class.java).apply {
            putExtra("qr_code", qrId)
        }
        startActivity(intent)
    }
}
