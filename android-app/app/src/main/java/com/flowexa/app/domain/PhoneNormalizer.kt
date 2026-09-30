package com.flowexa.app.domain

object PhoneNormalizer {

    /**
     * Normalizes phone numbers for matching across different formats:
     * e.g., +967 7XX XXX XXX, 00967 7XX XXX XXX, 967 7XX, 7XX...
     * Strips whitespace, dashes, parentheses, leading plus and zeroes.
     */
    fun normalize(rawPhone: String?): String {
        if (rawPhone.isNullOrBlank()) return ""

        // Remove spaces, dashes, parentheses, dots
        var cleaned = rawPhone.replace(Regex("[\\s\\-\\(\\)\\.]"), "")

        // Normalize international prefixes + or 00
        if (cleaned.startsWith("+")) {
            cleaned = cleaned.substring(1)
        } else if (cleaned.startsWith("00")) {
            cleaned = cleaned.substring(2)
        }

        // For Yemen (967), Saudi (966), etc. if local leading 0 is present, standardize
        if (cleaned.startsWith("0") && cleaned.length >= 9) {
            cleaned = cleaned.substring(1)
        }

        return cleaned
    }

    /**
     * Checks if two phone numbers match despite different formatting
     */
    fun matches(phone1: String?, phone2: String?): Boolean {
        val norm1 = normalize(phone1)
        val norm2 = normalize(phone2)
        if (norm1.isEmpty() || norm2.isEmpty()) return false
        if (norm1 == norm2) return true

        // Check if one ends with the other (suffix match for local vs international)
        return norm1.endsWith(norm2) || norm2.endsWith(norm1)
    }
}
