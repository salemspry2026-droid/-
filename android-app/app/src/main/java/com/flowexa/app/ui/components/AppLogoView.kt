package com.flowexa.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import com.flowexa.app.R

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
                Text(
                    text = "FLOWEXA",
                    fontSize = (size * 0.42).sp,
                    fontWeight = FontWeight.Black,
                    color = FlowexaBlue,
                    letterSpacing = 1.sp
                )
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
