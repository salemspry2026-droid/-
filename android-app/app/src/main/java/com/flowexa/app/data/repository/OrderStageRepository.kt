package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.OrderStageEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class OrderStageRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val stageDao = database.orderStageDao()
    private val syncDao = database.syncOperationDao()

    fun observeOrderStages(companyId: String): Flow<List<OrderStageEntity>> {
        return stageDao.observeOrderStages(companyId)
    }

    suspend fun getOrderStage(id: String): OrderStageEntity? = withContext(Dispatchers.IO) {
        stageDao.getOrderStage(id)
    }

    suspend fun saveOrderStage(
        stage: OrderStageEntity,
        isNew: Boolean,
        currentUserId: String = ""
    ) = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        val finalStage = stage.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = nowMs
        )
        stageDao.insert(finalStage)

        val payload = JSONObject().apply {
            put("companyId", finalStage.companyId)
            put("name", finalStage.name)
            put("color", finalStage.color)
            put("index", finalStage.stageIndex)
            val roles = try { JSONArray(finalStage.allowedRolesJson) } catch (_: Exception) { JSONArray().put("admin").put("sales") }
            put("allowedRoles", roles)
            put("isDeleted", false)
            if (currentUserId.isNotEmpty()) {
                if (isNew) put("createdBy", currentUserId)
                put("updatedBy", currentUserId)
            }
        }

        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_ORDER_STAGES,
                documentId = finalStage.id,
                operation = if (isNew) "CREATE" else "UPDATE",
                payloadJson = payload.toString()
            )
        )

        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun deleteOrderStage(id: String, currentUserId: String = "") = withContext(Dispatchers.IO) {
        stageDao.softDelete(id)
        val deletePayload = JSONObject().apply {
            put("isDeleted", true)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_ORDER_STAGES,
                documentId = id,
                operation = "DELETE",
                payloadJson = deletePayload.toString()
            )
        )
        SyncScheduler.scheduleImmediateSync(context)
    }
}
