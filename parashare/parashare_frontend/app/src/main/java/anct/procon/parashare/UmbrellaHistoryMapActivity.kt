// app/src/main/java/anct/procon/parashare/UmbrellaHistoryMapActivity.kt
package anct.procon.parashare

import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import anct.procon.parashare.network.JourneyPoint
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.PolylineOptions

class UmbrellaHistoryMapActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var map: GoogleMap
    private var journeyPoints: ArrayList<JourneyPoint>? = null

    /** 画面生成 */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_umbrella_history_map)

        @Suppress("DEPRECATION")
        journeyPoints = intent.getSerializableExtra("JOURNEY_POINTS") as? ArrayList<JourneyPoint>

        findViewById<Button>(R.id.button_close).setOnClickListener { finish() }
        findViewById<TextView>(R.id.text_view_umbrella_name).text = "旅傘の記録"

        (supportFragmentManager.findFragmentById(R.id.map) as SupportMapFragment)
            .getMapAsync(this)
    }

    /** 地図の準備完了で呼ばれるコールバック */
    override fun onMapReady(googleMap: GoogleMap) {
        map = googleMap.also { it.uiSettings.isZoomControlsEnabled = true }

        val raw = journeyPoints ?: return
        val latLngs = raw.mapNotNull { LatLng(it.latitude, it.longitude) }
        if (latLngs.isEmpty()) return

        // 先に描画だけやる
        if (latLngs.size >= 2) {
            map.addPolyline(
                PolylineOptions().addAll(latLngs).width(12f).color(Color.BLUE).geodesic(true)
            )
            map.addMarker(MarkerOptions().position(latLngs.first()).title("開始地点"))
            map.addMarker(MarkerOptions().position(latLngs.last()).title("現在地"))

            // ★地図ロード完了後にカメラ移動★
            map.setOnMapLoadedCallback {
                val bounds = LatLngBounds.Builder().apply { latLngs.forEach { include(it) } }.build()
                map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 150))
            }
        } else {
            map.addMarker(MarkerOptions().position(latLngs.first()).title("現在地"))
            map.setOnMapLoadedCallback {
                map.animateCamera(CameraUpdateFactory.newLatLngZoom(latLngs.first(), 15f))
            }
        }
    }
}
