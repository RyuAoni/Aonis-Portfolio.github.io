package anct.procon.parashare

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import anct.procon.parashare.network.ApiClient
import anct.procon.parashare.network.RegisterUmbrellaRequest
import anct.procon.parashare.network.RegisterUmbrellaResponse
import anct.procon.parashare.network.User
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.gson.Gson
import kotlinx.coroutines.launch
import retrofit2.Response

class RegisterUmbrellaActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "RegisterUmbrella"
        private const val GENERIC_ERROR = "登録に失敗しました。時間をおいて再試行してください。"
    }

    private val prefs by lazy { getSharedPreferences("user_prefs", Context.MODE_PRIVATE) }

    /** 現在地の一時保持 */
    private var currentLat: Double? = null
    private var currentLon: Double? = null

    /** 位置権限リクエスト（Fine/Coarse 同時） */
    private val requestLocationPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { granted ->
        val ok = granted[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                granted[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (ok) acquireCurrentLocation() else toast("位置情報の権限が必要です")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register_umbrella)

        val user = readLocalUser() ?: return navigateToLogin("ログイン情報が見つかりません。再度ログインしてください。")

        val raw = intent.getStringExtra("SCANNED_ID") ?: return finishWithToast("不正なQRコードです")
        val scannedId = extractUmbrellaId(raw)

        val nameEdit: EditText = findViewById(R.id.umbrella_name_edit_text)
        val msgEdit: EditText  = findViewById(R.id.umbrella_message_edit_text)
        val createBtn: Button  = findViewById(R.id.create_button)

        nameEdit.setText("${user.name}さんの傘")

        ensureLocationReady()

        createBtn.setOnClickListener {
            val name = nameEdit.text.toString().trim()
            val message = msgEdit.text.toString()

            if (name.isBlank()) {
                toast("傘の名前を入力してください")
                return@setOnClickListener
            }
            val lat = currentLat
            val lon = currentLon
            if (lat == null || lon == null) {
                ensureLocationReady()
                toast("位置情報を取得しています。もう一度お試しください。")
                return@setOnClickListener
            }

            lifecycleScope.launch {
                val res = postRegister(
                    RegisterUmbrellaRequest(
                        nameUmbrella = name,
                        qrAddress    = scannedId,
                        message      = message,
                        owner        = user.idUser,
                        latitude     = lat,
                        longitude    = lon
                    )
                )
                if (res.first) {
                    toast("新しい旅傘「$name」を登録しました！", Toast.LENGTH_LONG)
                    startActivity(Intent(this@RegisterUmbrellaActivity, CreationCompleteActivity::class.java))
                    finish()
                } else {
                    toast(res.second, Toast.LENGTH_LONG)
                }
            }
        }

        NavigationUtil.setupBottomNavigationBar(this)
    }

    /** API呼び出し（Retrofit/ApiClient 統一） */
    private suspend fun postRegister(req: RegisterUmbrellaRequest): Pair<Boolean, String> {
        return try {
            val response: Response<RegisterUmbrellaResponse> = ApiClient.apiService.registerUmbrella(req)
            Log.d(TAG, "Status: ${response.code()}")

            if (response.isSuccessful) {
                val body = response.body()
                Log.d(TAG, "Body: ${Gson().toJson(body)}")
                if (body?.ok == true) {
                    true to (body.message ?: "登録しました")
                } else {
                    false to (body?.message ?: body?.error ?: GENERIC_ERROR)
                }
            } else {
                val errText = response.errorBody()?.string()
                Log.d(TAG, "ErrorBody: $errText")
                val parsed = runCatching { Gson().fromJson(errText, RegisterUmbrellaResponse::class.java) }.getOrNull()
                false to (parsed?.message ?: parsed?.error ?: GENERIC_ERROR)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network error", e)
            false to GENERIC_ERROR
        }
    }

    /** 権限を確認して現在地取得を準備 */
    private fun ensureLocationReady() {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED) {
            acquireCurrentLocation()
        } else {
            requestLocationPermission.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    /** FusedLocation で現在地を1回だけ取得 */
    private fun acquireCurrentLocation() {
        val fused = LocationServices.getFusedLocationProviderClient(this)
        try {
            val cts = CancellationTokenSource()
            fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
                .addOnSuccessListener { loc ->
                    if (loc != null) {
                        currentLat = loc.latitude
                        currentLon = loc.longitude
                        Log.d(TAG, "Location ok: $currentLat, $currentLon")
                    } else {
                        Log.w(TAG, "Location is null; fallback to lastLocation")
                        fused.lastLocation.addOnSuccessListener { last ->
                            if (last != null) {
                                currentLat = last.latitude
                                currentLon = last.longitude
                                Log.d(TAG, "LastLocation ok: $currentLat, $currentLon")
                            } else {
                                toast("位置情報を取得できませんでした")
                            }
                        }.addOnFailureListener {
                            toast("位置情報の取得に失敗しました")
                        }
                    }
                }
                .addOnFailureListener {
                    Log.e(TAG, "getCurrentLocation failed", it)
                    toast("位置情報の取得に失敗しました")
                }
        } catch (se: SecurityException) {
            Log.e(TAG, "Location permission error", se)
            toast("位置情報の権限がありません")
        }
    }

    /** QR の中から /umbrella/ の後ろを抽出（ドメイン・プロトコル問わず） */
    private fun extractUmbrellaId(raw: String): String {
        val idx = raw.indexOf("/umbrella/")
        return if (idx >= 0) raw.substring(idx + "/umbrella/".length) else raw
    }

    /** ログインユーザーを復元 */
    private fun readLocalUser(): User? =
        prefs.getString("user_data", null)?.let { runCatching { Gson().fromJson(it, User::class.java) }.getOrNull() }

    /** 画面遷移 & Toast */
    private fun navigateToLogin(msg: String) {
        toast(msg, Toast.LENGTH_LONG)
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }
    private fun finishWithToast(msg: String) { toast(msg, Toast.LENGTH_LONG); finish() }
    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) =
        Toast.makeText(this, msg, length).show()
}
