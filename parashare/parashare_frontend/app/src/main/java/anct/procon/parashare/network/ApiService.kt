// app\src\main\java\anct\procon\parashare\network\ApiService.kt
package anct.procon.parashare.network

import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/** Parashareサーバーとの通信 */
interface ApiService {

    // ───────────── Auth / User ─────────────
    /** ログイン */
    @POST("parashere/user_login.php")
    fun login(
        @Body request: LoginRequest
    ): Call<UserResponse>

    /** アカウント作成 */
    @POST("parashere/user_pass.php")
    fun createUser(
        @Body request: CreateUserRequest
    ): Call<CreateUserResponse>

    /** 表示名の登録、削除 */
    @POST("parashere/user_name.php")
    fun registerUserName(
        @Body request: UserNameRequest
    ): Call<UserResponse>

    // ───────────── Home / Storage ─────────────
    /** 傘立ての一覧を取得する */
    @GET("parashere/home.php")
    suspend fun getStorages(
    ): Response<List<Storage>>

    // ───────────── Borrow / Return ─────────────
    /** QRコードから傘の情報を取得（貸出前確認） */
    @GET("parashere/pre_borrow.php")
    suspend fun getUmbrellaInfoForBorrow(
        @Query("qr_address") qrAddress: String
    ): Response<PreBorrowResponse>

    /** 傘を借りる */
    @POST("parashere/borrow.php")
    suspend fun borrowUmbrella(
        @Body req: BorrowRequest
    ): Response<BorrowResponse>

    /** 傘を返却する */
    @POST("parashere/return.php")
    suspend fun returnUmbrella(
        @Body request: ReturnRequest
    ): Response<ReturnResponse>

    // ───────────── My Umbrella ─────────────
    /** 自分が登録した傘一覧 */
    @POST("parashere/my_umbrella.php")
    suspend fun getMyUmbrellas(
        @Body body: Map<String, Int>
    ): Response<MyUmbrellasResponse>

    /** 登録時に使用 */
    @POST("parashere/register.php")
    suspend fun registerUmbrella(
        @Body req: RegisterUmbrellaRequest
    ): Response<RegisterUmbrellaResponse>

    /** 傘詳細 */
    @GET("parashere/detail.php")
    suspend fun getUmbrellaDetails(
        @Query("id_umbrella") umbrellaId: Int
    ): Response<MyUmbrellaDto>

    /** 傘の移動履歴（座標リスト） */
    @POST("parashere/journey.php")
    suspend fun getUmbrellaJourney(
        @Body request: JourneyRequest
    ): Response<List<JourneyPoint>>

    /** ナイシェア送信 */
    @POST("parashere/niceshare.php")
    suspend fun sendNiceShare(
        @Body request: NiceShareRequest
    ): Response<NiceShareResponse>

    // ───────────── My Page ─────────────
    /** マイページ */
    @POST("parashere/my_page.php")
    suspend fun getMyPage(
        @Body req: MyPageRequest
    ): Response<MyPageResponse>

    // ───────────── Titles ─────────────
    /** 称号一覧画面 */
    @POST("parashere/my_titles.php")
    suspend fun getAvailableTitles(
        @Body req: UserIdRequest
    ): Response<MyTitlesResponse>

    /** 称号を設定する */
    @POST("parashere/set_title.php")
    suspend fun setTitle(
        @Body req: SetTitleRequest
    ): Response<BasicResponse>

    // ───────────── Comment ─────────────
    @POST("parashere/comment_add.php")
    suspend fun postComment(
        @Body req: PostCommentRequest
    ): Response<BasicOkResponse>

    @POST("parashere/comment_list.php")
    suspend fun getComments(
        @Body req: CommentListRequest
    ): Response<CommentListResponse>
}