package com.flowexa.app.domain

import com.flowexa.app.data.local.entity.ProductEntity
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Extra coverage for the bonus domain. DomainUnitTests (original business tests) is intentionally
 * left untouched.
 *
 * - "pure" tests exercise BonusCalculator.calculateTieredBonus with typed tiers (no JSON at all).
 * - "parser" tests exercise BonusTierParser, which needs a real org.json on the JVM test classpath
 *   (declared as a pinned testImplementation dependency).
 */
class BonusCalculatorTest {

    @After
    fun restoreReporter() {
        BonusCalculator.parseErrorReporter = { _, _, _ -> }
    }

    private fun tieredProduct(json: String) = ProductEntity(
        id = "p", companyId = "c", name = "n", price = 10.0,
        bonusType = "tiered", bonusTiersJson = json
    )

    // ---------------- pure calculator ----------------

    private val fixedTiers = listOf(
        BonusTier(minQty = 10.0, maxQty = 19.0, invoiceType = "all", percent = 0.0, fixedBonus = 1.0),
        BonusTier(minQty = 20.0, maxQty = 49.0, invoiceType = "all", percent = 0.0, fixedBonus = 3.0),
        BonusTier(minQty = 50.0, maxQty = null, invoiceType = "all", percent = 0.0, fixedBonus = 10.0)
    )

    @Test
    fun pure_belowFirstTier_isZero() {
        assertEquals(0.0, BonusCalculator.calculateTieredBonus(fixedTiers, 9.0), 0.0)
        assertEquals(0.0, BonusCalculator.calculateTieredBonus(fixedTiers, 5.0), 0.0)
    }

    @Test
    fun pure_quantityExactlyAtMinQty_matchesTier() {
        assertEquals(1.0, BonusCalculator.calculateTieredBonus(fixedTiers, 10.0), 0.0)
        assertEquals(3.0, BonusCalculator.calculateTieredBonus(fixedTiers, 20.0), 0.0)
        assertEquals(10.0, BonusCalculator.calculateTieredBonus(fixedTiers, 50.0), 0.0)
    }

    @Test
    fun pure_quantityExactlyAtMaxQty_stillMatchesTier() {
        assertEquals(1.0, BonusCalculator.calculateTieredBonus(fixedTiers, 19.0), 0.0)
        assertEquals(3.0, BonusCalculator.calculateTieredBonus(fixedTiers, 49.0), 0.0)
    }

    @Test
    fun pure_tierWithoutMaxQty_isUnbounded() {
        assertEquals(10.0, BonusCalculator.calculateTieredBonus(fixedTiers, 1_000_000.0), 0.0)
    }

    @Test
    fun pure_zeroOrNegativeQuantity_isZero() {
        assertEquals(0.0, BonusCalculator.calculateTieredBonus(fixedTiers, 0.0), 0.0)
        assertEquals(0.0, BonusCalculator.calculateTieredBonus(fixedTiers, -5.0), 0.0)
    }

    @Test
    fun pure_percentTier_isFlooredPercentageOfQuantity() {
        val tiers = listOf(BonusTier(10.0, null, "all", percent = 12.5, fixedBonus = 0.0))
        // 12.5% of 10 = 1.25 -> 1 ; 12.5% of 40 = 5
        assertEquals(1.0, BonusCalculator.calculateTieredBonus(tiers, 10.0), 0.0)
        assertEquals(5.0, BonusCalculator.calculateTieredBonus(tiers, 40.0), 0.0)
    }

    @Test
    fun pure_invoiceSpecificTier_onlyAppliesToThatInvoiceType() {
        val tiers = listOf(
            BonusTier(10.0, null, "cash", percent = 10.0, fixedBonus = 0.0),
            BonusTier(10.0, null, "credit", percent = 5.0, fixedBonus = 0.0)
        )
        assertEquals(2.0, BonusCalculator.calculateTieredBonus(tiers, 20.0, "cash"), 0.0)
        assertEquals(1.0, BonusCalculator.calculateTieredBonus(tiers, 20.0, "credit"), 0.0)
        assertEquals(0.0, BonusCalculator.calculateTieredBonus(tiers, 20.0, "pending_cash"), 0.0)
    }

    @Test
    fun pure_highestMinQtyWins_whenTiersOverlap() {
        val tiers = listOf(
            BonusTier(10.0, null, "all", 0.0, 1.0),
            BonusTier(30.0, null, "all", 0.0, 7.0)
        )
        assertEquals(7.0, BonusCalculator.calculateTieredBonus(tiers, 35.0), 0.0)
        assertEquals(1.0, BonusCalculator.calculateTieredBonus(tiers, 29.0), 0.0)
    }

    // ---------------- product level (fixed) ----------------

    @Test
    fun fixed_percentBonus_isFloored() {
        val p = ProductEntity(
            id = "p", companyId = "c", name = "n", price = 1.0,
            bonusType = "fixed", bonusFixedPercent = 10.0
        )
        assertEquals(0.0, BonusCalculator.calculateBonus(p, 9.0), 0.0)
        assertEquals(1.0, BonusCalculator.calculateBonus(p, 10.0), 0.0)
        assertEquals(1.0, BonusCalculator.calculateBonus(p, 19.0), 0.0)
        assertEquals(2.0, BonusCalculator.calculateBonus(p, 25.0), 0.0)
    }

    @Test
    fun noneAndUnknownBonusType_areZero() {
        val none = ProductEntity(id = "p", companyId = "c", name = "n", price = 1.0, bonusType = "none")
        val unknown = ProductEntity(id = "p", companyId = "c", name = "n", price = 1.0, bonusType = "weird")
        assertEquals(0.0, BonusCalculator.calculateBonus(none, 100.0), 0.0)
        assertEquals(0.0, BonusCalculator.calculateBonus(unknown, 100.0), 0.0)
    }

    // ---------------- parser (needs real org.json on the JVM) ----------------

    @Test
    fun parser_readsAllSupportedKeys() {
        val json = """
            [
              {"minQty": 10, "maxQty": 19, "bonus": 1},
              {"quantity": 20, "bonusQty": 3, "invoiceType": "cash"},
              {"minQty": 50, "maxQty": null, "percent": 15.5, "invoiceType": "credit"}
            ]
        """.trimIndent()

        val result = BonusTierParser.parse(json) as TierParseResult.Success
        assertEquals(3, result.tiers.size)

        assertEquals(BonusTier(10.0, 19.0, "all", 0.0, 1.0), result.tiers[0])
        assertEquals(BonusTier(20.0, null, "cash", 0.0, 3.0), result.tiers[1])
        assertEquals(BonusTier(50.0, null, "credit", 15.5, 0.0), result.tiers[2])
    }

    @Test
    fun parser_blankAndEmptyArray_areEmptySuccess() {
        assertEquals(TierParseResult.Success(emptyList()), BonusTierParser.parse(null))
        assertEquals(TierParseResult.Success(emptyList()), BonusTierParser.parse(""))
        assertEquals(TierParseResult.Success(emptyList()), BonusTierParser.parse("[]"))
    }

    @Test
    fun parser_malformedJson_isFailure_notException() {
        assertTrue(BonusTierParser.parse("{not json") is TierParseResult.Failure)
        assertTrue(BonusTierParser.parse("[1, 2]") is TierParseResult.Failure)
    }

    @Test
    fun tieredProduct_malformedJson_returnsZero_andReportsError() {
        val reported = mutableListOf<String>()
        BonusCalculator.parseErrorReporter = { productId, _, _ -> reported.add(productId) }

        val bonus = BonusCalculator.calculateBonus(tieredProduct("{broken"), 50.0)

        assertEquals(0.0, bonus, 0.0)
        assertEquals(listOf("p"), reported)
    }

    @Test
    fun tieredProduct_percentJson_boundaries() {
        val product = tieredProduct(
            """[{"minQty": 10, "maxQty": 29, "percent": 10.0}, {"minQty": 30, "percent": 15.0}]"""
        )
        assertEquals(0.0, BonusCalculator.calculateBonus(product, 9.0), 0.0)
        assertEquals(1.0, BonusCalculator.calculateBonus(product, 10.0), 0.0) // exactly minQty
        assertEquals(2.0, BonusCalculator.calculateBonus(product, 29.0), 0.0) // exactly maxQty
        assertEquals(4.0, BonusCalculator.calculateBonus(product, 30.0), 0.0) // next tier, no maxQty
        assertEquals(15.0, BonusCalculator.calculateBonus(product, 100.0), 0.0)
    }
}
