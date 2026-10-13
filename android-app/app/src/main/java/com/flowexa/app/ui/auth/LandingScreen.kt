package com.flowexa.app.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.ui.components.AppLogoView
import com.flowexa.app.ui.theme.FlowexaBlue

@Composable
fun LandingScreen(
    onLoginClick: () -> Unit,
    onRegisterClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        AppLogoView(size = 120, showText = false)
        Spacer(modifier = Modifier.height(32.dp))
        Text(
            text = "أهلاً بك في Flowexa",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = FlowexaBlue
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "نُدير أعمالك .. ننمي مبيعاتك",
            fontSize = 16.sp,
            color = Color.Gray
        )
        Spacer(modifier = Modifier.height(48.dp))
        Button(
            onClick = onLoginClick,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = FlowexaBlue)
        ) {
            Text(text = "تسجيل الدخول", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = onRegisterClick,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, FlowexaBlue)
        ) {
            Text(text = "إنشاء حساب جديد", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = FlowexaBlue)
        }
    }
}
