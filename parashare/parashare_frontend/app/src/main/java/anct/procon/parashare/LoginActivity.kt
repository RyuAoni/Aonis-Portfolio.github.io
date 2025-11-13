// app/src/main/java/anct/procon/parashare/LoginActivity.kt
package anct.procon.parashare

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.edit
import androidx.appcompat.app.AppCompatActivity
import anct.procon.parashare.network.ApiClient
import anct.procon.parashare.network.LoginRequest
import anct.procon.parashare.network.UserResponse
import com.google.gson.Gson
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class LoginActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        val emailEditText: EditText = findViewById(R.id.editTextEmail)
        val passwordEditText: EditText = findViewById(R.id.editTextPassword)
        val loginButton: Button = findViewById(R.id.buttonLogin)
        val signUpTextView: TextView = findViewById(R.id.textViewSignUp)

        /**入力チェック、ユーザー保存 */
        loginButton.setOnClickListener {
            val email = emailEditText.text.toString().trim()
            val password = passwordEditText.text.toString().trim()
            if (email.isEmpty() || password.isEmpty()) {
                toast("メールアドレスとパスワードを入力してください")
                return@setOnClickListener
            }

            ApiClient.apiService.login(LoginRequest(email, password))
                .enqueue(object : Callback<UserResponse> {
                    override fun onResponse(
                        call: Call<UserResponse>,
                        response: Response<UserResponse>
                    ) {
                        val body = response.body()
                        if (response.isSuccessful && body?.ok == true) {
                            val user = body.user
                            if (user == null) {
                                toast("ユーザー情報の取得に失敗しました")
                                return
                            }
                            getSharedPreferences("user_prefs", Context.MODE_PRIVATE).edit {
                                putString("user_data", Gson().toJson(user))
                            }

                            startActivity(
                                Intent(this@LoginActivity, MainActivity::class.java).apply {
                                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                                }
                            )
                            finish()
                        } else {
                            toast(body?.error ?: "ログインに失敗しました", Toast.LENGTH_LONG)
                        }
                    }

                    override fun onFailure(call: Call<UserResponse>, t: Throwable) {
                        toast("通信エラー: ${t.message}", Toast.LENGTH_LONG)
                    }
                })
        }

        signUpTextView.setOnClickListener {
            startActivity(Intent(this, SignUpActivity::class.java))
        }
    }

    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) {
        Toast.makeText(this, msg, length).show()
    }
}
