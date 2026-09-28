# Flowexa Proguard Rules
-keepattributes *Annotation*
-keepclassmembers class * {
    @androidx.room.* <methods>;
    @androidx.room.* <fields>;
}
-dontwarn com.google.firebase.**
-keep class com.flowexa.app.data.local.entity.** { *; }
-keep class com.flowexa.app.data.remote.** { *; }
