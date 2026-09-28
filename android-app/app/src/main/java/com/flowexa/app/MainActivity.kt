package com.flowexa.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.flowexa.app.navigation.FlowexaApp
import com.flowexa.app.ui.theme.FlowexaTheme

class MainActivity : ComponentActivity() {

    private var initialCompanyId by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_Flowexa)
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        handleIntent(intent)

        setContent {
            FlowexaTheme {
                FlowexaApp(
                    initialCompanyId = initialCompanyId
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null) {
            val path = data.path ?: ""
            // Format: /c/{companyId}
            if (path.startsWith("/c/")) {
                val compId = path.removePrefix("/c/").trim()
                if (compId.isNotEmpty()) {
                    initialCompanyId = compId
                }
            }
        }
    }
}
