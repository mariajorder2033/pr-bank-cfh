package ch.prbank.banking.data

/** Customer API (TRD §5). The demo implementation runs in-memory; an HTTP one wraps Retrofit. */
interface BankRepository {
    suspend fun listAccounts(): List<Account>
    suspend fun listTransactions(accountId: String): List<Transaction>
    suspend fun listCards(): List<Card>
    suspend fun setCardFrozen(cardId: String, frozen: Boolean): Card

    /** Transfers over [stepUpThreshold] require a step-up code (FR-12). */
    suspend fun createTransfer(request: TransferRequest, stepUpCode: String?): Transfer

    val stepUpThreshold: Money
}

class BankException(val code: String, override val message: String) : Exception(message)

interface AuthRepository {
    val isSignedIn: Boolean
    suspend fun signIn(identifier: String, password: String)
    fun signOut()
}
