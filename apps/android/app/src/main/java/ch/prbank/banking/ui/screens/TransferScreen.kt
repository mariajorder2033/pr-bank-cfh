package ch.prbank.banking.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ch.prbank.banking.BankViewModel
import ch.prbank.banking.data.Account
import ch.prbank.banking.data.Iban
import ch.prbank.banking.data.Money
import ch.prbank.banking.data.TransferDestination
import ch.prbank.banking.data.TransferRequest
import ch.prbank.banking.ui.components.Loading
import kotlinx.coroutines.launch
import java.math.BigDecimal

private enum class Tab { OWN, DOMESTIC }

/** Transfers (ui-ux-design.md §4.4, FR-8/FR-9/FR-12). Amounts over the threshold prompt a code. */
@Composable
fun TransferScreen(vm: BankViewModel) {
    var accounts by remember { mutableStateOf<List<Account>?>(null) }
    var tab by remember { mutableStateOf(Tab.OWN) }
    var fromId by remember { mutableStateOf("") }
    var toId by remember { mutableStateOf("") }
    var iban by remember { mutableStateOf("") }
    var creditor by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var result by remember { mutableStateOf<String?>(null) }
    var askCode by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    androidx.compose.runtime.LaunchedEffect(Unit) {
        accounts = runCatching { vm.repository.listAccounts() }.getOrDefault(emptyList())
        fromId = accounts?.firstOrNull()?.id.orEmpty()
        toId = accounts?.firstOrNull { it.id != fromId }?.id.orEmpty()
    }
    val list = accounts ?: return Loading()

    fun submit(code: String?) {
        error = null
        val amt = amount.replace("[\\s'’]".toRegex(), "").replace(',', '.')
        val decimal = amt.toBigDecimalOrNull()
        if (decimal == null || decimal <= BigDecimal.ZERO) {
            error = "Enter an amount greater than zero."
            return
        }
        val destination = if (tab == Tab.OWN) {
            TransferDestination.OwnAccount(toId)
        } else {
            if (!Iban.isValid(iban)) { error = "This IBAN is not valid."; return }
            TransferDestination.Iban(Iban.normalize(iban), creditor.trim())
        }
        scope.launch {
            try {
                val transfer = vm.repository.createTransfer(
                    TransferRequest(fromId, Money(decimal, "CHF"), destination),
                    code,
                )
                askCode = false
                result = "Transfer ${transfer.status.name.lowercase()} · ${transfer.referenceId}"
            } catch (e: ch.prbank.banking.data.BankException) {
                if (e.code == "step_up_required") askCode = true else { askCode = false; error = e.message }
            } catch (e: Exception) {
                error = e.message
            }
        }
    }

    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Payments", style = MaterialTheme.typography.headlineMedium)
        Row {
            FilterChip(selected = tab == Tab.OWN, onClick = { tab = Tab.OWN }, label = { Text("Own accounts") })
            Spacer(Modifier.width(8.dp))
            FilterChip(selected = tab == Tab.DOMESTIC, onClick = { tab = Tab.DOMESTIC }, label = { Text("Domestic") })
        }
        // A production build would use an exposed dropdown; the ids are shown for brevity.
        OutlinedTextField(fromId, { fromId = it }, label = { Text("From account id") }, modifier = Modifier.fillMaxWidth())
        if (tab == Tab.OWN) {
            OutlinedTextField(toId, { toId = it }, label = { Text("To account id") }, modifier = Modifier.fillMaxWidth())
        } else {
            OutlinedTextField(iban, { iban = it }, label = { Text("Beneficiary IBAN") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(creditor, { creditor = it }, label = { Text("Beneficiary name") }, modifier = Modifier.fillMaxWidth())
        }
        OutlinedTextField(
            amount, { amount = it }, label = { Text("Amount (CHF)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
        )
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        result?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        Button(onClick = { submit(null) }, modifier = Modifier.fillMaxWidth()) { Text("Review and send") }
    }

    if (askCode) {
        var code by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { askCode = false },
            title = { Text("Confirm with your security code") },
            text = {
                OutlinedTextField(
                    code, { code = it.filter(Char::isDigit).take(6) },
                    label = { Text("6-digit code") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                )
            },
            confirmButton = { TextButton(onClick = { submit(code) }) { Text("Confirm") } },
            dismissButton = { TextButton(onClick = { askCode = false }) { Text("Cancel") } },
        )
    }
}
