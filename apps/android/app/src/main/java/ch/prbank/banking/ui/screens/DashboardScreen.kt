package ch.prbank.banking.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ch.prbank.banking.BankViewModel
import ch.prbank.banking.data.Account
import ch.prbank.banking.data.Money
import ch.prbank.banking.data.Transaction
import ch.prbank.banking.ui.components.ErrorText
import ch.prbank.banking.ui.components.Loading
import ch.prbank.banking.ui.components.MoneyText
import ch.prbank.banking.ui.components.StatusPill
import ch.prbank.banking.ui.formatDate
import java.math.BigDecimal

private data class DashboardData(val accounts: List<Account>, val recent: List<Transaction>)

/** Dashboard (ui-ux-design.md §4.3). */
@Composable
fun DashboardScreen(vm: BankViewModel, onOpenAccount: (String) -> Unit) {
    val state by produceState<Result<DashboardData>?>(initialValue = null, vm) {
        value = runCatching {
            val accounts = vm.repository.listAccounts()
            val recent = accounts.flatMap { vm.repository.listTransactions(it.id) }
                .sortedByDescending { it.timestampIso }.take(6)
            DashboardData(accounts, recent)
        }
    }

    when (val result = state) {
        null -> Loading()
        else -> result.fold(
            onSuccess = { data ->
                LazyColumn(
                    Modifier.fillMaxWidth().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        val total = data.accounts.fold(BigDecimal.ZERO) { acc, a -> acc + a.bookedBalance.amount }
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(20.dp)) {
                                Text("Total balance", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                MoneyText(Money(total, "CHF"), style = MaterialTheme.typography.displaySmall)
                            }
                        }
                    }
                    item { Text("Accounts", style = MaterialTheme.typography.titleLarge) }
                    items(data.accounts) { account ->
                        Card(Modifier.fillMaxWidth().clickable { onOpenAccount(account.id) }) {
                            Row(
                                Modifier.fillMaxWidth().padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text(account.name, style = MaterialTheme.typography.bodyLarge)
                                    Text("•••• ${account.iban.takeLast(4)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                MoneyText(account.bookedBalance)
                            }
                        }
                    }
                    item { Text("Recent transactions", style = MaterialTheme.typography.titleLarge) }
                    items(data.recent) { tx -> TransactionRow(tx) }
                }
            },
            onFailure = { ErrorText("Your accounts could not be loaded.") },
        )
    }
}

@Composable
fun TransactionRow(tx: Transaction) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.padding(end = 12.dp)) {
            Text(tx.description, style = MaterialTheme.typography.bodyLarge)
            Text("${formatDate(tx.timestampIso)} · ${tx.category ?: tx.typeName}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(horizontalAlignment = Alignment.End) {
            MoneyText(tx.amount, signed = true)
            if (tx.status.name != "COMPLETED") StatusPill(tx.status)
        }
    }
}
