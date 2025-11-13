// app/src/main/java/anct/procon/parashare/RentalConfirmationActivity.kt
package anct.procon.parashare

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import anct.procon.parashare.network.ApiClient
import anct.procon.parashare.network.BorrowRequest
import anct.procon.parashare.network.BorrowResponse
import anct.procon.parashare.network.UmbrellaInfo
import anct.procon.parashare.network.User
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.gson.Gson
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class RentalConfirmationActivity : AppCompatActivity() {

    private lateinit var umbrellaIdTextView: TextView
    private lateinit var creatorNameTextView: TextView
    private lateinit var statusAvailableTextView: TextView
    private lateinit var statusInUseTextView: TextView
    private lateinit var messageTextView: TextView
    private lateinit var confirmButton: Button
    private lateinit var progressBar: ProgressBar

    // ===== 追加: ランタイム権限リクエストランチャー =====
    private val requestLocationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val granted = result.any { it.value } // FINE/COARSE のどちらかが許可
            // 借りる処理を再開（許可なら位置付き、拒否なら位置なしで続行）
            pendingBorrowQrCode?.let { qr ->
                lifecycleScope.launch { proceedBorrow(qr, useLocation = granted) }
            }
            pendingBorrowQrCode = null
        }
    private var pendingBorrowQrCode: String? = null

    /** 画面初期化 */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_rental_confirmation)

        NavigationUtil.setupBottomNavigationBar(this)

        umbrellaIdTextView      = findViewById(R.id.umbrella_id_text)
        creatorNameTextView     = findViewById(R.id.creatorNameTextView)
        statusAvailableTextView = findViewById(R.id.status_available_text)
        statusInUseTextView     = findViewById(R.id.status_in_use_text)
        messageTextView         = findViewById(R.id.message_text_view)
        confirmButton           = findViewById(R.id.confirm_button)
        progressBar             = findViewById(R.id.progressBar)

        val qrCode = intent.getStringExtra("qr_code")
            ?: return finishWithToast("QRコードが読み取れませんでした。")

        fetchUmbrellaInfo(qrCode)
    }

    /** 傘の現在情報取得、UI更新 */
    private fun fetchUmbrellaInfo(qrCode: String) {
        lifecycleScope.launch {
            setLoading(true)
            try {
                val res  = ApiClient.apiService.getUmbrellaInfoForBorrow(qrCode)
                val body = res.body()
                if (res.isSuccessful && body?.ok == true) {
                    val info = body.item
                    if (info == null) {
                        showError("傘の情報が見つかりません。")
                    } else {
                        updateUi(info)
                        confirmButton.setOnClickListener { borrowUmbrella(qrCode) }
                    }
                } else {
                    showError(body?.error ?: "登録されていないQRコードです。")
                }
            } catch (e: Exception) {
                Log.e("RentalConfirmation", "fetch error", e)
                showError("通信エラーが発生しました。")
            } finally {
                setLoading(false)
            }
        }
    }

    /** 借りるボタン押下 */
    private fun borrowUmbrella(qrCode: String) {
        // まず権限確認（lint 対応: checkSelfPermission）
        if (!hasLocationPermission()) {
            // 権限をリクエストして、結果コールバックで borrow を続行
            pendingBorrowQrCode = qrCode
            requestLocationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
            return
        }
        // 権限あり → 位置付きで続行
        lifecycleScope.launch { proceedBorrow(qrCode, useLocation = true) }
    }

    /** 実際の borrow 呼び出し（権限結果に応じて位置を付ける/付けない） */
    private suspend fun proceedBorrow(qrCode: String, useLocation: Boolean) {
        setLoading(true)
        try {
            val uid = readLocalUserId() ?: run {
                toast("ログイン情報が見つかりません。再ログインしてください。", Toast.LENGTH_LONG)
                setLoading(false)
                return
            }

            val (lat, lon) = if (useLocation) getOneShotLocation() else (null to null)

            val res  = ApiClient.apiService.borrowUmbrella(
                BorrowRequest(
                    qrAddress = qrCode,
                    userId    = uid,
                    latitude  = lat,
                    longitude = lon
                )
            )
            val body: BorrowResponse? = res.body()

            if (res.isSuccessful && body?.ok == true) {
                getSharedPreferences("ParasharePrefs", MODE_PRIVATE).edit().apply {
                    putBoolean("is_borrowing", true)
                    putString("borrowed_umbrella_name", umbrellaIdTextView.text.toString())
                    putString("borrowed_umbrella_qr", qrCode)
                }.apply()

                body.distanceAddedKm?.let {
                    toast(String.format("距離加算: %.2f km", it), Toast.LENGTH_SHORT)
                }

                toast("傘を借りました！", Toast.LENGTH_LONG)
                startActivity(
                    Intent(this@RentalConfirmationActivity, MainActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    }
                )
                finish()
            } else {
                val msg = body?.error ?: "貸出処理に失敗しました。（HTTP ${res.code()})"
                toast(msg, Toast.LENGTH_LONG)
                confirmButton.isEnabled = true
            }
        } catch (e: Exception) {
            Log.e("RentalConfirmation", "borrow error", e)
            toast("通信エラーが発生しました。", Toast.LENGTH_LONG)
            confirmButton.isEnabled = true
        } finally {
            setLoading(false)
        }
    }

    /** 権限があるか（FINE/COARSE のどちらかで可） */
    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    /** ワンショット現在地の取得（権限未付与や SecurityException を安全に処理） */
    private suspend fun getOneShotLocation(): Pair<Double?, Double?> = suspendCancellableCoroutine { cont ->
        // 権限未付与なら即 null を返して終了（lint 対応）
        if (!hasLocationPermission()) {
            cont.resume(null to null); return@suspendCancellableCoroutine
        }

        try {
            val fused = LocationServices.getFusedLocationProviderClient(this)
            fused.lastLocation
                .addOnSuccessListener { loc ->
                    if (loc != null) {
                        cont.resume(loc.latitude to loc.longitude)
                    } else {
                        // 1回だけ現在地取得（省電力優先）
                        val cts = CancellationTokenSource()
                        fused.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, cts.token)
                            .addOnSuccessListener { now -> cont.resume(now?.latitude to now?.longitude) }
                            .addOnFailureListener   { cont.resume(null to null) }
                    }
                }
                .addOnFailureListener { cont.resume(null to null) }
        } catch (se: SecurityException) {
            // 端末設定や権限状態の競合による SecurityException を握りつぶして安全に null 返却
            Log.w("RentalConfirmation", "Location SecurityException", se)
            cont.resume(null to null)
        } catch (t: Throwable) {
            Log.w("RentalConfirmation", "Location unexpected error", t)
            cont.resume(null to null)
        }
    }

    /** 取得した傘情報をUIにセット */
    private fun updateUi(umbrella: UmbrellaInfo) {
        umbrellaIdTextView.text = umbrella.umbrellaName ?: "名前のない旅傘"
        creatorNameTextView.text = "作成者: ${umbrella.makerName ?: "不明"}"
        messageTextView.text = umbrella.message ?: "メッセージはありません"

        when (umbrella.status) {
            1 -> {
                styleStatus(
                    active   = statusAvailableTextView to R.drawable.status_background_available,
                    inactive = statusInUseTextView     to R.drawable.status_background_default
                )
                confirmButton.isEnabled = true
                confirmButton.text = "借りる"
            }
            2 -> {
                styleStatus(
                    active   = statusInUseTextView     to R.drawable.status_background_in_use,
                    inactive = statusAvailableTextView to R.drawable.status_background_default
                )
                confirmButton.isEnabled = false
                confirmButton.text = "現在利用できません"
            }
            else -> {
                statusAvailableTextView.visibility = View.GONE
                statusInUseTextView.visibility = View.GONE
                confirmButton.isEnabled = false
                confirmButton.text = "現在利用できません"
            }
        }
    }

    /** ステータス切り替えをまとめたヘルパ */
    private fun styleStatus(active: Pair<TextView, Int>, inactive: Pair<TextView, Int>) {
        val (aView, aBg) = active
        val (iView, iBg) = inactive
        aView.apply {
            background = drawable(aBg)
            setTextColor(color(R.color.white))
            visibility = View.VISIBLE
        }
        iView.apply {
            background = drawable(iBg)
            setTextColor(color(R.color.black))
            visibility = View.VISIBLE
        }
    }

    /** エラー時にメッセージ表示、ホーム画面へ戻るボタンへ差し替え */
    private fun showError(message: String) {
        umbrellaIdTextView.text = "エラー"
        creatorNameTextView.text = message
        statusAvailableTextView.visibility = View.GONE
        statusInUseTextView.visibility = View.GONE
        messageTextView.visibility = View.GONE

        confirmButton.apply {
            isEnabled = true
            text = "ホームに戻る"
            setOnClickListener {
                startActivity(
                    Intent(this@RentalConfirmationActivity, MainActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    }
                )
                finish()
            }
        }
    }

    /** 小さなヘルパ */
    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        confirmButton.isEnabled = !loading
    }
    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) =
        Toast.makeText(this, msg, length).show()
    private fun color(id: Int) = ContextCompat.getColor(this, id)
    private fun drawable(id: Int) = ContextCompat.getDrawable(this, id)

    private fun finishWithToast(msg: String) {
        toast(msg, Toast.LENGTH_LONG)
        finish()
    }

    /** 端末に保存してあるユーザーIDを取り出す */
    private fun readLocalUserId(): Int? =
        getSharedPreferences("user_prefs", MODE_PRIVATE)
            .getString("user_data", null)
            ?.let { runCatching { Gson().fromJson(it, User::class.java).idUser }.getOrNull() }
}