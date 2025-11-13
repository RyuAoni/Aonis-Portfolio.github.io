package anct.procon.parashare

import com.google.android.gms.maps.model.LatLng
import kotlin.random.Random

enum class StandStatus {
    FEW, NORMAL, MANY
}

data class UmbrellaStand(
    val id: String,
    val name: String,
    val location: LatLng,
    var currentUmbrellas: Int,
    val capacity: Int = 10
) {
    fun getStatus(): StandStatus {
        val percentage = currentUmbrellas.toDouble() / capacity
        return when {
            percentage < 0.2 -> StandStatus.FEW
            percentage > 0.8 -> StandStatus.MANY
            else -> StandStatus.NORMAL
        }
    }
}

data class Umbrella(
    val id: String,
    val name: String, // 傘の名前
    val owner: String, // 傘の提供者
    var lastUser: String, // 最後に使った人
    var status: String, // "available" or "in_use"
    var message: String = "",
    // --- 活躍状況を記録するプロパティを追加 ---
    val usageCount: Int = Random.nextInt(1, 20),
    val userCount: Int = Random.nextInt(1, 10),
    val distanceKm: Double = Random.nextDouble(0.1, 50.0),
    val co2ReductionG: Int = usageCount * 23, // 適当な計算
    val niceShares: Int = Random.nextInt(5, 100)
)

object FakeDatabase {
    var rentedUmbrellaId: String? = null
        private set

    private val umbrellas = mutableMapOf(
        "para-001" to Umbrella("para-001", "izumiの傘", "izumi", "karage", "available", "前の傘です"),
        "para-002" to Umbrella("para-002", "nanamiの傘", "nanami", "saigetsu", "available", "大事に使ってね"),
        "para-003" to Umbrella("para-003", "kengoの傘", "kengo", "izumi", "in_use", "旅は道連れ"),
        // --- ログインユーザー（Karage）が作成した傘のダミーデータを追加 ---
        "para-101" to Umbrella("para-101", "Izu傘", "Karage", "nanami", "available", "徳島駅に置いていきます！"),
        "para-102" to Umbrella("para-102", "ジャンボ傘", "Karage", "kengo", "available", "大きいので濡れません"),
        "para-103" to Umbrella("para-103", "ひまわり", "Karage", "izumi", "in_use", "晴れの日も気分が良い")
    )

    val stands = mutableMapOf(
        "stand-tokushima-station" to UmbrellaStand(
            id = "stand-tokushima-station",
            name = "徳島駅前",
            location = LatLng(34.07346, 134.55395),
            currentUmbrellas = 1
        )
    )

    fun getUmbrella(id: String): Umbrella? = umbrellas[id]
    fun getUmbrellaStatus(id: String): String? = umbrellas[id]?.status

    fun rentUmbrella(id: String) {
        umbrellas[id]?.let {
            it.status = "in_use"
            rentedUmbrellaId = id
        }
    }

    fun returnUmbrella(standId: String): Umbrella? {
        val returnedUmbrella = rentedUmbrellaId?.let { umbrellas[it] }
        if (returnedUmbrella != null) {
            returnedUmbrella.status = "available"
            stands[standId]?.let { it.currentUmbrellas++ }
            rentedUmbrellaId = null
            return returnedUmbrella
        }
        return null
    }

    fun addUmbrella(id: String, owner: String, name: String, message: String) {
        if (umbrellas.containsKey(id)) {
            return
        }
        umbrellas[id] = Umbrella(id = id, name = name, owner = owner, lastUser = owner, status = "available", message = message)
    }

    // ▼▼▼ ここから追加 ▼▼▼
    /**
     * 指定された所有者（owner）が作成した傘のリストを取得する
     */
    fun getUmbrellasByOwner(ownerName: String): List<Umbrella> {
        return umbrellas.values.filter { it.owner == ownerName }
    }
    // ▲▲▲ ここまで追加 ▲▲▲
}