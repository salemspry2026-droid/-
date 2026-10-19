package com.flowexa.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.Image
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.painterResource
import com.flowexa.app.R
import com.flowexa.app.ui.theme.FlowexaBlue

@Composable
fun AppLogoView(
    modifier: Modifier = Modifier,
    size: Int = 56,
    showText: Boolean = true
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(size.dp)
                .clip(RoundedCornerShape((size / 4).dp)),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.flowexa_logo),
                contentDescription = "Flowexa Logo",
                modifier = Modifier.size(size.dp)
            )
        }

        if (showText) {
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                AppLogoText(fontSize = (size * 0.42).sp)
                Text(
                    text = "نُدير أعمالك .. ننمي مبيعاتك",
                    fontSize = (size * 0.18).sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

/** Web parity: AppLogoText (Flow = blue, e = green, x = purple, a = navy). */
@Composable
fun AppLogoText(fontSize: androidx.compose.ui.unit.TextUnit = 24.sp) {
    androidx.compose.runtime.CompositionLocalProvider(
        androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr
    ) {
        Text(
            text = androidx.compose.ui.text.buildAnnotatedString {
                withStyle(androidx.compose.ui.text.SpanStyle(color = Color(0xFF014DB5))) { append("Flow") }
                withStyle(androidx.compose.ui.text.SpanStyle(color = Color(0xFF14A34B))) { append("e") }
                withStyle(androidx.compose.ui.text.SpanStyle(color = Color(0xFF6711AB))) { append("x") }
                withStyle(androidx.compose.ui.text.SpanStyle(color = Color(0xFF051638))) { append("a") }
            },
            fontSize = fontSize,
            fontWeight = FontWeight.Black
        )
    }
}
