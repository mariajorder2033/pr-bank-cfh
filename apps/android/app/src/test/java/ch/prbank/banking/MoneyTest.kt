package ch.prbank.banking

import ch.prbank.banking.data.Money
import ch.prbank.banking.data.format
import ch.prbank.banking.data.isCredit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MoneyTest {
    @Test
    fun formatsWithSwissGroupingAndTwoDecimals() {
        assertEquals("CHF 1’250.50", Money.parse("1250.50").format())
        assertEquals("CHF 21’160.67", Money.parse("21160.67").format())
    }

    @Test
    fun signsDebitsAndCredits() {
        assertEquals("−CHF 42.50", Money.parse("-42.50").format())
        assertEquals("+CHF 6’500.00", Money.parse("6500.00").format(signed = true))
        assertEquals("CHF 0.00", Money.parse("0").format(signed = true))
    }

    @Test
    fun creditDetection() {
        assertTrue(Money.parse("1.00").isCredit())
        assertFalse(Money.parse("-1.00").isCredit())
        assertFalse(Money.parse("0").isCredit())
    }
}
