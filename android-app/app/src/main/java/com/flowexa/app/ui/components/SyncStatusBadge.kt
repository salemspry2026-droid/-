package com.flowexa.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flowexa.app.ui.theme.FlowexaGreen
import com.flowexa.app.ui.theme.StatusCancelled
import com.flowexa.app.ui.theme.StatusPending

@Composable
fun SyncStatusBadge(
    isOnline: Boolean,
    pendingSyncCount: Int,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor, icon, label) = when {
        pendingSyncCount > 0 -> {
            Tuple4(
                Color(0xFFFEF3C7),
                StatusPending,
                Icons.Default.Sync,
                "$pendingSyncCount تغيير ينتظر المزامنة"
            )
        }
        !isOnline -> {
            Tuple4(
                Color(0xFFFEE2E2),
                StatusCancelled,
                Icons.Default.CloudOff,
                "بدون اتصال"
            )
        }
        else -> {
            Tuple4(
                Color(0xFFDCFCE7),
                FlowexaGreen,
                Icons.Default.CloudDone,
                "متصل ومزامن"
            )
        }
    }

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = textColor,
            modifier = Modifier.size(13.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            color = textColor
        )
    }
}

private data class Tuple4<A, B, C, D>(val a: A, val b: B, val c: C, val d: D)
