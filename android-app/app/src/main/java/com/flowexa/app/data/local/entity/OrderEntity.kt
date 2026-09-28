package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "orders",
    indices = [
        Index("companyId"),
        Index("customerId"),
        Index("companyId", "status"),
        Index("companyId", "createdAtMs")
    ]
)
data class OrderEntity(
    @PrimaryKey
    val id: String,
    val companyId: String,
    val customerId: String,
    val customerName: String,
    val customerPhone: String? = null,
    val customerAddress: String? = null,
    val companyName: String? = null,
    val status: String = "pending", // pending, confirmed, processing, shipped, delivered, cancelled
    val invoiceType: String? = null, // cash, credit
    val dueDate: String? = null,
    val source: String = "admin", // admin, sales, client
    val clientUid: String? = null,
    val linkedCrmCustomerId: String? = null,
    val totalAmountByCurrencyJson: String = "{}",
    val notes: String? = null,
    val createdBy: String,
    val createdByName: String? = null,
    val updatedBy: String,
    val createdAtMs: Long? = null,
    val updatedAtMs: Long? = null,
    val isDeleted: Boolean = false,
    val syncState: String = "SYNCED"
)
