package com.flowexa.app.domain

import com.flowexa.app.data.local.entity.ProductEntity
import org.json.JSONArray
import kotlin.math.floor

object BonusCalculator {

    /**
     * Calculates the bonus quantity for a product given ordered quantity and invoiceType.
     * Supports:
     * - "fixed": percentage bonus (e.g. 10% bonus on 20 = 2)
     * - "tiered": dynamic tiers from product.bonusTiersJson with minQty, maxQty, percent or bonusQty
     * - "none": zero bonus
     */
    fun calculateBonus(product: ProductEntity, quantity: Double, invoiceType: String = "cash"): Double {
        if (quantity <= 0.0) return 0.0

        return when (product.bonusType) {
            "fixed" -> {
                val percent = product.bonusFixedPercent ?: 0.0
                if (percent > 0.0) {
                    floor(quantity * (percent / 100.0))
                } else 0.0
            }
            "tiered" -> {
                if (product.bonusTiersJson.isNullOrBlank() || product.bonusTiersJson == "[]") {
                    return 0.0
                }
                try {
                    val tiers = JSONArray(product.bonusTiersJson)
                    var bestBonus = 0.0
                    var bestMinQty = -1.0

                    for (i in 0 until tiers.length()) {
                        val tier = tiers.getJSONObject(i)
                        val minQty = tier.optDouble("minQty", tier.optDouble("quantity", 0.0))
                        val maxQty = if (tier.has("maxQty") && !tier.isNull("maxQty")) {
                            tier.optDouble("maxQty", Double.MAX_VALUE)
                        } else {
                            Double.MAX_VALUE
                        }
                        val tierInvoiceType = tier.optString("invoiceType", "all")
                        val invoiceMatches = tierInvoiceType == "all" || tierInvoiceType.equals(invoiceType, ignoreCase = true)

                        if (quantity >= minQty && quantity <= maxQty && invoiceMatches) {
                            if (minQty >= bestMinQty) {
                                bestMinQty = minQty
                                val percent = tier.optDouble("percent", 0.0)
                                val fixedBonus = tier.optDouble("bonus", tier.optDouble("bonusQty", 0.0))

                                bestBonus = if (percent > 0.0) {
                                    floor(quantity * (percent / 100.0))
                                } else {
                                    fixedBonus
                                }
                            }
                        }
                    }
                    bestBonus
                } catch (_: Exception) {
                    0.0
                }
            }
            else -> 0.0
        }
    }
}
