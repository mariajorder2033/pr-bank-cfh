package ch.prbank.banking

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import ch.prbank.banking.data.AuthRepository
import ch.prbank.banking.data.BankRepository
import ch.prbank.banking.data.DemoBankRepository

/**
 * Holds the repository and sign-in state. In demo mode both interfaces are the same in-memory
 * instance; swap in HTTP-backed implementations once the identity provider is chosen.
 */
class BankViewModel(
    val repository: BankRepository,
    private val auth: AuthRepository,
) : ViewModel() {

    var signedIn by mutableStateOf(auth.isSignedIn)
        private set

    suspend fun signIn(identifier: String, password: String) {
        auth.signIn(identifier, password)
        signedIn = auth.isSignedIn
    }

    fun signOut() {
        auth.signOut()
        signedIn = false
    }

    companion object {
        fun demo(): BankViewModel {
            val backend = DemoBankRepository()
            return BankViewModel(backend, backend)
        }

        /** ViewModel factory for demo mode. Replace the backend with HTTP-backed implementations later. */
        val Factory = viewModelFactory {
            initializer { demo() }
        }
    }
}
