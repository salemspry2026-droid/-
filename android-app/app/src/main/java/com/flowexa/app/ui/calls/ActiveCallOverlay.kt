package com.flowexa.app.ui.calls

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.service.CallRecorder
import com.flowexa.app.ui.theme.FlowexaBlue
import com.flowexa.app.ui.theme.FlowexaBlueLight
import com.flowexa.app.ui.theme.FlowexaGreen
import kotlinx.coroutines.delay

/**
 * Full-screen overlay shown while an incoming/simulated call is active. Records the call with
 * [CallRecorder] and reports the saved file + duration through [onSaveRecording].
 */
@Composable
fun ActiveCallOverlay(
    contact: CallContact,
    onSaveRecording: (java.io.File, Long) -> Unit,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    val recorder = remember { CallRecorder(context) }
    val startedAtMs = remember { System.currentTimeMillis() }
    var elapsedSecs by remember { mutableStateOf(0L) }

    fun finish(saved: java.io.File?) {
        if (saved != null) {
            val secs = (System.currentTimeMillis() - startedAtMs) / 1000
            onSaveRecording(saved, secs)
        } else {
            // Discarded: remove the partial recording file left behind.
            try { recorder.file?.delete() } catch (_: Exception) {}
        }
        onClose()
    }

    DisposableEffect(recorder) {
        var ok = false
        try {
            ok = recorder.start()
        } catch (_: Exception) {
            ok = false
        }
        if (!ok) onClose()
        onDispose {
            recorder.release()
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            elapsedSecs = (System.currentTimeMillis() - startedAtMs) / 1000
            delay(500)
        }
    }

    Surface(modifier = Modifier.fillMaxSize(), color = FlowexaBlue) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "مكالمة نشطة",
                color = androidx.compose.ui.graphics.Color.White,
                fontSize = 14.sp
            )
            Spacer(Modifier.height(16.dp))
            Surface(shape = CircleShape, color = FlowexaBlueLight, modifier = Modifier.size(88.dp)) {
                Column(verticalArrangement = Arrangement.Center, modifier = Modifier.fillMaxSize()) {
                    Text(
                        text = contact.name.take(1).uppercase(),
                        color = FlowexaBlue,
                        fontSize = 34.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            if (contact.name.isNotBlank()) {
                Text(
                    text = contact.name,
                    color = androidx.compose.ui.graphics.Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            if (contact.tel.isNotBlank()) {
                Text(
                    text = contact.tel,
                    color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.8f),
                    fontSize = 16.sp
                )
            }
            Spacer(Modifier.height(24.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = {
                        // Stop and, when a valid file was captured, save it.
                        finish(recorder.stop())
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen)
                ) {
                    Icon(Icons.Default.Save, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("حفظ التسجيل", fontSize = 14.sp)
                }
                TextButton(onClick = {
                    // Discard the recording and just close.
                    recorder.release()
                    finish(null)
                }) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White)
                    Spacer(Modifier.size(4.dp))
                    Text("إنهاء", color = androidx.compose.ui.graphics.Color.White, fontSize = 14.sp)
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(
                text = "⏱ ${elapsedSecs / 60}:${(elapsedSecs % 60).toString().padStart(2, '0')}",
                color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.9f),
                fontSize = 14.sp
            )
        }
    }
}