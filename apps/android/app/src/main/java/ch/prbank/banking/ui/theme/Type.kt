package ch.prbank.banking.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Type scale from ui-ux-design.md §2.2 (Display 32 / H1 24 / H2 20 / Body 16 / Caption 13). */
val AppTypography = Typography(
    displaySmall = TextStyle(fontSize = 32.sp, lineHeight = 38.sp, fontWeight = FontWeight.SemiBold),
    headlineMedium = TextStyle(fontSize = 24.sp, lineHeight = 30.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    labelSmall = TextStyle(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
)
