package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "products",
    indices = [
        Index("companyId"),
        Index("companyId", "isDeleted")
    ]
)
data class ProductEntity(
    @PrimaryKey
    val id: String,
    val companyId: String,
    val name: String,
    val scientificName: String? = null,
    val description: String? = null,
    val price: Double = 0.0,
    val currency: String = "SAR",
    val categoryId: String? = null,
    val unit: String? = null,
    val brandId: String? = null,
    val imageUrl: String? = null,
    val notes: String? = null,
    val expiryDatesJson: String = "[]",
    val inStock: Boolean = true,
    val isNewProduct: Boolean = false,
    val isLowStock: Boolean = false,
    val specialOfferJson: String? = null,
    val invoiceTypeRestriction: String = "both",
    val currencyRestrictionType: String = "all",
    val specificCurrenciesJson: String = "[]",
    val bonusType: String = "none", // none, fixed, tiered
    val bonusFixedPercent: Double? = null,
    val bonusTiersJson: String = "[]",
    val isActive: Boolean = true,
    val isDeleted: Boolean = false,
    val createdAtMs: Long? = null,
    val updatedAtMs: Long? = null,
    val syncState: String = "SYNCED"
)
