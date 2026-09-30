package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
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
            if (profile?.favoriteProductIdsJson.isNullOrBlank()) {
                emptyList()
            } else {
                try {
                    val arr = JSONArray(profile!!.favoriteProductIdsJson)
                    val list = mutableListOf<String>()
                    for (i in 0 until arr.length()) {
                        list.add(arr.getString(i))
                    }
                    list
                } catch (_: Exception) {
                    emptyList()
                }
            }
        }
    }

    suspend fun toggleFavorite(uid: String, productId: String) = withContext(Dispatchers.IO) {
        val profile = userProfileDao.getProfile(uid) ?: return@withContext
        val currentFavorites = if (profile.favoriteProductIdsJson.isBlank()) {
            mutableListOf()
        } else {
            try {
                val arr = JSONArray(profile.favoriteProductIdsJson)
                val list = mutableListOf<String>()
                for (i in 0 until arr.length()) {
                    list.add(arr.getString(i))
                }
                list
            } catch (_: Exception) {
                mutableListOf()
            }
        }

        if (currentFavorites.contains(productId)) {
            currentFavorites.remove(productId)
        } else {
            currentFavorites.add(productId)
        }

        val updatedJson = JSONArray(currentFavorites).toString()
        val updatedProfile = profile.copy(
            favoriteProductIdsJson = updatedJson,
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = System.currentTimeMillis()
        )
        userProfileDao.insert(updatedProfile)

        val payload = JSONObject().apply {
            put("favoriteProductIds", JSONArray(currentFavorites))
            put("updatedBy", uid)
        }

        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_USER_PROFILES,
                documentId = uid,
                operation = "UPDATE",
                payloadJson = payload.toString()
            )
        )

        SyncScheduler.scheduleImmediateSync(context)
    }
}
