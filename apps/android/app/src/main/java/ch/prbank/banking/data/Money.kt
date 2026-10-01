package ch.prbank.banking.data

import java.math.BigDecimal
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

/**
 * Money is a decimal amount plus an ISO-4217 currency, parsed exactly with BigDecimal (never
 * a double). Mirrors packages/domain money handling. Amounts cross the API as decimal strings.
 */
data class Money(val amount: BigDecimal, val currency: String) {
    companion object {
        fun parse(decimal: String, currency: String = "CHF"): Money =
            Money(BigDecimal(decimal), currency)
    }
}

private val swissSymbols = DecimalFormatSymbols(Locale.forLanguageTag("de-CH")).apply {
    groupingSeparator = '’' // Swiss apostrophe: 1'234.50
    decimalSeparator = '.'
}
private val amountFormat = DecimalFormat("#,##0.00", swissSymbols)

/** "CHF 1'234.50"; with [signed], credits get a leading + and debits a minus sign. */
fun Money.format(signed: Boolean = false): String {
    val sign = when {
        amount.signum() < 0 -> "−" // minus
        signed && amount.signum() > 0 -> "+"
        else -> ""
    }
    return "$sign$currency ${amountFormat.format(amount.abs())}"
}

fun Money.isCredit(): Boolean = amount.signum() > 0
