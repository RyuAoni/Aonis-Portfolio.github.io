// app/src/main/java/anct/procon/parashare/SignUpActivity.kt
package anct.procon.parashare

import android.content.Intent
import android.os.Bundle
import android.util.Patterns
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import anct.procon.parashare.network.ApiClient
import anct.procon.parashare.network.CreateUserRequest
import anct.procon.parashare.network.CreateUserResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class SignUpActivity : AppCompatActivity() {

    private lateinit var emailEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var passwordConfirmEditText: EditText
    private lateinit var signUpButton: Button

    /** 画面生成 */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sign_up)

        emailEditText = findViewById(R.id.editTextEmail)
        passwordEditText = findViewById(R.id.editTextPassword)
        passwordConfirmEditText = findViewById(R.id.editTextPasswordConfirm)
        signUpButton = findViewById(R.id.buttonSignUp)

        signUpButton.setOnClickListener {
            val email = emailEditText.text.toString().trim()
            val pass = passwordEditText.text.toString().trim()
            val passConfirm = passwordConfirmEditText.text.toString().trim()

            if (!isValid(email, pass, passConfirm)) return@setOnClickListener

            ApiClient.apiService.createUser(CreateUserRequest(email, pass, passConfirm))
                .enqueue(object : Callback<CreateUserResponse> {
                    override fun onResponse(
                        call: Call<CreateUserResponse>,
                        response: Response<CreateUserResponse>
                    ) {
                        val body = response.body()
                        if (response.isSuccessful && body?.ok == true) {
                            val userId = body.user?.idUser
                            if (userId == null) {
                                toast("ユーザーIDが取得できませんでした")
                                return
                            }
                            toast(body.message ?: "アカウントを作成しました")
                            startActivity(
                                Intent(this@SignUpActivity, RegisterNameActivity::class.java)
                                    .putExtra("USER_ID", userId)
                            )
                            finish()
                        } else {
                            toast(body?.error ?: "アカウント作成に失敗しました", Toast.LENGTH_LONG)
                        }
                    }

                    override fun onFailure(call: Call<CreateUserResponse>, t: Throwable) {
                        toast("通信エラー: ${t.message}", Toast.LENGTH_LONG)
                    }
                })
        }
    }

    /** 入力されたメール・パスワード検証 */
    private fun isValid(email: String, pass: String, passConfirm: String): Boolean {
        if (email.isEmpty() || pass.isEmpty() || passConfirm.isEmpty()) {
            toast("すべての項目を入力してください"); return false
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            toast("メールアドレスの形式が正しくありません"); return false
        }
        if (pass.length < 6) {
            toast("パスワードは6文字以上で入力してください"); return false
        }
        if (pass != passConfirm) {
            toast("パスワードが一致しません"); return false
        }
        return true
    }

    private fun toast(msg: String, length: Int = Toast.LENGTH_SHORT) =
        Toast.makeText(this, msg, length).show()
}
