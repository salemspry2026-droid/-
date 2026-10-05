package com.flowexa.app.domain

/**
 * A single, typed bonus tier.
 *
 * [maxQty] == null means "no upper bound".
 * [invoiceType] is "all" or a concrete invoice type such as "cash" / "credit".
 * When [percent] > 0 the bonus is a percentage of the ordered quantity (floored),
 * otherwise [fixedBonus] units are granted.
 */
data class BonusTier(
    val minQty: Double,
    val maxQty: Double?,
    val invoiceType: String,
    val percent: Double,
    val fixedBonus: Double
) {
    fun appliesTo(quantity: Double, requestedInvoiceType: String): Boolean {
        val invoiceMatches = invoiceType.equals(INVOICE_ALL, ignoreCase = true) ||
            invoiceType.equals(requestedInvoiceType, ignoreCase = true)
        val aboveMin = quantity >= minQty
        val belowMax = maxQty == null || quantity <= maxQty
        return invoiceMatches && aboveMin && belowMax
    }

    companion object {
        const val INVOICE_ALL = "all"
    }
}
