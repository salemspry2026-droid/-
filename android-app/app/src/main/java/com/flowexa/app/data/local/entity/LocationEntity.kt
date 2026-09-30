package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.flowexa.app.core.AppConfig

@Entity(tableName = "locations")
data class LocationEntity(
    @PrimaryKey val id: String,
    val companyId: String,
    val name: String,
    val address: String? = null,
    val isDeleted: Boolean = false,
    val syncState: String = AppConfig.SYNC_STATE_SYNCED
)
