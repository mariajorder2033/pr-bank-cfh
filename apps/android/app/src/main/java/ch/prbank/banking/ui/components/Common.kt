package ch.prbank.banking.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import ch.prbank.banking.data.Money
import ch.prbank.banking.data.TxnStatus
import ch.prbank.banking.data.format
import ch.prbank.banking.data.isCredit
import ch.prbank.banking.ui.theme.creditColor

@Composable
fun Loading(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorText(message: String, modifier: Modifier = Modifier) {
    Text(
        message,
        modifier = modifier.padding(16.dp),
        color = MaterialTheme.colorScheme.error,
        textAlign = TextAlign.Center,
    )
}

/** An amount in tabular figures; credits are green when [signed]. */
@Composable
fun MoneyText(value: Money, signed: Boolean = false, style: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.bodyLarge) {
    val color = if (signed && value.isCredit()) creditColor() else MaterialTheme.colorScheme.onSurface
    Text(value.format(signed), style = style, color = color)
}

@Composable
fun StatusPill(status: TxnStatus) {
    val (label, color) = when (status) {
        TxnStatus.COMPLETED -> "Completed" to MaterialTheme.colorScheme.primary
        TxnStatus.PENDING, TxnStatus.PROCESSING -> "Pending" to MaterialTheme.colorScheme.error
        TxnStatus.ON_HOLD -> "On hold" to MaterialTheme.colorScheme.onSurfaceVariant
        TxnStatus.REVERSED -> "Reversed" to MaterialTheme.colorScheme.onSurfaceVariant
        TxnStatus.FAILED -> "Failed" to MaterialTheme.colorScheme.error
    }
    Surface(color = color.copy(alpha = 0.12f), shape = RoundedCornerShape(999.dp)) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
        )
    }
}

internal val ScreenPadding = PaddingValues(16.dp)
