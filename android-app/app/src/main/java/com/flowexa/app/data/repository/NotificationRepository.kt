package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.NotificationEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class NotificationRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val notificationDao = database.notificationDao()
    private val syncDao = database.syncOperationDao()

    fun observeNotifications(companyId: String): Flow<List<NotificationEntity>> {
        return notificationDao.observeNotifications(companyId)
    }

    suspend fun markAsRead(notificationId: String, currentUid: String) = withContext(Dispatchers.IO) {
        notificationDao.markAsRead(notificationId)

        val payload = JSONObject().apply {
            put("readByAppend", JSONArray().put(currentUid))
            put("updatedBy", currentUid)
        }

        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_NOTIFICATIONS,
                documentId = notificationId,
                operation = "UPDATE",
                payloadJson = payload.toString()
            )
        )

        SyncScheduler.scheduleImmediateSync(context)
    }
}
