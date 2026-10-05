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
import com.flowexa.app.core.AppConfig
import com.flowexa.app.navigation.DeepLink
import com.flowexa.app.navigation.DeepLinkParser
import com.flowexa.app.navigation.FlowexaApp
import com.flowexa.app.ui.theme.FlowexaTheme

class MainActivity : ComponentActivity() {

    private var pendingDeepLink by mutableStateOf<DeepLink?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_Flowexa)
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Only parse a launch intent once; after a configuration change / process restore the
        // same intent would otherwise be replayed.
        if (savedInstanceState == null) handleIntent(intent)

        setContent {
            FlowexaTheme {
                FlowexaApp(
                    deepLink = pendingDeepLink,
                    onDeepLinkHandled = { pendingDeepLink = null }
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
        val data: Uri = intent?.data ?: return
        val link = DeepLinkParser.parse(
            scheme = data.scheme,
            host = data.host,
            decodedPath = data.path,
            fullUrl = data.toString(),
            webHost = AppConfig.WEB_HOST,
            firebaseAuthHost = AppConfig.FIREBASE_AUTH_LINK_HOST
        )
        if (link != null) {
            pendingDeepLink = link
            // Consume the data so the same URI is not re-processed on re-creation.
            intent.data = null
        }
    }
}
