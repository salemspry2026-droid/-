package com.flowexa.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection

private val LightColorScheme = lightColorScheme(
    primary = FlowexaBlue,
    onPrimary = FlowexaSurface,
    primaryContainer = FlowexaBlueLight,
    onPrimaryContainer = FlowexaBlueDark,
    secondary = FlowexaGreen,
    onSecondary = FlowexaSurface,
    secondaryContainer = FlowexaGreenLight,
    onSecondaryContainer = FlowexaGreenDark,
    background = FlowexaBg,
    surface = FlowexaSurface,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    outline = FlowexaBorder
)

@Composable
fun FlowexaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(
            colorScheme = LightColorScheme,
            typography = FlowexaTypography,
            content = content
        )
    }
}
