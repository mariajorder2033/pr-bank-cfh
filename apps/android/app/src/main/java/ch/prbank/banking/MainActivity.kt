package ch.prbank.banking

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewmodel.compose.viewModel
import ch.prbank.banking.nav.AppNav
import ch.prbank.banking.ui.screens.LoginScreen
import ch.prbank.banking.ui.theme.PrBankTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PrBankTheme {
                BankApp()
            }
        }
    }
}

@Composable
fun BankApp(vm: BankViewModel = viewModel(factory = BankViewModel.Factory)) {
    var signedIn by remember { mutableStateOf(vm.signedIn) }
    if (!signedIn) {
        LoginScreen(vm, onSignedIn = { signedIn = true })
    } else {
        AppNav(vm)
    }
}
