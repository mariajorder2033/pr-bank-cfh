package ch.prbank.banking.data

import java.math.BigInteger

/** Minimal IBAN validation (ISO 13616 + MOD-97-10), enough for beneficiary entry. */
object Iban {
    private val lengths = mapOf(
        "CH" to 21, "DE" to 22, "FR" to 27, "GB" to 22, "IT" to 27, "AT" to 20,
        "ES" to 24, "NL" to 18, "BE" to 16, "LI" to 21, "LU" to 20,
    )

    fun normalize(input: String): String = input.replace("\\s".toRegex(), "").uppercase()

    fun isValid(input: String): Boolean {
        val iban = normalize(input)
        if (!Regex("^[A-Z]{2}\\d{2}[A-Z0-9]+$").matches(iban)) return false
        val expected = lengths[iban.substring(0, 2)] ?: return false
        if (iban.length != expected) return false
        val rearranged = iban.substring(4) + iban.substring(0, 4)
        val numeric = buildString {
            for (c in rearranged) append(if (c.isDigit()) c.toString() else (c - 'A' + 10).toString())
        }
        return BigInteger(numeric).mod(BigInteger.valueOf(97)) == BigInteger.ONE
    }

    fun format(input: String): String = normalize(input).chunked(4).joinToString(" ")
}
