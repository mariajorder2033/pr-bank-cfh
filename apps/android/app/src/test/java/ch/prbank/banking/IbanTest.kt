package ch.prbank.banking

import ch.prbank.banking.data.Iban
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class IbanTest {
    @Test
    fun acceptsValidIbans() {
        assertTrue(Iban.isValid("CH93 0076 2011 6238 5295 7"))
        assertTrue(Iban.isValid("DE89 3704 0044 0532 0130 00"))
    }

    @Test
    fun rejectsBadChecksumUnknownCountryAndLength() {
        assertFalse(Iban.isValid("CH94 0076 2011 6238 5295 7"))
        assertFalse(Iban.isValid("ZZ93 0076 2011 6238 5295 7"))
        assertFalse(Iban.isValid("CH93 0076"))
    }

    @Test
    fun formatsInGroupsOfFour() {
        assertEquals("CH93 0076 2011 6238 5295 7", Iban.format("CH9300762011623852957"))
    }
}
