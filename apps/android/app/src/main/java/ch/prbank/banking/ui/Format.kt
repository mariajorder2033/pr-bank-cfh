package ch.prbank.banking.ui

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val dateFormat = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.UK).withZone(ZoneId.systemDefault())

fun formatDate(iso: String): String = try {
    dateFormat.format(Instant.parse(iso))
} catch (_: Exception) {
    iso
}
