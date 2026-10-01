package ch.prbank.banking.data

/** Customer-facing models, mirroring packages/api-contracts/openapi.yaml. */

enum class AccountType { CURRENT, SAVINGS }

data class Account(
    val id: String,
    val type: AccountType,
    val name: String,
    val iban: String,
    val bookedBalance: Money,
    val availableBalance: Money,
)

enum class TxnStatus { PENDING, PROCESSING, COMPLETED, FAILED, REVERSED, ON_HOLD }

data class Transaction(
    val id: String,
    val accountId: String,
    val type: String,
    val typeName: String,
    val amount: Money,
    val status: TxnStatus,
    val timestampIso: String,
    val description: String,
    val category: String?,
    val correctsTransactionId: String?,
)

enum class CardStatus { ACTIVE, FROZEN, BLOCKED }

data class Card(
    val id: String,
    val accountId: String,
    val maskedPan: String,
    val brand: String,
    val expiry: String,
    val status: CardStatus,
    val virtual: Boolean,
)

sealed interface TransferDestination {
    data class OwnAccount(val accountId: String) : TransferDestination
    data class Iban(val iban: String, val creditorName: String) : TransferDestination
}

data class TransferRequest(
    val fromAccountId: String,
    val amount: Money,
    val destination: TransferDestination,
    val reference: String? = null,
)

data class Transfer(val id: String, val status: TxnStatus, val referenceId: String)
