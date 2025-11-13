// app\src\main\java\anct\procon\parashare\network\ApiClient.kt
package anct.procon.parashare.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/** APIクライアントのシングルトン */
object ApiClient {
    private const val BASE_URL = "https://parashare.jp/"

    /** API実装 */
    val apiService: ApiService by lazy {

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        /** OkHttpClientにインターセプターを追加 */
        val httpClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .build()

        /** Retrofitに作成したHttpClientをセット */
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(httpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}