package com.flowexa.app.domain

object PhoneNormalizer {

    /**
     * Normalizes phone numbers for matching across different formats:
     * e.g., +967 7XX XXX XXX, 00967 7XX XXX XXX, 967 7XX, 7XX...
     * Strips whitespace, dashes, parentheses, leading plus and zeroes.
     */
    fun normalize(rawPhone: String?): String {
        if (rawPhone.isNullOrBlank()) return ""

        // Remove spaces, dashes, parentheses, dots, and non-digit characters except +
        var cleaned = rawPhone.replace(Regex("[^0-9+]"), "")

        // Normalize international prefixes + or 00
        if (cleaned.startsWith("+")) {
            cleaned = cleaned.substring(1)
        } else if (cleaned.startsWith("00")) {
            cleaned = cleaned.substring(2)
        }

        // If leading 0 is present for local dialing (e.g., 077XXXXXXX), strip it
        if (cleaned.startsWith("0") && cleaned.length >= 9) {
            cleaned = cleaned.substring(1)
        }

        // Canonicalize Yemen standard numbers (9 digits starting with 7 -> prefix 967)
        if (cleaned.length == 9 && cleaned.startsWith("7")) {
            cleaned = "967$cleaned"
        }

        return cleaned
    }

    /**
     * Checks if two phone numbers match safely without broad suffix matching
     */
    fun matches(phone1: String?, phone2: String?): Boolean {
        val norm1 = normalize(phone1)
        val norm2 = normalize(phone2)
        if (norm1.isEmpty() || norm2.isEmpty()) return false
        if (norm1 == norm2) return true

        // Only allow suffix match if the shorter one has at least 8 digits to prevent broad partial matches
        val minLen = minOf(norm1.length, norm2.length)
        if (minLen >= 8) {
            if (norm1.endsWith(norm2) || norm2.endsWith(norm1)) return true
        }

        return false
    }
}
