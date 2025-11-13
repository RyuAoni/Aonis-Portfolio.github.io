// // app/src/main/java/anct/procon/parashare/CreationCompleteActivity.kt
package anct.procon.parashare

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout

/** activity_creation_complete.xmlを表示 */
class CreationCompleteActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_creation_complete)

        findViewById<ConstraintLayout>(R.id.main_layout).setOnClickListener {
            startActivity(
                Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
            )
            finish()
        }

        NavigationUtil.setupBottomNavigationBar(this)
    }
}
