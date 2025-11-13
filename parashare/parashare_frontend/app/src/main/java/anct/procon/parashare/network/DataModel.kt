// app\src\main\java\anct\procon\parashare\network\DataModel.kt
package anct.procon.parashare.network

import com.google.gson.annotations.SerializedName
import java.io.Serializable

// ───────────── Storage / Home ─────────────
/** ホーム画面 */
data class Storage(
    @SerializedName("id_storage") val id: String,
    @SerializedName("adress_latitude") val latitude: Double,
    @SerializedName("adress_longitude") val longitude: Double,
    @SerializedName("number") val currentUmbrellas: Int,
    @SerializedName("max") val maxUmbrellas: Int,
    @SerializedName("storage_name") val name: String?
)

// ───────────── Borrow / PreBorrow / Return ─────────────
/** 貸出前確認レスポンス */
data class PreBorrowResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("item") val item: UmbrellaInfo?,
    @SerializedName("error") val error: String?
)

/** 貸出前確認で返る傘の情報 */
data class UmbrellaInfo(
    @SerializedName("id_umbrella") val umbrellaId: Int,
    @SerializedName("name_umbrella") val umbrellaName: String?,
    @SerializedName("id_user") val makerId: Int,
    @SerializedName("status") val status: Int,
    @SerializedName("maker_name") val makerName: String?,
    @SerializedName("message") val message: String?
)

/** 貸出リクエスト */
data class BorrowRequest(
    @SerializedName("qr_address") val qrAddress: String,
    @SerializedName("user_id")    val userId: Int,
    @SerializedName("latitude")   val latitude: Double? = null,
    @SerializedName("longitude")  val longitude: Double? = null
)

/** 貸出レスポンス */
data class BorrowResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("id_history") val idHistory: Int? = null,
    @SerializedName("id_umbrella") val idUmbrella: Int? = null,
    @SerializedName("distance_added_km") val distanceAddedKm: Double? = null,
    @SerializedName("distance_components") val distanceComponents: DistanceComponents? = null
){
    data class DistanceComponents(
        @SerializedName("user_to_storage_km")  val userToStorageKm: Double? = null,
        @SerializedName("return_to_borrow_km") val returnToBorrowKm: Double? = null
    )
}

/** 返却リクエスト */
data class ReturnRequest(
    @SerializedName("qr_address") val qrAddress: String,
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("id_user") val userId: Int
)

/** 返却レスポンス */
data class ReturnResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("id_history") val idHistory: Int?,
    @SerializedName("id_umbrella") val idUmbrella: Int?,
    @SerializedName("id_owner") val idOwner: Int?,
    @SerializedName("name_owner") val ownerName: String?,
    @SerializedName("detail") val detail: Int?, // 1:少ない, 2:丁度いい, 3:多い
    @SerializedName("point") val point: Int?,
    @SerializedName("title") val title: String?,
    @SerializedName("storage_name") val storageName: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("points_breakdown") val pointsBreakdown: List<PointDelta>? = null,
    @SerializedName("co_delta_g") val coDeltaG: Int? = null
)

// ───────────── My Umbrella / Detail ─────────────
/** 自分の傘一覧レスポンス */
data class MyUmbrellasResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("items") val items: List<MyUmbrellaDto>?,
    @SerializedName("error") val error: String?,
    @SerializedName("message") val message: String? = null
)

/** 自分の傘一件の概要 */
data class MyUmbrellaDto(
    @SerializedName("id_umbrella") val idUmbrella: Int?,
    @SerializedName("name_umbrella") val nameUmbrella: String?,
    @SerializedName("distance") val distance: Double?, // サーバのキーに合わせる
    @SerializedName("num") val num: Int?,
    @SerializedName("co") val co: Int?,
    @SerializedName("user_count") val userCount: Int? = null,
    @SerializedName("niceShares") val niceShares: Int? = null
)

// ───────────── User / Auth ─────────────
/** アプリ内で使うユーザー情報 */
data class User(
    @SerializedName("id_user") val idUser: Int,
    val mail: String,
    val name: String,
    val point: Int,
    val type: Int,
    @SerializedName("id_title") val idTitle: Int,
    val co: Int
)

/** アカウント作成に使うボディ */
data class CreateUserRequest(
    val mail: String,
    val password: String,
    @SerializedName("password_confirm") val passwordConfirm: String
)

/** アカウント作成レスポンス */
data class CreateUserResponse(
    val ok: Boolean,
    val user: UserBasics?,
    val message: String?,
    val error: String?
)

/** 最小限のユーザー情報 */
data class UserBasics(
    @SerializedName("id_user") val idUser: Int,
    val mail: String
)

/** 表示名登録・更新用ボディ */
data class UserNameRequest(
    @SerializedName("id_user") val idUser: Int,
    val name: String
)

/** ユーザー情報レスポンス */
data class UserResponse(
    val ok: Boolean,
    val user: User?,
    val message: String?,
    val error: String?
)

/** ログインボディ */
data class LoginRequest(
    val mail: String,
    val password: String
)

// ───────────── Journey（履歴マップ） ─────────────
/** 傘の移動履歴要求 */
data class JourneyRequest(
    @SerializedName("id_umbrella") val umbrellaId: Int
)

/** 経路上のポイント */
data class JourneyPoint(
    @SerializedName("adress_latitude") val latitude: Double,   // サーバ側キー表記に合わせる
    @SerializedName("adress_longitude") val longitude: Double  // サーバ側キー表記に合わせる
) : Serializable

// ───────────── My Page / Titles ─────────────
/** マイページ取得リクエスト */
data class MyPageRequest(
    @SerializedName("id_user") val idUser: Int
)

/** マイページ取得レスポンス */
data class MyPageResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("profile") val profile: UserProfileDto?,
    @SerializedName("error") val error: String? = null
)

/** マイページ表示用プロファイル */
data class UserProfileDto(
    @SerializedName("id_user") val idUser: Int,
    @SerializedName("name") val name: String,
    @SerializedName("level") val level: Int,
    @SerializedName("level_progress") val levelProgress: Int, // 0..100
    @SerializedName("co") val co: Int,
    @SerializedName("title_name") val titleName: String?
)

// ───────────── NiceShare ─────────────
/** ナイシェア送信用ボディ */
data class NiceShareRequest(
    @SerializedName("id_umbrella") val umbrellaId: Int,
    @SerializedName("id_history") val historyId: Int,
    @SerializedName("id_user_from") val userIdFrom: Int
)

/** ナイシェア結果 */
data class NiceShareResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String?
)

// ───────────── Titles ─────────────
/** ユーザーIDのみ送るシンプルなボディ */
data class UserIdRequest(
    @SerializedName("id_user") val idUser: Int
)

/** 解放済み称号一件 */
data class TitleDto(
    @SerializedName(value = "id_title",       alternate = ["idTitle"])
    val idTitle: Int,
    @SerializedName(value = "title_name",     alternate = ["titleName"])
    val titleName: String,
    @SerializedName(value = "level_required", alternate = ["levelRequired"])
    val levelRequired: Int
)

/** 称号一覧レスポンス */
data class MyTitlesResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("titles") val titles: List<TitleDto>?,
    @SerializedName("error") val error: String?
)

/** 称号設定用のボディ */
data class SetTitleRequest(
    @SerializedName("id_user") val id_user: Int,
    @SerializedName("id_title") val idTitle: Int
)

// ───────────── Common ─────────────
/** 単純な成功・失敗レスポンス */
data class BasicResponse(
    @SerializedName("ok") val ok: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("error") val error: String? = null
)

/** ポイント内訳　一項目 */
data class PointDelta(
    @SerializedName("label") val label: String,
    @SerializedName("delta") val delta: Int
)

// ───────────── Register ─────────────
data class RegisterUmbrellaRequest(
    @SerializedName("name_umbrella") val nameUmbrella: String,
    @SerializedName("qr_address")    val qrAddress: String,
    @SerializedName("message")       val message: String,
    @SerializedName("owner")         val owner: Int,
    @SerializedName("latitude")      val latitude: Double,
    @SerializedName("longitude")     val longitude: Double
)

data class RegisterUmbrellaResponse(
    @SerializedName("ok")           val ok: Boolean,
    @SerializedName("message")      val message: String? = null,
    @SerializedName("id_umbrella")  val idUmbrella: Int? = null,
    @SerializedName("error")        val error: String? = null
)

// ───────────── Comment ─────────────

data class PostCommentRequest(
    @SerializedName("id_user")     val userId: Int,
    @SerializedName("id_umbrella") val umbrellaId: Int,
    @SerializedName("comment")     val comment: String
)

data class BasicOkResponse(
    @SerializedName("ok")       val ok: Boolean,
    @SerializedName("message")  val message: String? = null,
    @SerializedName("error")    val error: String? = null
)

data class CommentListRequest(
    @SerializedName("id_umbrella") val umbrellaId: Int
)

data class CommentItem(
    @SerializedName("id_comment") val idComment: Int,
    @SerializedName("id_user")    val userId: Int,
    @SerializedName("user_name")  val userName: String?,
    @SerializedName("comment")    val comment: String,
    @SerializedName("time")       val time: String
)

data class CommentListResponse(
    @SerializedName("ok")    val ok: Boolean,
    @SerializedName("items") val items: List<CommentItem>?,
    @SerializedName("error") val error: String? = null
)