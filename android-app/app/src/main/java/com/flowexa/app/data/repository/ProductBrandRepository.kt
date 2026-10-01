package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.ProductBrandEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID

class ProductBrandRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val brandDao = database.productBrandDao()
    private val syncDao = database.syncOperationDao()

    fun observeBrands(companyId: String): Flow<List<ProductBrandEntity>> {
        return brandDao.observeBrands(companyId)
    }

    suspend fun getBrand(id: String): ProductBrandEntity? = withContext(Dispatchers.IO) {
        brandDao.getBrand(id)
    }

    suspend fun saveBrand(
        brand: ProductBrandEntity,
        isNew: Boolean,
        currentUserId: String = ""
    ) = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        val finalBrand = brand.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = nowMs
        )
        brandDao.insert(finalBrand)

        val payload = JSONObject().apply {
            put("companyId", finalBrand.companyId)
            put("name", finalBrand.name)
            put("logoUrl", finalBrand.logoUrl)
            put("isDeleted", false)
            if (currentUserId.isNotEmpty()) {
                if (isNew) put("createdBy", currentUserId)
                put("updatedBy", currentUserId)
            }
        }

        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_PRODUCT_BRANDS,
                documentId = finalBrand.id,
                operation = if (isNew) "CREATE" else "UPDATE",
                payloadJson = payload.toString()
            )
        )

        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun deleteBrand(id: String, currentUserId: String = "") = withContext(Dispatchers.IO) {
        brandDao.softDelete(id)
        val deletePayload = JSONObject().apply {
            put("isDeleted", true)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_PRODUCT_BRANDS,
                documentId = id,
                operation = "DELETE",
                payloadJson = deletePayload.toString()
            )
        )
        SyncScheduler.scheduleImmediateSync(context)
    }
}
