import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    kotlin("plugin.serialization") version "1.9.0"
}

android {
    namespace = "anct.procon.parashare"
    compileSdk = 36

    defaultConfig {
        applicationId = "anct.procon.parashare"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // ▼ MAPS_API_KEY の取得（gradle.properties / 環境変数 / local.properties）
        val mapsKey: String = run {
            providers.gradleProperty("MAPS_API_KEY").orNull
                ?: System.getenv("MAPS_API_KEY")
                ?: run {
                    val f = rootProject.file("local.properties")
                    if (f.exists()) {
                        val p = Properties()
                        f.inputStream().use { p.load(it) }
                        p.getProperty("MAPS_API_KEY")
                    } else null
                }
                ?: ""
        }
        // Manifest のプレースホルダに注入
        manifestPlaceholders["MAPS_API_KEY"] = mapsKey
        // ▲
    }

    buildFeatures {
        compose = true
        buildConfig = true // MAPS_API_KEY は入れない
    }

    signingConfigs {
        create("release") {
            storeFile = file("keystore/parashare-release.jks")
            storePassword = System.getenv("PS_STORE_PW")
                ?: providers.gradleProperty("PS_STORE_PW").orNull
                        ?: ""
            keyAlias = "parashare_release"
            keyPassword = System.getenv("PS_KEY_PW")
                ?: providers.gradleProperty("PS_KEY_PW").orNull
                        ?: ""
        }
    }

    // ★ buildTypes は1か所に統合
    buildTypes {
        getByName("debug") {
            isDebuggable = true
            isMinifyEnabled = false
            isShrinkResources = false
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
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
}

dependencies {
    val ktorVersion = "2.3.8"

    // Anim
    implementation("com.airbnb.android:lottie:6.4.0")

    // Ktor (Androidエンジンを使用)
    implementation("io.ktor:ktor-client-core:$ktorVersion")
    implementation("io.ktor:ktor-client-android:$ktorVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
    // Androidでは CIO は通常不要（使うなら android と二重は避ける）
    // implementation("io.ktor:ktor-client-cio:$ktorVersion")

    // Kotlinx Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    // Retrofit / OkHttp
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")

    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")

    // Activity（バージョン統一）
    implementation("androidx.activity:activity-ktx:1.9.0")

    // Compose/AndroidX（version catalog を使用）
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)

    // Google Maps/Location（重複を避け、片方に統一）
    // implementation(libs.play.services.maps) // ← 使用しない
    implementation("com.google.android.gms:play-services-maps:18.2.0")
    implementation("com.google.android.gms:play-services-location:21.0.1")

    // そのほか
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)

    // Test
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)

    // CameraX / ML Kit
    val camerax = "1.5.0"
    implementation("androidx.camera:camera-core:$camerax")
    implementation("androidx.camera:camera-camera2:$camerax")
    implementation("androidx.camera:camera-lifecycle:$camerax")
    implementation("androidx.camera:camera-view:$camerax")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
}
