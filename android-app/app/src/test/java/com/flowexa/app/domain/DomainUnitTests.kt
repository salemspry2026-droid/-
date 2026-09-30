package com.flowexa.app.domain

import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.data.local.entity.UserProfileEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DomainUnitTests {

    // --- PhoneNormalizer Tests ---
    @Test
    fun testPhoneNormalization() {
        val phone1 = "+967 771 234 567"
        val phone2 = "00967771234567"
        val phone3 = "771-234-567"

        val norm1 = PhoneNormalizer.normalize(phone1)
        val norm2 = PhoneNormalizer.normalize(phone2)

        assertEquals("967771234567", norm1)
        assertEquals("967771234567", norm2)
        assertTrue(PhoneNormalizer.matches(phone1, phone2))
        assertTrue(PhoneNormalizer.matches(phone1, phone3))
    }

    // --- BonusCalculator Tests ---
    @Test
    fun testFixedBonus() {
        val product = ProductEntity(
            id = "p1",
            companyId = "c1",
            name = "Panadol",
            price = 100.0,
            bonusType = "fixed",
            bonusFixedPercent = 10.0
        )

        val bonus10 = BonusCalculator.calculateBonus(product, 10.0)
        val bonus25 = BonusCalculator.calculateBonus(product, 25.0)

        assertEquals(1.0, bonus10, 0.001)
        assertEquals(2.0, bonus25, 0.001)
    }

    @Test
    fun testTieredBonus() {
        val tiersJson = """
            [
                {"minQty": 10, "maxQty": 19, "bonus": 1},
                {"minQty": 20, "maxQty": 49, "bonus": 3},
                {"minQty": 50, "bonus": 10}
            ]
        """.trimIndent()

        val product = ProductEntity(
            id = "p2",
            companyId = "c1",
            name = "Amoxicillin",
            price = 50.0,
            bonusType = "tiered",
            bonusTiersJson = tiersJson
        )

        assertEquals(0.0, BonusCalculator.calculateBonus(product, 5.0), 0.001)
        assertEquals(1.0, BonusCalculator.calculateBonus(product, 12.0), 0.001)
        assertEquals(3.0, BonusCalculator.calculateBonus(product, 25.0), 0.001)
        assertEquals(10.0, BonusCalculator.calculateBonus(product, 60.0), 0.001)
    }

    // --- OrderRules Tests ---
    @Test
    fun testOrderRulesStockValidation() {
        val outOfStockProduct = ProductEntity(
            id = "p3",
            companyId = "c1",
            name = "Vitamin C",
            price = 30.0,
            inStock = false
        )

        val result = OrderRules.validateProductOrder(
            product = outOfStockProduct,
            quantity = 2.0,
            invoiceType = "cash",
            selectedCurrency = "SAR",
            primaryCurrency = "SAR"
        )

        assertFalse(result.isValid)
        assertTrue(result.errorMessage?.contains("غير متوفر") == true)
    }

    @Test
    fun testOrderRulesInvoiceRestriction() {
        val cashOnlyProduct = ProductEntity(
            id = "p4",
            companyId = "c1",
            name = "Baby Formula",
            price = 80.0,
            inStock = true,
            invoiceTypeRestriction = "cash_only"
        )

        val creditAttempt = OrderRules.validateProductOrder(
            product = cashOnlyProduct,
            quantity = 1.0,
            invoiceType = "credit",
            selectedCurrency = "SAR",
            primaryCurrency = "SAR"
        )

        assertFalse(creditAttempt.isValid)
        assertTrue(creditAttempt.errorMessage?.contains("نقدية") == true)

        val cashAttempt = OrderRules.validateProductOrder(
            product = cashOnlyProduct,
            quantity = 1.0,
            invoiceType = "cash",
            selectedCurrency = "SAR",
            primaryCurrency = "SAR"
        )
        assertTrue(cashAttempt.isValid)
    }

    // --- PermissionManager Tests ---
    @Test
    fun testPermissionManagerRoles() {
        val ownerProfile = UserProfileEntity(
            id = "u1",
            email = "owner@test.com",
            displayName = "المالك",
            role = AppConfig.ROLE_OWNER
        )

        val salesProfile = UserProfileEntity(
            id = "u2",
            email = "sales@test.com",
            displayName = "مندوب",
            role = AppConfig.ROLE_SALES
        )

        val clientProfile = UserProfileEntity(
            id = "u3",
            email = "client@test.com",
            displayName = "عميل",
            role = AppConfig.ROLE_CLIENT
        )

        // Owner can do everything
        assertTrue(PermissionManager.hasPermission(ownerProfile, PermissionManager.Module.SETTINGS, PermissionManager.Action.DELETE))

        // Sales can create orders and customers, but not delete products or modify settings
        assertTrue(PermissionManager.hasPermission(salesProfile, PermissionManager.Module.ORDERS, PermissionManager.Action.CREATE))
        assertTrue(PermissionManager.hasPermission(salesProfile, PermissionManager.Module.CUSTOMERS, PermissionManager.Action.VIEW))
        assertFalse(PermissionManager.hasPermission(salesProfile, PermissionManager.Module.PRODUCTS, PermissionManager.Action.DELETE))
        assertFalse(PermissionManager.hasPermission(salesProfile, PermissionManager.Module.SETTINGS, PermissionManager.Action.EDIT))

        // Client cannot access backoffice modules
        assertFalse(PermissionManager.hasPermission(clientProfile, PermissionManager.Module.CUSTOMERS, PermissionManager.Action.VIEW))
        assertFalse(PermissionManager.hasPermission(clientProfile, PermissionManager.Module.STAFF, PermissionManager.Action.VIEW))
    }
}
