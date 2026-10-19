package com.flowexa.app.ui.diagnostics

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.ui.theme.FlowexaBg
import com.flowexa.app.ui.theme.FlowexaBlue
import com.flowexa.app.ui.theme.FlowexaGreen
import com.flowexa.app.ui.theme.TextSecondary

/**
 * A crash was captured on a previous launch (see CrashReporter). Show it instead of
 * silently closing, so the user can report what happened and continue.
 */
@Composable
fun CrashReportScreen(
    report: String,
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(24.dp))
        Text(
            text = "عذراً، حدث خطأ غير متوقع",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = FlowexaBlue,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "سيتم حفظ بياناتك محلياً. يمكنك المتابعة أو مشاركة التقرير التالي مع الدعم:",
            fontSize = 14.sp,
            color = TextSecondary,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(16.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Text(
                text = report,
                fontSize = 11.sp,
                color = TextSecondary,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp)
            )
        }
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = onContinue,
            colors = ButtonDefaults.buttonColors(containerColor = FlowexaGreen),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("متابعة", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(12.dp))
    }
}

/**
 * Firebase is not initialized (google-services.json missing). This is a configuration
 * problem, not a code problem — show a clear message instead of a silent black screen.
 */
@Composable
fun FirebaseNotConfiguredScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FlowexaBg)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(64.dp))
        Icon(
            Icons.Default.Warning,
            contentDescription = null,
            tint = FlowexaBlue,
            modifier = Modifier.size(64.dp)
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = "التطبيق غير مهيأ",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = FlowexaBlue,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "تعذر العثور على إعدادات Firebase (google-services.json).\nأعد تثبيت التطبيق أو تواصل مع الدعم.",
            fontSize = 14.sp,
            color = TextSecondary,
            textAlign = TextAlign.Center
        )
    }
}