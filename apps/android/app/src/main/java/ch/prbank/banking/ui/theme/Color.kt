package ch.prbank.banking.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Colour tokens mirroring packages/design-tokens (ui-ux-design.md §2.1). Keep in sync with
 * tokens.json; values are the same hex the web app uses.
 */
object Tokens {
    object Light {
        val primary = Color(0xFF1B2A4A)
        val onPrimary = Color(0xFFFFFFFF)
        val background = Color(0xFFF6F6F4)
        val surface = Color(0xFFFFFFFF)
        val textPrimary = Color(0xFF14171F)
        val textSecondary = Color(0xFF555C69)
        val border = Color(0xFF7D838E)
        val success = Color(0xFF1A7342)
        val danger = Color(0xFFB42318)
        val warning = Color(0xFF8A5300)
        val encrypted = Color(0xFF5B2A86)
    }

    object Dark {
        val primary = Color(0xFF9DB8F2)
        val onPrimary = Color(0xFF0B1530)
        val background = Color(0xFF1E2126)
        val surface = Color(0xFF131519)
        val textPrimary = Color(0xFFF2F3F5)
        val textSecondary = Color(0xFFA9AFBA)
        val border = Color(0xFF6B717C)
        val success = Color(0xFF5CC98F)
        val danger = Color(0xFFFF8A7F)
        val warning = Color(0xFFF2B84B)
        val encrypted = Color(0xFFBFA6FF)
    }
}
