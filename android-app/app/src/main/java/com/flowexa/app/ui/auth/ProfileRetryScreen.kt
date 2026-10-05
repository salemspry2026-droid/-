package com.flowexa.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.ui.theme.FlowexaBg
import com.flowexa.app.ui.theme.FlowexaBlue

/**
 * Shown when the user IS signed in but the profile could not be loaded (offline / transient error)
 * and nothing is cached. The user is never silently pushed into onboarding in that situation.
 */
@Composable
fun ProfileRetryScreen(
    isRetrying: Boolean,
    onRetry: () -> Unit,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "تعذر تحميل بياناتك",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = FlowexaBlue
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "تم تسجيل الدخول، لكن لا يمكن الوصول إلى ملفك الشخصي الآن. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.",
            fontSize = 14.sp,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(24.dp))
        if (isRetrying) {
            CircularProgressIndicator(color = FlowexaBlue)
        } else {
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text("إعادة المحاولة") }
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("تسجيل الخروج") }
        }
    }
}
