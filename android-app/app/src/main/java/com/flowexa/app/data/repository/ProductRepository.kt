package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class ProductRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val productDao = database.productDao()
    private val syncDao = database.syncOperationDao()

    fun observeProducts(companyId: String): Flow<List<ProductEntity>> {
        return productDao.observeProducts(companyId)
    }

    fun searchProducts(companyId: String, query: String): Flow<List<ProductEntity>> {
        return productDao.searchProducts(companyId, query)
    }

    suspend fun getProduct(id: String): ProductEntity? = withContext(Dispatchers.IO) {
        productDao.getProduct(id)
    }

    suspend fun saveProduct(product: ProductEntity, isNew: Boolean) = withContext(Dispatchers.IO) {
        val finalProduct = product.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = System.currentTimeMillis()
        )
        productDao.insert(finalProduct)

        val payload = JSONObject().apply {
            put("companyId", finalProduct.companyId)
            put("name", finalProduct.name)
            put("scientificName", finalProduct.scientificName)
            put("description", finalProduct.description)
            put("price", finalProduct.price)
            put("currency", finalProduct.currency)
            put("categoryId", finalProduct.categoryId)
            put("unit", finalProduct.unit)
            put("brandId", finalProduct.brandId)
            put("imageUrl", finalProduct.imageUrl)
            put("notes", finalProduct.notes)
            put("inStock", finalProduct.inStock)
            put("isNewProduct", finalProduct.isNewProduct)
            put("isLowStock", finalProduct.isLowStock)
            put("invoiceTypeRestriction", finalProduct.invoiceTypeRestriction)
            put("currencyRestrictionType", finalProduct.currencyRestrictionType)
            put("bonusType", finalProduct.bonusType)
            put("bonusFixedPercent", finalProduct.bonusFixedPercent)
            put("isActive", finalProduct.isActive)
            put("isDeleted", false)

            if (!finalProduct.specialOfferJson.isNullOrEmpty()) {
                try {
                    put("specialOffer", JSONObject(finalProduct.specialOfferJson))
                } catch (_: Exception) {}
            }
            if (finalProduct.specificCurrenciesJson.isNotEmpty()) {
                try {
                    put("specificCurrencies", JSONArray(finalProduct.specificCurrenciesJson))
                } catch (_: Exception) {}
            }
            if (finalProduct.expiryDatesJson.isNotEmpty()) {
                try {
                    put("expiryDates", JSONArray(finalProduct.expiryDatesJson))
                } catch (_: Exception) {}
            }
            if (finalProduct.bonusTiersJson.isNotEmpty()) {
                try {
                    put("bonusTiers", JSONArray(finalProduct.bonusTiersJson))
                } catch (_: Exception) {}
            }
        }

        syncDao.insert(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_PRODUCTS,
                documentId = finalProduct.id,
                operation = if (isNew) "CREATE" else "UPDATE",
                payloadJson = payload.toString()
            )
        )

        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun deleteProduct(id: String) = withContext(Dispatchers.IO) {
        productDao.softDelete(id)
        syncDao.insert(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_PRODUCTS,
                documentId = id,
                operation = "DELETE",
                payloadJson = "{}"
            )
        )
        SyncScheduler.scheduleImmediateSync(context)
    }
}
