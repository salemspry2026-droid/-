package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index

@Entity(
    tableName = "order_items",
    primaryKeys = ["orderId", "productId"],
    indices = [
        Index("orderId"),
        Index("productId")
    ]
)
data class OrderItemEntity(
    val orderId: String,
    val productId: String,
    val productName: String,
    val quantity: Double,
    val bonusQuantity: Double = 0.0,
    val price: Double,
    val currency: String = "SAR",
    val note: String? = null,
    val isManualBonus: Boolean = false
)
