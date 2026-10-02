package com.flowexa.app.data.repository

import android.content.Context
import androidx.room.withTransaction
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
import com.flowexa.app.data.local.entity.ProductCategoryEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID

class ProductCategoryRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val categoryDao = database.productCategoryDao()
    private val syncDao = database.syncOperationDao()

    fun observeCategories(companyId: String): Flow<List<ProductCategoryEntity>> {
        return categoryDao.observeCategories(companyId)
    }

    suspend fun getCategory(id: String): ProductCategoryEntity? = withContext(Dispatchers.IO) {
        categoryDao.getCategory(id)
    }

    suspend fun saveCategory(
        category: ProductCategoryEntity,
        isNew: Boolean,
        currentUserId: String = ""
    ) = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        val finalCat = category.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = nowMs
        )

        val payload = JSONObject().apply {
            put("companyId", finalCat.companyId)
            put("name", finalCat.name)
            put("description", finalCat.description)
            put("icon", finalCat.icon)
            put("isDeleted", false)
            if (currentUserId.isNotEmpty()) {
                if (isNew) put("createdBy", currentUserId)
                put("updatedBy", currentUserId)
            }
        }

        database.withTransaction {
            categoryDao.insert(finalCat)
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_PRODUCT_CATEGORIES,
                    documentId = finalCat.id,
                    operation = if (isNew) OutboxOp.CREATE else OutboxOp.UPDATE,
                    payloadJson = payload.toString()
                )
            )
        }

        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun deleteCategory(id: String, currentUserId: String = "") = withContext(Dispatchers.IO) {
        val deletePayload = JSONObject().apply {
            put("isDeleted", true)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
        database.withTransaction {
            categoryDao.softDelete(id)
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_PRODUCT_CATEGORIES,
                    documentId = id,
                    operation = OutboxOp.DELETE,
                    payloadJson = deletePayload.toString()
                )
            )
        }
        SyncScheduler.scheduleImmediateSync(context)
    }
}
