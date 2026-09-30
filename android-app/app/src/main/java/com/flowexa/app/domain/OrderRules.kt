package com.flowexa.app.domain

import com.flowexa.app.data.local.entity.ProductEntity
import org.json.JSONArray

object OrderRules {

    data class ValidationResult(
        val isValid: Boolean,
        val errorMessage: String? = null
    )

    /**
     * Validates if a product can be ordered given requested quantity, invoice type, currency, and company settings.
     */
    fun validateProductOrder(
        product: ProductEntity,
        quantity: Double,
        invoiceType: String,
        selectedCurrency: String,
        primaryCurrency: String
    ): ValidationResult {
        // 1. Quantity check
        if (quantity <= 0.0) {
            return ValidationResult(false, "الكمية المطلوبة يجب أن تكون أكبر من صفر.")
        }

        // 2. Stock check
        if (!product.inStock) {
            return ValidationResult(false, "الصنف (${product.name}) غير متوفر حالياً بالمخزون.")
        }

        // 3. Invoice restriction check
        when (product.invoiceTypeRestriction) {
            "cash_only" -> {
                if (invoiceType.equals("credit", ignoreCase = true)) {
                    return ValidationResult(false, "الصنف (${product.name}) متاح فقط للفواتير النقدية (Cash Only).")
                }
            }
            "cash_or_pending" -> {
                if (invoiceType.equals("credit", ignoreCase = true)) {
                    return ValidationResult(false, "الصنف (${product.name}) متاح فقط للدفع النقدي أو الأجل المعلق.")
                }
            }
        }

        // 4. Currency restriction check
        when (product.currencyRestrictionType) {
            "primary_only" -> {
                if (!selectedCurrency.equals(primaryCurrency, ignoreCase = true)) {
                    return ValidationResult(false, "الصنف (${product.name}) متاح فقط بالعملة الأساسية ($primaryCurrency).")
                }
            }
            "specific" -> {
                if (product.specificCurrenciesJson.isNotBlank() && product.specificCurrenciesJson != "[]") {
                    try {
                        val allowed = JSONArray(product.specificCurrenciesJson)
                        var found = false
                        for (i in 0 until allowed.length()) {
                            if (allowed.getString(i).equals(selectedCurrency, ignoreCase = true)) {
                                found = true
                                break
                            }
                        }
                        if (!found) {
                            return ValidationResult(false, "الصنف (${product.name}) غير متاح بالعملة المحددة ($selectedCurrency).")
                        }
                    } catch (_: Exception) {}
                }
            }
        }

        return ValidationResult(true)
    }
}
