package com.flowexa.app.service

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

/** Microphone recorder used by the call overlay (same capability as the web MediaRecorder flow). */
class CallRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    var file: File? = null
        private set

    fun start(): Boolean = try {
        val dir = File(context.filesDir, "call_recordings").apply { mkdirs() }
        val out = File(dir, "rec_${System.currentTimeMillis()}.m4a")
        val r = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else @Suppress("DEPRECATION") MediaRecorder()
        r.setAudioSource(MediaRecorder.AudioSource.MIC)
        r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        r.setOutputFile(out.absolutePath)
        r.prepare()
        r.start()
        recorder = r
        file = out
        true
    } catch (e: Exception) {
        release()
        false
    }

    /** Stops recording; returns the saved file or null when nothing valid was captured. */
    fun stop(): File? {
        val f = file
        try { recorder?.stop() } catch (_: Exception) { f?.delete(); release(); return null }
        release()
        return f
    }

    fun release() {
        try { recorder?.release() } catch (_: Exception) {}
        recorder = null
    }
}
