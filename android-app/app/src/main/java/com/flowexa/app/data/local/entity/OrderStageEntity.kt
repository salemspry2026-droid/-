package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.flowexa.app.core.AppConfig

@Entity(tableName = "order_stages")
data class OrderStageEntity(
    @PrimaryKey val id: String,
    val companyId: String,
    val name: String,
    val color: String? = null,
    val orderIndex: Int = 0,
    val isDeleted: Boolean = false,
    val syncState: String = AppConfig.SYNC_STATE_SYNCED
)
