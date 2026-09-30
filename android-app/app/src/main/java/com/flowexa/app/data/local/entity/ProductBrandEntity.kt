package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.flowexa.app.core.AppConfig

@Entity(tableName = "product_brands")
data class ProductBrandEntity(
    @PrimaryKey val id: String,
    val companyId: String,
    val name: String,
    val logoUrl: String? = null,
    val createdAtMs: Long? = null,
    val updatedAtMs: Long? = null,
    val isDeleted: Boolean = false,
    val syncState: String = AppConfig.SYNC_STATE_SYNCED
)
