package ch.prbank.banking.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = Tokens.Light.primary,
    onPrimary = Tokens.Light.onPrimary,
    background = Tokens.Light.background,
    onBackground = Tokens.Light.textPrimary,
    surface = Tokens.Light.surface,
    onSurface = Tokens.Light.textPrimary,
    surfaceVariant = Tokens.Light.surface,
    onSurfaceVariant = Tokens.Light.textSecondary,
    outline = Tokens.Light.border,
    error = Tokens.Light.danger,
)

private val DarkColors = darkColorScheme(
    primary = Tokens.Dark.primary,
    onPrimary = Tokens.Dark.onPrimary,
    background = Tokens.Dark.background,
    onBackground = Tokens.Dark.textPrimary,
    surface = Tokens.Dark.surface,
    onSurface = Tokens.Dark.textPrimary,
    surfaceVariant = Tokens.Dark.surface,
    onSurfaceVariant = Tokens.Dark.textSecondary,
    outline = Tokens.Dark.border,
    error = Tokens.Dark.danger,
)

/** App theme following the system light/dark setting (FR-62). */
@Composable
fun PrBankTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = AppTypography,
        content = content,
    )
}

/** Semantic colours not in the Material scheme. */
@Composable
fun creditColor(darkTheme: Boolean = isSystemInDarkTheme()) =
    if (darkTheme) Tokens.Dark.success else Tokens.Light.success
