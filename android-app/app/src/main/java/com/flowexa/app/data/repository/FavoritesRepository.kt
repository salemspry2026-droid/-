package com.flowexa.app.data.repository

import android.content.Context
import androidx.room.withTransaction
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class FavoritesRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val userProfileDao = database.userProfileDao()
    private val syncDao = database.syncOperationDao()

    fun observeFavoriteProductIds(uid: String): Flow<List<String>> {
        return userProfileDao.observeProfile(uid).map { profile ->
            parseIds(profile?.favoriteProductIdsJson)
        }
    }

    /**
     * Toggles a favourite using operation-specific ARRAY_ADD / ARRAY_REMOVE instead of replacing the
     * whole Firestore array, which avoids clobbering concurrent changes made on other devices.
     */
    suspend fun toggleFavorite(uid: String, productId: String) = withContext(Dispatchers.IO) {
        if (uid.isEmpty() || productId.isEmpty()) return@withContext
        val profile = userProfileDao.getProfile(uid) ?: return@withContext
        val current = parseIds(profile.favoriteProductIdsJson).toMutableSet()
        val removing = current.contains(productId)
        if (removing) current.remove(productId) else current.add(productId)

        val nowMs = System.currentTimeMillis()
        val op = if (removing) OutboxOp.ARRAY_REMOVE else OutboxOp.ARRAY_ADD
        val payload = JSONObject(OutboxOp.buildArrayPayload("favoriteProductIds", listOf(productId)))
            .put("updatedBy", uid)

        database.withTransaction {
            userProfileDao.insert(
                profile.copy(
                    favoriteProductIdsJson = JSONArray(current.toList()).toString(),
                    syncState = AppConfig.SYNC_STATE_PENDING,
                    updatedAtMs = nowMs
                )
            )
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_USER_PROFILES,
                    documentId = uid,
                    operation = op,
                    payloadJson = payload.toString()
                )
            )
        }
        SyncScheduler.scheduleImmediateSync(context)
    }

    private fun parseIds(json: String?): List<String> {
        if (json.isNullOrBlank()) return emptyList()
        return try {
            val arr = JSONArray(json)
            val list = mutableListOf<String>()
            for (i in 0 until arr.length()) list.add(arr.getString(i))
            list
        } catch (_: Exception) {
            emptyList()
        }
    }
}
