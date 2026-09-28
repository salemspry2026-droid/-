package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "call_recordings")
data class CallRecordingEntity(
    @PrimaryKey
    val id: String,
    val companyId: String,
    val customerId: String? = null,
    val contactName: String,
    val phone: String,
    val filePath: String,
    val durationSeconds: Long = 0,
    val note: String? = null,
    val createdAtMs: Long = System.currentTimeMillis()
)
