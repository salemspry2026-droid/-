package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "notifications",
    indices = [
        Index("companyId"),
        Index("createdAtMs")
    ]
)
data class NotificationEntity(
    @PrimaryKey
    val id: String,
    val companyId: String,
    val title: String,
    val message: String,
    val type: String = "general",
    val orderId: String? = null,
    val clientUid: String? = null,
    val isRead: Boolean = false,
    val createdAtMs: Long? = null
)
