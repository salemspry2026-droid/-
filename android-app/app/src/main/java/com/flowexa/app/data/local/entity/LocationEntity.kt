package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.flowexa.app.core.AppConfig

@Entity(tableName = "locations")
data class LocationEntity(
    @PrimaryKey val id: String,
    val companyId: String,
    val type: String = "region",
    val name: String,
    val parentId: String? = null,
    val address: String? = null,
    val createdAtMs: Long? = null,
    val updatedAtMs: Long? = null,
    val isDeleted: Boolean = false,
    val syncState: String = AppConfig.SYNC_STATE_SYNCED
)

