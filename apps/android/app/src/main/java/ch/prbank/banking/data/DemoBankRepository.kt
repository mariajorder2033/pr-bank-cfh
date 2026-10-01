package ch.prbank.banking.data

import kotlinx.coroutines.delay
import java.math.BigDecimal

/**
 * In-memory demo backend, the Android counterpart of the web app's demo backend. Balances are
 * derived from an append-only transaction list; own-account transfers move money immediately and
 * domestic transfers settle after a short delay. State resets when the process restarts.
 */
class DemoBankRepository(private val latencyMs: Long = 250) : BankRepository, AuthRepository {

    private data class Acct(val id: String, val type: AccountType, val name: String, val iban: String)

    private val accounts = listOf(
        Acct("acc-current", AccountType.CURRENT, "Private account", "CH9300000100200300A".take(21)),
        Acct("acc-savings", AccountType.SAVINGS, "Savings account", "CH7600000100200301B".take(21)),
    )
    private val ledger = mutableListOf<Transaction>()
    private val cards = mutableListOf(
        Card("card-debit", "acc-current", "•••• 4821", "visa", "08/29", CardStatus.ACTIVE, false),
        Card("card-virtual", "acc-current", "•••• 1937", "mastercard", "03/30", CardStatus.ACTIVE, true),
    )
    private var seq = 0
    private var signedIn = false
    override val stepUpThreshold = Money(BigDecimal("1000.00"), "CHF")

    init {
        seed()
    }

    override val isSignedIn get() = signedIn

    override suspend fun signIn(identifier: String, password: String) {
        delay(latencyMs)
        if (identifier.isBlank() || password.isBlank()) {
            throw BankException("invalid_credentials", "Enter your username and password.")
        }
        signedIn = true
    }

    override fun signOut() {
        signedIn = false
    }

    override suspend fun listAccounts(): List<Account> = guard {
        accounts.map { a ->
            Account(a.id, a.type, a.name, a.iban, booked(a.id), available(a.id))
        }
    }

    override suspend fun listTransactions(accountId: String): List<Transaction> = guard {
        ledger.filter { it.accountId == accountId }.sortedByDescending { it.timestampIso }
    }

    override suspend fun listCards(): List<Card> = guard { cards.toList() }

    override suspend fun setCardFrozen(cardId: String, frozen: Boolean): Card = guard {
        val idx = cards.indexOfFirst { it.id == cardId }
        if (idx < 0) throw BankException("not_found", "Card not found.")
        val next = cards[idx].copy(status = if (frozen) CardStatus.FROZEN else CardStatus.ACTIVE)
        cards[idx] = next
        next
    }

    override suspend fun createTransfer(request: TransferRequest, stepUpCode: String?): Transfer = guard {
        val from = accounts.firstOrNull { it.id == request.fromAccountId }
            ?: throw BankException("invalid_account", "Choose an account to pay from.")
        val amount = request.amount.amount
        if (amount.signum() <= 0) throw BankException("invalid_amount", "Enter an amount greater than zero.")
        if (amount > available(from.id).amount) {
            throw BankException("insufficient_funds", "The amount is more than your available balance.")
        }
        if (amount > stepUpThreshold.amount && stepUpCode?.matches(Regex("\\d{6}")) != true) {
            throw BankException("step_up_required", "Confirm this transfer with your 6-digit code.")
        }
        val id = nextId("trf")
        val ref = "TRF" + id.takeLast(4)
        when (val dest = request.destination) {
            is TransferDestination.OwnAccount -> {
                val to = accounts.firstOrNull { it.id == dest.accountId && it.id != from.id }
                    ?: throw BankException("invalid_destination", "Choose a different account of yours.")
                post(from.id, "TXN-01", "Internal transfer (own accounts)", amount.negate(), "Transfer to ${to.name}", TxnStatus.COMPLETED)
                post(to.id, "TXN-01", "Internal transfer (own accounts)", amount, "Transfer from ${from.name}", TxnStatus.COMPLETED)
                Transfer(id, TxnStatus.COMPLETED, ref)
            }
            is TransferDestination.Iban -> {
                if (!Iban.isValid(dest.iban)) throw BankException("invalid_iban", "This IBAN is not valid.")
                if (dest.creditorName.isBlank()) throw BankException("bad_request", "Enter the beneficiary's name.")
                post(from.id, "TXN-03", "Domestic transfer — other bank", amount.negate(), dest.creditorName, TxnStatus.PENDING)
                Transfer(id, TxnStatus.PENDING, ref)
            }
        }
    }

    private fun booked(accountId: String): Money {
        val total = ledger.filter {
            it.accountId == accountId && (it.status == TxnStatus.COMPLETED || it.status == TxnStatus.REVERSED)
        }.fold(BigDecimal.ZERO) { acc, t -> acc + t.amount.amount }
        return Money(total, "CHF")
    }

    private fun available(accountId: String): Money {
        val pending = ledger.filter {
            it.accountId == accountId && it.status in setOf(TxnStatus.PENDING, TxnStatus.PROCESSING, TxnStatus.ON_HOLD) &&
                it.amount.amount.signum() < 0
        }.fold(BigDecimal.ZERO) { acc, t -> acc + t.amount.amount }
        return Money(booked(accountId).amount + pending, "CHF")
    }

    private fun post(accountId: String, type: String, typeName: String, amount: BigDecimal, description: String, status: TxnStatus, category: String? = null) {
        val id = nextId("txn")
        ledger += Transaction(id, accountId, type, typeName, Money(amount, "CHF"), status, isoDaysAgo(0), description, category, null)
    }

    private fun seed() {
        fun book(acc: String, type: String, name: String, amt: String, days: Int, desc: String, cat: String?) {
            ledger += Transaction(nextId("txn"), acc, type, name, Money(BigDecimal(amt), "CHF"), TxnStatus.COMPLETED, isoDaysAgo(days), desc, cat, null)
        }
        book("acc-savings", "TXN-30", "General incoming credit", "15000.00", 45, "Incoming transfer", "Income")
        book("acc-current", "TXN-29", "Incoming salary/payroll credit", "6500.00", 28, "Salary — Example Employer AG", "Income")
        book("acc-current", "TXN-11", "Standing order / recurring payment execution", "-2150.00", 27, "Rent — standing order", "Housing")
        book("acc-current", "TXN-16", "Card purchase — point of sale", "-86.40", 24, "Grocery store", "Groceries")
        book("acc-current", "TXN-17", "Card purchase — online/e-commerce", "-129.90", 18, "Online electronics shop", "Shopping")
        book("acc-current", "TXN-10", "Domestic bill payment", "-94.35", 12, "City Utilities — electricity", "Utilities")
        book("acc-current", "TXN-16", "Card purchase — point of sale", "-42.50", 3, "Bakery", "Dining")
        book("acc-savings", "TXN-26", "Interest credit", "3.12", 1, "Interest", "Interest")
    }

    private fun <T> guard(block: () -> T): T {
        if (!signedIn) throw BankException("unauthorized", "Please sign in again.")
        return block()
    }

    private fun nextId(prefix: String): String {
        seq += 1
        return "$prefix-${seq.toString().padStart(4, '0')}"
    }

    // A fixed clock would be injected in tests; here we approximate ISO timestamps.
    private fun isoDaysAgo(days: Int): String {
        val millis = System.currentTimeMillis() - days.toLong() * 86_400_000
        return java.time.Instant.ofEpochMilli(millis).toString()
    }
}
