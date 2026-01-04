# Preserve line numbers for deobfuscated stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Optimize for R8
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# AdMob Rules
-keep public class com.google.android.gms.ads.** { *; }
-keep public class com.google.ads.** { *; }
-keep interface com.google.android.gms.ads.** { *; }

# Keep JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Jsoup Rules
-keep class org.jsoup.** { *; }

# Room Rules
-keep class * extends androidx.room.RoomDatabase
-keep class * extends com.acesur.faizbul.data.local.** { *; }
-keep class androidx.room.** { *; }
-dontwarn androidx.room.**

# Keep Data Models (to prevent issues with serialization/reflection)
-keep class com.acesur.faizbul.data.** { *; }

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepnames class kotlinx.coroutines.android.AndroidExceptionPreHandler {}
-keepnames class kotlinx.coroutines.android.AndroidDispatcherFactory {}
-keepnames class retrofit2.KotlinExtensions$suspendAndThrow$1 {}

# WorkManager
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.ListenableWorker

# App specific
-keep class com.acesur.faizbul.ui.viewmodels.** { *; }