// app\src\main\java\anct\procon\parashare\network\PreloadedDataHolder.kt
package anct.procon.parashare.network

// LoadingActivityで事前に取得したデータを保持するためのシングルトンオブジェクト
object PreloadedDataHolder {
    var storages: List<Storage>? = null
    var error: Exception? = null
}