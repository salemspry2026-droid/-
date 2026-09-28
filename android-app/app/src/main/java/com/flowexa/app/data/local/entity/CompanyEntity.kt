package com.flowexa.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "companies")
data class CompanyEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val ownerId: String? = null,
    val joinCode: String? = null,
    val clientJoinCode: String? = null,
    val logoUrl: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val taxId: String? = null,
    val contactNumbersJson: String = "[]",
    val aboutUs: String? = null,
    val email: String? = null,
    val notes: String? = null,
    val workingHours: String? = null,
    val companyType: String? = null,
    val primaryCurrency: String = "SAR",
    val secondaryCurrenciesJson: String = "[]",
    val exchangeRatesJson: String = "{}",
    val productUnitsJson: String = "[]",
    val createdAtMs: Long? = null,
    val updatedAtMs: Long? = null,
    val isDeleted: Boolean = false,
    val syncState: String = "SYNCED"
)
