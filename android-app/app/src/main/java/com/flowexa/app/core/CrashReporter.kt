package com.flowexa.app.core

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Persists the cause of an uncaught crash so the NEXT launch can show it on screen instead of the
 * app silently closing. The report contains only the stack trace, device model and app version.
 */
object CrashReporter {
    private const val PREFS = "flowexa_crash"
    private const val KEY = "last_crash"

    fun install(context: Context) {
        val app = context.applicationContext
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                val sw = StringWriter()
                error.printStackTrace(PrintWriter(sw))
                val version = try {
                    app.packageManager.getPackageInfo(app.packageName, 0).versionName
                } catch (_: Exception) { "?" }
                val report = buildString {
                    appendLine("الوقت: " + SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()))
                    appendLine("الجهاز: ${Build.MANUFACTURER} ${Build.MODEL} (Android ${Build.VERSION.RELEASE}, API ${Build.VERSION.SDK_INT})")
                    appendLine("إصدار التطبيق: $version")
                    appendLine("الخيط: ${thread.name}")
                    appendLine()
                    append(sw.toString().take(6000))
                }
                app.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, report).commit()
            } catch (t: Throwable) {
                Log.e("CrashReporter", "failed to persist crash", t)
            }
            previous?.uncaughtException(thread, error)
        }
    }

    fun pending(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply()
    }
}
