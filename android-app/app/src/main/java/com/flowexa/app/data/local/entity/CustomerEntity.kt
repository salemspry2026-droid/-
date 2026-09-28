package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "customers",
    indices = [
        Index("companyId"),
        Index("companyId", "phone"),
        Index("companyId", "isDeleted")
    ]
)
data class CustomerEntity(
    @PrimaryKey
    val id: String,
    val companyId: String,
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val contactNumbersJson: String = "[]",
    val address: String? = null,
    val notes: String? = null,
    val appUserId: String? = null,
    val createdAtMs: Long? = null,
    val updatedAtMs: Long? = null,
    val isDeleted: Boolean = false,
    val syncState: String = "SYNCED"
)
