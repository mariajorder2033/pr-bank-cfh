package ch.prbank.banking.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import ch.prbank.banking.BankViewModel
import kotlinx.coroutines.launch

/** Login (ui-ux-design.md §4.2). Demo sign-in accepts any credentials. */
@Composable
fun LoginScreen(vm: BankViewModel, onSignedIn: () -> Unit) {
    var identifier by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, androidx.compose.ui.Alignment.CenterVertically),
    ) {
        Text("Sign in to e-banking", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Demo: sign-in is simulated. Enter any username and password; nothing leaves the device.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = identifier,
            onValueChange = { identifier = it },
            label = { Text("Username or customer number") },
            singleLine = true,
            modifier = Modifier.padding(top = 8.dp),
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Password),
        )
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = {
                busy = true
                error = null
                scope.launch {
                    try {
                        vm.signIn(identifier, password)
                        onSignedIn()
                    } catch (e: Exception) {
                        error = e.message ?: "Sign-in failed."
                        busy = false
                    }
                }
            },
            enabled = !busy,
        ) {
            Text(if (busy) "Signing in…" else "Sign in")
        }
    }
}
