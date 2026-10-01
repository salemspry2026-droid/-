package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.LocationEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID

class LocationRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val locationDao = database.locationDao()
    private val syncDao = database.syncOperationDao()

    fun observeLocations(companyId: String): Flow<List<LocationEntity>> {
        return locationDao.observeLocations(companyId)
    }

    suspend fun getLocation(id: String): LocationEntity? = withContext(Dispatchers.IO) {
        locationDao.getLocation(id)
    }

    suspend fun saveLocation(
        location: LocationEntity,
        isNew: Boolean,
        currentUserId: String = ""
    ) = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        val finalLoc = location.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = nowMs
        )
        locationDao.insert(finalLoc)

        val payload = JSONObject().apply {
            put("companyId", finalLoc.companyId)
            put("type", finalLoc.type)
            put("name", finalLoc.name)
            put("parentId", finalLoc.parentId)
            put("address", finalLoc.address)
            put("isDeleted", false)
            if (currentUserId.isNotEmpty()) {
                if (isNew) put("createdBy", currentUserId)
                put("updatedBy", currentUserId)
            }
        }

        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_LOCATIONS,
                documentId = finalLoc.id,
                operation = if (isNew) "CREATE" else "UPDATE",
                payloadJson = payload.toString()
            )
        )

        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun deleteLocation(id: String, currentUserId: String = "") = withContext(Dispatchers.IO) {
        locationDao.softDelete(id)
        val deletePayload = JSONObject().apply {
            put("isDeleted", true)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_LOCATIONS,
                documentId = id,
                operation = "DELETE",
                payloadJson = deletePayload.toString()
            )
        )
        SyncScheduler.scheduleImmediateSync(context)
    }
}
