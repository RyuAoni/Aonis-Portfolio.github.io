package anct.procon.parashare

import android.content.Context
import android.Manifest
import android.annotation.SuppressLint
import android.app.Dialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import anct.procon.parashare.network.ApiClient
import anct.procon.parashare.network.ReturnRequest
import anct.procon.parashare.network.Storage // APIモデルのStorageをインポート
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import kotlinx.coroutines.launch
import anct.procon.parashare.network.PreloadedDataHolder
import anct.procon.parashare.network.User
import com.google.gson.Gson
import android.widget.EditText
import android.net.Uri
import android.widget.ImageButton
import android.widget.LinearLayout
class MainActivity : AppCompatActivity(), OnMapReadyCallback, GoogleMap.OnCameraIdleListener {

    private lateinit var googleMap: GoogleMap
    private lateinit var topButton: Button
    private lateinit var returnButton: Button
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var userCurrentLocation: LatLng? = null
    private val LOCATION_PERMISSION_REQUEST_CODE = 1
    private var userLocationMarker: Marker? = null
    private val umbrellaMarkers = mutableListOf<Marker>()

    private lateinit var editTextLatitude: EditText
    private lateinit var editTextLongitude: EditText
    private lateinit var buttonUpdateLocation: Button
    private lateinit var buttonResetLocation: Button
    private lateinit var buttonToggleLocationPanel: ImageButton
    private lateinit var debugLocationLayout: LinearLayout


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        topButton = findViewById(R.id.top_button)
        returnButton = findViewById(R.id.return_button)

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        val mapFragment = supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)

        editTextLatitude = findViewById(R.id.edit_text_latitude)
        editTextLongitude = findViewById(R.id.edit_text_longitude)
        buttonUpdateLocation = findViewById(R.id.button_update_location)
        buttonResetLocation = findViewById(R.id.button_reset_location)
        buttonToggleLocationPanel = findViewById(R.id.button_toggle_location_panel)
        debugLocationLayout = findViewById(R.id.debug_location_layout)

        setupClickListeners()

        findViewById<ImageButton>(R.id.Sponser_add_Button)?.setOnClickListener {
            val url = "https://parashare.jp/sponser-web.html"
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
        findViewById<ImageButton>(R.id.putRequestButton)?.setOnClickListener {
            val url = "https://parashare.jp/customer-web.html"
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    override fun onResume() {
        super.onResume()
        updateUiState()
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        googleMap.setOnCameraIdleListener(this)

        // サーバーから傘立て情報を取得してマーカーを設置する
        fetchAndDisplayStorages()

        // マーカークリック時の処理
        googleMap.setOnMarkerClickListener { marker ->
            if (marker == userLocationMarker) {
                return@setOnMarkerClickListener false
            }

            val storage = marker.tag as? Storage
            if (storage != null) {
                showUmbrellaDetailsDialog(storage)
            }
            true
        }

        getDeviceLocationAndMoveCamera()
    }

    override fun onCameraIdle() {
        val zoom = googleMap.cameraPosition.zoom

        // ユーザー現在地マーカーのリサイズ
        resizeMarker(userLocationMarker, R.drawable.current_location_pin, zoom)

        // --- ここから修正 ---
        // 全ての傘立てマーカーを、それぞれの状態に合わせたアイコンでリサイズ
        umbrellaMarkers.forEach { marker ->
            val storage = marker.tag as? Storage
            if (storage != null) {
                // 在庫率を計算
                val ratio = if (storage.maxUmbrellas > 0) {
                    storage.currentUmbrellas.toFloat() / storage.maxUmbrellas.toFloat()
                } else {
                    0f
                }
                // 在庫率に応じたアイコンを再設定
                val iconResourceId = when {
                    ratio >= 0.8f -> R.drawable.red_umbrella_pin // 80%以上は「多い」
                    ratio <= 0.2f -> R.drawable.pin_blue // 20%以下は「少ない」
                    else -> R.drawable.pin_green // それ以外は「丁度いい」
                }
                resizeMarker(marker, iconResourceId, zoom)
            }
        }
        // --- ここまで修正 ---
    }

    /**
     * マーカーのアイコンを指定されたズームレベルに基づいてリサイズする
     */
    private fun resizeMarker(marker: Marker?, resourceId: Int, zoom: Float) {
        marker ?: return

        val bitmap = BitmapFactory.decodeResource(resources, resourceId) ?: return

        val scale = when {
            zoom >= 18.0f -> 1.2f
            zoom >= 16.0f -> 1.0f
            zoom >= 14.0f -> 0.8f
            zoom >= 12.0f -> 0.6f
            else -> 0.4f
        }

        val newWidth = (bitmap.width * scale).toInt()
        val newHeight = (bitmap.height * scale).toInt()

        if (newWidth <= 0 || newHeight <= 0) return

        try {
            val resizedBitmap = Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, false)
            marker.setIcon(BitmapDescriptorFactory.fromBitmap(resizedBitmap))
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * サーバーから傘立て情報を取得し、マップ上にマーカーとして表示する
     */
    private fun fetchAndDisplayStorages() {
        umbrellaMarkers.forEach { it.remove() }
        umbrellaMarkers.clear()

        val preloadedStorages = PreloadedDataHolder.storages
        if (preloadedStorages != null) {
            displayStoragesOnMap(preloadedStorages)
            // 一度使ったらデータをクリアする
            PreloadedDataHolder.storages = null
            PreloadedDataHolder.error = null // エラー情報もクリア
            return
        }

        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getStorages()

                if (response.isSuccessful) {
                    val storages = response.body()
                    storages?.let { storageList ->
                        for (storage in storageList) {
                            val position = LatLng(storage.latitude, storage.longitude)
                            // MarkerOptionsではアイコンをまだ設定しない
                            val marker = googleMap.addMarker(
                                MarkerOptions()
                                    .position(position)
                                    .title(storage.name ?: "傘立て No.${storage.id}")
                            )
                            marker?.tag = storage
                            if (marker != null) {
                                umbrellaMarkers.add(marker)
                            }
                        }
                        // マーカー追加後に現在のズームレベルでサイズとアイコンを初回設定
                        onCameraIdle()
                    }
                } else {
                    Toast.makeText(this@MainActivity, "傘立て情報の取得に失敗", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "通信エラー: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * 取得した傘立てリストをマップに描画する共通処理
     */
    private fun displayStoragesOnMap(storageList: List<Storage>) {
        for (storage in storageList) {
            val position = LatLng(storage.latitude, storage.longitude)
            val marker = googleMap.addMarker(
                MarkerOptions()
                    .position(position)
                    .title(storage.name ?: "傘立て No.${storage.id}")
            )
            marker?.tag = storage
            if (marker != null) {
                umbrellaMarkers.add(marker)
            }
        }
        // マーカー追加後に現在のズームレベルでサイズとアイコンを初回設定
        onCameraIdle()
    }

    /**
     * 地図上の現在地ピンを更新する共通メソッド
     */
    private fun updateUserLocationOnMap(newLocation: LatLng) {
        userCurrentLocation = newLocation
        userLocationMarker?.remove() // 古いマーカーを削除

        userLocationMarker = googleMap.addMarker(
            MarkerOptions()
                .position(newLocation)
                .title("現在の位置")
                .icon(BitmapDescriptorFactory.fromResource(R.drawable.current_location_pin))
        )
        // マーカーサイズを現在のズームレベルに合わせる
        onCameraIdle()

        buttonResetLocation.setOnClickListener {
            // GPSから現在地を取得し直す既存のメソッドを呼び出すだけ
            getDeviceLocationAndMoveCamera()
            Toast.makeText(this, "現在地をGPS情報にリセットしました", Toast.LENGTH_SHORT).show()
        }

        // デモ用パネルの開閉ボタンのクリック処理
        buttonToggleLocationPanel.setOnClickListener {
            if (debugLocationLayout.visibility == View.VISIBLE) {
                // パネルが表示されていれば、非表示にする
                debugLocationLayout.visibility = View.GONE
            } else {
                // パネルが非表示なら、表示する
                debugLocationLayout.visibility = View.VISIBLE
            }
        }

    }

    @SuppressLint("MissingPermission")
    private fun getDeviceLocationAndMoveCamera() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), LOCATION_PERMISSION_REQUEST_CODE)
            return
        }

        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            val initialLatLng = if (location != null) {
                LatLng(location.latitude, location.longitude)
            } else {
                Toast.makeText(this, "現在地を取得できませんでした", Toast.LENGTH_SHORT).show()
                LatLng(34.07346, 134.55395) // 徳島駅の座標
            }
            // 新しい共通メソッドを呼び出す
            updateUserLocationOnMap(initialLatLng)
            googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(initialLatLng, 14f))
            // ▲▲▲ ここまで修正 ▲▲▲
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            LOCATION_PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    getDeviceLocationAndMoveCamera()
                } else {
                    Toast.makeText(this, "位置情報へのアクセスが拒否されました", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showUmbrellaDetailsDialog(storage: Storage) {
        val dialog = Dialog(this)
        dialog.setContentView(R.layout.dialog_umbrella_details)

        val titleTextView: TextView = dialog.findViewById(R.id.dialog_title)
        val countTextView: TextView = dialog.findViewById(R.id.dialog_umbrella_count)
        val moveAndShareTextView: TextView = dialog.findViewById(R.id.dialog_move_and_share)
        val closeButton: Button = dialog.findViewById(R.id.dialog_close_button)
        val umbrellaIcon: ImageView = dialog.findViewById(R.id.dialog_umbrella_icon)

        titleTextView.text = storage.name ?: "名称未設定の傘立て"

        // 1. 在庫率を計算
        val ratio = if (storage.maxUmbrellas > 0) {
            storage.currentUmbrellas.toFloat() / storage.maxUmbrellas.toFloat()
        } else {
            0f
        }

        // 2. 在庫率に応じて表示を切り替える
        val statusText: String
        val statusColor: Int
        val iconRes: Int

        when {
            // 80%以上は「多い」
            ratio >= 0.8f -> {
                statusText = "多い"
                statusColor = ContextCompat.getColor(this, R.color.status_red)
                iconRes = R.drawable.ic_umbrella_red
                moveAndShareTextView.visibility = View.VISIBLE // インセンティブ表示
            }
            // 20%以下は「少ない」
            ratio <= 0.2f -> {
                statusText = "少ない"
                statusColor = ContextCompat.getColor(this, R.color.status_blue)
                iconRes = R.drawable.ic_umbrella_blue
                moveAndShareTextView.visibility = View.GONE // インセンティブ非表示
            }
            // それ以外は「丁度いい」
            else -> {
                statusText = "丁度いい"
                statusColor = ContextCompat.getColor(this, R.color.status_green)
                iconRes = R.drawable.ic_umbrella_green
                moveAndShareTextView.visibility = View.GONE // インセンティブ非表示
            }
        }

        // 3. 決定した内容をViewに反映
        umbrellaIcon.setImageResource(iconRes)
        countTextView.text = "傘本数 : ${storage.currentUmbrellas}/${storage.maxUmbrellas}本 ${statusText}"
        countTextView.setTextColor(statusColor)


        closeButton.setOnClickListener {
            dialog.dismiss()
        }

        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.window?.setLayout(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)

        dialog.show()
    }

    private fun updateUiState() {
        val prefs = getSharedPreferences("ParasharePrefs", MODE_PRIVATE)
        val isBorrowing = prefs.getBoolean("is_borrowing", false)

        if (isBorrowing) {
            val umbrellaName = prefs.getString("borrowed_umbrella_name", "")
            topButton.text = "$umbrellaName を利用中です"
            topButton.background = ContextCompat.getDrawable(this, R.drawable.button_background_rented)
            returnButton.visibility = View.VISIBLE
        } else {
            topButton.text = "現在傘を借りていません"
            topButton.background = ContextCompat.getDrawable(this, R.drawable.button_background)
            returnButton.visibility = View.GONE
        }
    }

    private fun setupClickListeners() {
        NavigationUtil.setupBottomNavigationBar(this)

        topButton.setOnClickListener {
            val prefs = getSharedPreferences("ParasharePrefs", MODE_PRIVATE)
            if (!prefs.getBoolean("is_borrowing", false)) {
                val intent = Intent(this, QrCodeActivity::class.java)
                startActivity(intent)
            }
        }

        returnButton.setOnClickListener {
            handleReturn()
        }

        val returnPlaceButton = findViewById<ImageView>(R.id.return_place_button)
        returnPlaceButton?.setOnClickListener {
            userCurrentLocation?.let { location ->
                googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(location, 14f))
            } ?: run {
                Toast.makeText(this, "現在地がまだ取得できていません。", Toast.LENGTH_SHORT).show()
            }
        }

        buttonUpdateLocation.setOnClickListener {
            val latString = editTextLatitude.text.toString()
            val lonString = editTextLongitude.text.toString()

            if (latString.isBlank() || lonString.isBlank()) {
                Toast.makeText(this, "緯度と経度を入力してください", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            try {
                val newLocation = LatLng(latString.toDouble(), lonString.toDouble())
                updateUserLocationOnMap(newLocation)
                googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(newLocation, 16f))
                Toast.makeText(this, "現在地を更新しました", Toast.LENGTH_SHORT).show()
            } catch (e: NumberFormatException) {
                Toast.makeText(this, "正しい数値を入力してください", Toast.LENGTH_SHORT).show()
            }
        }

    }

    private fun handleReturn() {
        // 正しい保管庫 "user_prefs" を見るように修正
        val prefs = getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
        // 借りている傘のQRは "ParasharePrefs" にあるので、そちらも別途取得
        val rentalPrefs = getSharedPreferences("ParasharePrefs", MODE_PRIVATE)

        val borrowedQr = rentalPrefs.getString("borrowed_umbrella_qr", null)
        // "user_data" というキーでユーザー情報のJSON文字列を取得
        val userDataJson = prefs.getString("user_data", null)

        // --- 借りている傘のQRコードがない場合はエラー ---
        if (borrowedQr == null) {
            Toast.makeText(this, "エラー: 借りている傘の情報が見つかりません", Toast.LENGTH_LONG).show()
            return
        }

        // --- ユーザー情報が見つからない、または現在地が取得できていない場合はエラー ---
        if (userDataJson == null) {
            Toast.makeText(this, "エラー: ユーザー情報が見つかりません。再ログインしてください。", Toast.LENGTH_LONG).show()
            return
        }
        if (userCurrentLocation == null) {
            Toast.makeText(this, "現在地が取得できていません。少し待ってからもう一度お試しください。", Toast.LENGTH_LONG).show()
            return
        }

        // --- 取得したJSON文字列からユーザーIDを取り出す ---
        val user = Gson().fromJson(userDataJson, User::class.java)
        val loggedInUserId = user.idUser


        lifecycleScope.launch {
            try {
                // APIリクエストの作成
                val request = ReturnRequest(
                    qrAddress = borrowedQr,
                    latitude = userCurrentLocation!!.latitude,
                    longitude = userCurrentLocation!!.longitude,
                    userId = loggedInUserId
                )

                val response = ApiClient.apiService.returnUmbrella(request)

                if (response.isSuccessful && response.body()?.ok == true) {
                    Toast.makeText(this@MainActivity, "返却しました！", Toast.LENGTH_SHORT).show()

                    // 借りていた傘の情報を削除
                    val editor = rentalPrefs.edit()
                    editor.putBoolean("is_borrowing", false)
                    editor.remove("borrowed_umbrella_name")
                    editor.remove("borrowed_umbrella_qr")
                    editor.apply()

                    updateUiState()

                    val resultData = response.body()
                    val intent = Intent(this@MainActivity, ResultActivity::class.java).apply {
                        // レスポンスオブジェクトをJSON文字列に変換してIntentに追加
                        putExtra("RESULT_DATA_JSON", Gson().toJson(resultData))
                    }
                    startActivity(intent)

                } else {
                    val errorMsg = response.body()?.error ?: "返却に失敗しました"
                    val detail = response.body()?.detail ?: ""
                    Toast.makeText(this@MainActivity, "$errorMsg\n$detail", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "通信エラーが発生しました: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
}