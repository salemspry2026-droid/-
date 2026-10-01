package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "customer_phones",
    indices = [
        Index("companyId"),
        Index("customerId"),
        Index("phoneNormalized"),
        Index("companyId", "phoneNormalized")
    ]
)
data class CustomerPhoneEntity(
    @PrimaryKey
    val id: String,
    val companyId: String,
    val customerId: String,
    val phoneRaw: String,
    val phoneNormalized: String,
    val label: String = "primary",
    val isPrimary: Boolean = false,
    val createdAtMs: Long = System.currentTimeMillis(),
    val updatedAtMs: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false,
    val syncState: String = "SYNCED"
)
