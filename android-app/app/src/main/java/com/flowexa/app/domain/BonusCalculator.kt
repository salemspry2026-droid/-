package com.flowexa.app.domain

import com.flowexa.app.data.local.entity.ProductEntity
import kotlin.math.floor

object BonusCalculator {

    /**
     * Observability hook for malformed tier data. The application installs a logger in
     * [com.flowexa.app.FlowexaApplication]; tests may install a collector.
     * The default is a no-op so the domain layer has no Android dependency.
     */
    @Volatile
    var parseErrorReporter: (productId: String, reason: String, cause: Throwable?) -> Unit =
        { _, _, _ -> }

    /**
     * Calculates the bonus quantity for a product given ordered quantity and invoiceType.
     * Supports:
     * - "fixed": percentage bonus (e.g. 10% bonus on 20 = 2)
     * - "tiered": tiers from product.bonusTiersJson with minQty, maxQty, percent or bonus/bonusQty
     * - "none": zero bonus
     *
     * Malformed tier JSON yields 0.0 AND is reported through [parseErrorReporter].
     */
    fun calculateBonus(product: ProductEntity, quantity: Double, invoiceType: String = "cash"): Double {
        if (quantity <= 0.0) return 0.0

        return when (product.bonusType) {
            "fixed" -> fixedBonus(product.bonusFixedPercent, quantity)
            "tiered" -> {
                when (val parsed = BonusTierParser.parse(product.bonusTiersJson)) {
                    is TierParseResult.Success -> calculateTieredBonus(parsed.tiers, quantity, invoiceType)
                    is TierParseResult.Failure -> {
                        parseErrorReporter(product.id, parsed.reason, parsed.cause)
                        0.0
                    }
                }
            }
            else -> 0.0
        }
    }

    /** Pure calculation over typed tiers. No JSON, no Android. */
    fun calculateTieredBonus(tiers: List<BonusTier>, quantity: Double, invoiceType: String = "cash"): Double {
        if (quantity <= 0.0) return 0.0

        var best: BonusTier? = null
        for (tier in tiers) {
            if (!tier.appliesTo(quantity, invoiceType)) continue
            // The tier with the highest minQty wins; on a tie the later tier wins.
            if (best == null || tier.minQty >= best.minQty) best = tier
        }
        val chosen = best ?: return 0.0

        return if (chosen.percent > 0.0) {
            floor(quantity * (chosen.percent / 100.0))
        } else {
            chosen.fixedBonus
        }
    }

    private fun fixedBonus(percent: Double?, quantity: Double): Double {
        val p = percent ?: 0.0
        return if (p > 0.0) floor(quantity * (p / 100.0)) else 0.0
    }
}
