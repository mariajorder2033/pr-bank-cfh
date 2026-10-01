package ch.prbank.banking.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import ch.prbank.banking.BankViewModel
import ch.prbank.banking.data.Card as CardModel
import ch.prbank.banking.data.CardStatus
import ch.prbank.banking.ui.components.Loading
import kotlinx.coroutines.launch

/** Cards with freeze/unfreeze (ui-ux-design.md §4.5, FR-15). */
@Composable
fun CardsScreen(vm: BankViewModel) {
    var cards by remember { mutableStateOf<List<CardModel>?>(null) }
    val scope = rememberCoroutineScope()

    androidx.compose.runtime.LaunchedEffect(Unit) {
        cards = runCatching { vm.repository.listCards() }.getOrDefault(emptyList())
    }

    val list = cards ?: return Loading()
    LazyColumn(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(list) { card ->
            val frozen = card.status == CardStatus.FROZEN
            val label = "${if (card.brand == "visa") "Visa" else "Mastercard"} ${if (card.virtual) "virtual" else "debit"} card ending ${card.maskedPan.takeLast(4)}"
            Card(Modifier.fillMaxWidth()) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(label, style = MaterialTheme.typography.bodyLarge)
                        Text(if (frozen) "Frozen" else "Active", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = frozen,
                        onCheckedChange = { shouldFreeze ->
                            scope.launch {
                                runCatching { vm.repository.setCardFrozen(card.id, shouldFreeze) }
                                    .onSuccess { updated -> cards = list.map { if (it.id == updated.id) updated else it } }
                            }
                        },
                        modifier = Modifier.semantics { contentDescription = "Freeze $label" },
                    )
                }
            }
        }
    }
}
