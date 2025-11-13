// app/src/main/java/anct/procon/parashare/RegisterNameActivity.kt
package anct.procon.parashare

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.core.content.edit
import androidx.appcompat.app.AppCompatActivity
import anct.procon.parashare.network.ApiClient
import anct.procon.parashare.network.UserNameRequest
import anct.procon.parashare.network.UserResponse
import com.google.gson.Gson
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class RegisterNameActivity : AppCompatActivity() {

    private var userId: Int = -1

    /** 画面生成 */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register_name)

        userId = intent.getIntExtra("USER_ID", -1)
        if (userId == -1) {
            toast("ユーザー情報が不正です", Toast.LENGTH_LONG)
            finish()
            return
        }

        val nameEditText: EditText = findViewById(R.id.editTextName)
        val registerButton: Button = findViewById(R.id.buttonRegister)

        /** 登録ボタンの処理 */
        registerButton.setOnClickListener {
            val name = nameEditText.text.toString().trim()
            when {
                name.isEmpty() -> {
                    toast("名前を入力してください"); return@setOnClickListener
                }
                name.length > 100 -> {
                    toast("名前は100文字以内で入力してください"); return@setOnClickListener
                }
            }

            /** 名前登録実施(API)*/
            ApiClient.apiService.registerUserName(UserNameRequest(userId, name))
                .enqueue(object : Callback<UserResponse> {
                    override fun onResponse(call: Call<UserResponse>, response: Response<UserResponse>) {
                        val body = response.body()
                        if (response.isSuccessful && body?.ok == true) {
                            val user = body.user
                            if (user == null) {
                                toast("ユーザー情報の保存に失敗しました")
                                return
                            }
                            getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
                                .edit {
                                    putString("user_data", Gson().toJson(user))
                                    // 他の put/remove もこの中に書ける
                                }

                            toast("ようこそ、${user.name}さん！", Toast.LENGTH_LONG)
                            startActivity(
                                Intent(this@RegisterNameActivity, MainActivity::class.java).apply {
                                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                                }
                            )
                        } else {
                            toast(body?.error ?: "名前の登録に失敗しました", Toast.LENGTH_LONG)
                        }
                    }

                    override fun onFailure(call: Call<UserResponse>, t: Throwable) {
                        toast("通信エラー: ${t.message}", Toast.LENGTH_LONG)
                    }
                })
        }
    }

    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) {
        Toast.makeText(this, msg, length).show()
    }
}
