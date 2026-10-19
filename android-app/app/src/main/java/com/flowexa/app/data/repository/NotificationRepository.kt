package com.flowexa.app.data.repository

import android.content.Context
import androidx.room.withTransaction
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
import com.flowexa.app.data.local.entity.NotificationEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
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

    suspend fun createNotification(
        companyId: String, title: String, message: String, type: String,
        orderId: String?, clientUid: String?, createdBy: String, remindAtMs: Long? = null
    ) = withContext(Dispatchers.IO) {
        val id = "notif_${UUID.randomUUID()}"
        val payload = JSONObject().apply {
            put("companyId", companyId); put("title", title); put("message", message); put("type", type)
            orderId?.let { put("orderId", it) }
            clientUid?.let { put("clientUid", it) }
            remindAtMs?.let { put("remindAt", it) }
            put("readBy", org.json.JSONArray())
            put("createdBy", createdBy); put("updatedBy", createdBy); put("isDeleted", false)
        }
        syncDao.insert(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(), collectionName = AppConfig.COL_NOTIFICATIONS,
                documentId = id, operation = OutboxOp.CREATE, payloadJson = payload.toString()
            )
        )
        SyncScheduler.scheduleImmediateSync(context)
    }

    /**
     * Marks a notification as read locally and enqueues an operation-specific ARRAY_ADD on the
     * `readBy` field (never replacing the whole array). Runs in one local+outbox transaction so an
     * offline read survives a crash and is retried on reconnect.
     */
    suspend fun markAsRead(notificationId: String, currentUid: String) = withContext(Dispatchers.IO) {
        if (currentUid.isEmpty()) return@withContext
        database.withTransaction {
            notificationDao.markAsRead(notificationId)
            val payload = JSONObject(OutboxOp.buildArrayPayload("readBy", listOf(currentUid)))
                .put("updatedBy", currentUid)
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_NOTIFICATIONS,
                    documentId = notificationId,
                    operation = OutboxOp.ARRAY_ADD,
                    payloadJson = payload.toString()
                )
            )
        }
        SyncScheduler.scheduleImmediateSync(context)
    }
}
