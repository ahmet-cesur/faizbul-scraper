# Preserve line numbers for deobfuscated stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep JavaScript Interfaces
-keepclassmembers class com.acesur.faizbul.ui.components.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}

-keepclassmembers class com.acesur.faizbul.background.BackgroundJsInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Jsoup
-keep class org.jsoup.** { *; }

# Keep Room generated code
-keep class * extends androidx.room.RoomDatabase
-keep class * extends com.acesur.faizbul.data.local.** { *; }