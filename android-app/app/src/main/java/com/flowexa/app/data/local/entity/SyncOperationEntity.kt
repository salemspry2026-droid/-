package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "sync_operations",
    indices = [
        Index("state"),
        Index("collectionName", "documentId")
    ]
)
data class SyncOperationEntity(
    @PrimaryKey
    val id: String,
    val collectionName: String,
    val documentId: String,
    val operation: String, // CREATE, UPDATE, DELETE
    val payloadJson: String,
    val createdAtMs: Long = System.currentTimeMillis(),
    val attempts: Int = 0,
    val state: String = "PENDING", // PENDING, PROCESSING, SYNCED, FAILED, CONFLICT
    val lastError: String? = null
)
