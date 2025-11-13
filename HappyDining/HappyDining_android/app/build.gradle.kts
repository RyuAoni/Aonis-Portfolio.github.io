// app/build.gradle.kts の内容をこれに完全に置き換える

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose) // Composeプラグイン
    id("kotlin-parcelize") // Parcelizeプラグイン
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.example.happydining"
    compileSdk = 36 // libs.versions.compileSdk を参照

    defaultConfig {
        applicationId = "com.example.happydining"
        minSdk = libs.versions.minSdk.get().toInt() // libs.versions.minSdk を参照
        targetSdk = libs.versions.targetSdk.get().toInt() // libs.versions.targetSdk を参照
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    // 依存関係はlibs.versions.toml経由で参照されます

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom)) // Compose BOM
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose) // Navigation Compose

    // ViewModel のCompose統合 (libs.versions.toml に定義されています)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
    // Java 8+ APIのデシュガーリング
    coreLibraryDesugaring(libs.desugar.jdk.libs) // libs.versions.tomlから参照
    //implementation("io.github.jan-tennert.supabase:gotrue-kt:3.2.2")
    implementation("androidx.room:room-runtime:2.7.2")
    implementation("androidx.room:room-ktx:2.7.2") // Coroutinesサポート用
    ksp("androidx.room:room-compiler:2.7.2") // アノテーションプロセッサ
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.2")
    implementation("androidx.datastore:datastore-preferences:1.1.7")
    implementation("com.squareup.retrofit2:retrofit:3.0.0")
    implementation("com.squareup.retrofit2:converter-gson:3.0.0")
    //implementation(platform("io.github.jan-tennert.supabase:bom:3.2.2"))
    //implementation("io.github.jan-tennert.supabase:gotrue-kt")
    //implementation("io.ktor:ktor-client-android")
    //implementation("io.github.jan-tennert.supabase:supabase-kt") // createSupabaseClient を含む core モジュール
    //implementation("io.github.jan-tennert.supabase:gotrue-kt")   // GoTrue 認証用
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("io.coil-kt:coil-compose:2.7.0")
    //implementation("io.github.jan-tennert.supabase:gotrue")
    //implementation("io.github.jan-tennert.supabase:postgrest")
    //implementation("io.github.jan-tennert.supabase:storage")
    //implementation("io.github.jan-tennert.supabase:realtime")
    //implementation("io.github.jan-tennert.supabase:functions")
}