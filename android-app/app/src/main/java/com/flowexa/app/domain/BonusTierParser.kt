package com.flowexa.app.domain

import org.json.JSONArray
import org.json.JSONException

/** Result of parsing `ProductEntity.bonusTiersJson`. Parsing never throws. */
sealed class TierParseResult {
    data class Success(val tiers: List<BonusTier>) : TierParseResult()
    data class Failure(val reason: String, val cause: Throwable?) : TierParseResult()
}

/**
 * Parser boundary: this is the ONLY place in the bonus domain that touches org.json.
 * Everything else ([BonusCalculator]) works on typed [BonusTier] values, so the calculation
 * itself does not depend on any Android-only runtime behaviour.
 *
 * On a device org.json is the platform implementation. In JVM unit tests the Android stub
 * jar throws "Method ... not mocked", so the module declares a pinned real implementation
 * as a `testImplementation` dependency (see app/build.gradle.kts).
 */
object BonusTierParser {

    fun parse(json: String?): TierParseResult {
        if (json.isNullOrBlank()) return TierParseResult.Success(emptyList())
        return try {
            val array = JSONArray(json)
            val tiers = ArrayList<BonusTier>(array.length())
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)

                val minQty = obj.optDouble("minQty", obj.optDouble("quantity", 0.0))
                val maxQty: Double? =
                    if (obj.has("maxQty") && !obj.isNull("maxQty")) obj.optDouble("maxQty") else null
                val invoiceType = obj.optString("invoiceType", BonusTier.INVOICE_ALL)
                    .ifBlank { BonusTier.INVOICE_ALL }
                val percent = obj.optDouble("percent", 0.0)
                val fixedBonus = obj.optDouble("bonus", obj.optDouble("bonusQty", 0.0))

                tiers.add(
                    BonusTier(
                        minQty = minQty,
                        maxQty = maxQty?.takeUnless { it.isNaN() },
                        invoiceType = invoiceType,
                        percent = if (percent.isNaN()) 0.0 else percent,
                        fixedBonus = if (fixedBonus.isNaN()) 0.0 else fixedBonus
                    )
                )
            }
            TierParseResult.Success(tiers)
        } catch (e: JSONException) {
            TierParseResult.Failure("Malformed bonusTiersJson", e)
        }
    }
}
