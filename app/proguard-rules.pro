# Moshi Kotlin reflection
-keepclassmembers class kotlin.Metadata { *; }
-dontwarn org.jetbrains.annotations.**

# Retrofit / OkHttp
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod

# Hilt
-keepclasseswithmembernames class * { @dagger.hilt.android.* <fields>; }

# Keep model classes used via Moshi reflection
-keep @com.squareup.moshi.JsonClass class * { *; }
-keep class com.hhg.farmers.data.model.** { *; }

# Firebase / Play services — standard rules shipped via consumer rules, extra safety:
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# WebView @JavascriptInterface methods are only ever called by name from JS.
# R8 can't see those call-sites, so without this rule release builds would
# rename `onFarmerIdChanged` and the web→native farmerId bridge would silently
# stop firing in v6 on release APKs. Keep the whole bridge class + methods.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.hhg.farmers.ui.screens.web.** { *; }
