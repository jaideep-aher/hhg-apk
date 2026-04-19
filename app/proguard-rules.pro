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
