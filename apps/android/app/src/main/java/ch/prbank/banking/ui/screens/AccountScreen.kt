package ch.prbank.banking.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ch.prbank.banking.BankViewModel
import ch.prbank.banking.data.Account
import ch.prbank.banking.data.Iban
import ch.prbank.banking.data.Transaction
import ch.prbank.banking.ui.components.ErrorText
import ch.prbank.banking.ui.components.Loading
import ch.prbank.banking.ui.components.MoneyText

private data class AccountData(val account: Account, val transactions: List<Transaction>)

/** Account detail and transaction history (PRD FR-5, FR-6). */
@Composable
fun AccountScreen(vm: BankViewModel, accountId: String) {
    val state by produceState<Result<AccountData>?>(initialValue = null, accountId) {
        value = runCatching {
            val account = vm.repository.listAccounts().first { it.id == accountId }
            AccountData(account, vm.repository.listTransactions(accountId))
        }
    }

    when (val result = state) {
        null -> Loading()
        else -> result.fold(
            onSuccess = { data ->
                LazyColumn(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(data.account.name, style = MaterialTheme.typography.titleLarge)
                                Text(Iban.format(data.account.iban), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                MoneyText(data.account.bookedBalance, style = MaterialTheme.typography.headlineMedium)
                                Text("Deposits protected up to CHF 100,000 by esisuisse.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    item { Text("Transactions", style = MaterialTheme.typography.titleLarge) }
                    items(data.transactions) { tx ->
                        TransactionRow(tx)
                        HorizontalDivider()
                    }
                }
            },
            onFailure = { ErrorText("This account could not be loaded.") },
        )
    }
}
