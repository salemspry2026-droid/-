package com.flowexa.app.data.repository

import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.LocationEntity
import kotlinx.coroutines.flow.Flow

class LocationRepository(private val database: FlowexaDatabase) {
    fun observeLocations(companyId: String): Flow<List<LocationEntity>> {
        return database.locationDao().observeLocations(companyId)
    }
}
