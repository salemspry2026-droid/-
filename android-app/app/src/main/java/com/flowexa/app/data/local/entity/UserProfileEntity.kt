package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "user_profiles")
data class UserProfileEntity(
    @PrimaryKey
    val id: String,
    val email: String,
    val displayName: String,
    val companyId: String? = null,
    val role: String? = null,
    val companyName: String? = null,
    val phone: String? = null,
    val storeName: String? = null,
    val address: String? = null,
    val addressCountry: String? = null,
    val addressGov: String? = null,
    val addressCity: String? = null,
    val addressNeighborhood: String? = null,
    val logoUrl: String? = null,
    val activityType: String? = null,
    val activityTypeOther: String? = null,
    val notes: String? = null,
    val favoriteProductIdsJson: String = "[]",
    val permissionsJson: String = "{}",
    val createdAtMs: Long? = null,
    val updatedAtMs: Long? = null,
    val isDeleted: Boolean = false,
    val syncState: String = "SYNCED"
)
