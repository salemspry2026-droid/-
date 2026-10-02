package com.flowexa.app.data.repository

import android.content.Context
import androidx.room.withTransaction
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
import com.flowexa.app.data.local.entity.ProductEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
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

    /**
     * Persists a product. On edit, fields not present in the UI model are preserved from the stored
     * entity so an update can never wipe categoryId/brandId/imageUrl/notes/offer/tiers/etc.
     */
    suspend fun saveProduct(product: ProductEntity, isNew: Boolean, currentUserId: String = "") = withContext(Dispatchers.IO) {
        val existing = if (!isNew) productDao.getProduct(product.id) else null
        val finalProduct = (existing?.copy(
            name = product.name,
            scientificName = product.scientificName ?: existing.scientificName,
            description = product.description ?: existing.description,
            price = product.price,
            currency = product.currency,
            categoryId = product.categoryId ?: existing.categoryId,
            unit = product.unit ?: existing.unit,
            brandId = product.brandId ?: existing.brandId,
            imageUrl = product.imageUrl ?: existing.imageUrl,
            notes = product.notes ?: existing.notes,
            inStock = product.inStock,
            isNewProduct = product.isNewProduct,
            isLowStock = product.isLowStock,
            invoiceTypeRestriction = product.invoiceTypeRestriction,
            currencyRestrictionType = product.currencyRestrictionType,
            bonusType = product.bonusType,
            bonusFixedPercent = product.bonusFixedPercent ?: existing.bonusFixedPercent,
            isActive = product.isActive,
            specialOfferJson = product.specialOfferJson ?: existing.specialOfferJson,
            specificCurrenciesJson = if (product.specificCurrenciesJson.isNotEmpty()) product.specificCurrenciesJson else existing.specificCurrenciesJson,
            expiryDatesJson = if (product.expiryDatesJson.isNotEmpty()) product.expiryDatesJson else existing.expiryDatesJson,
            bonusTiersJson = if (product.bonusTiersJson.isNotEmpty()) product.bonusTiersJson else existing.bonusTiersJson,
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = System.currentTimeMillis()
        ) ?: product.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = System.currentTimeMillis()
        ))

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

            if (currentUserId.isNotEmpty()) {
                if (isNew) put("createdBy", currentUserId)
                put("updatedBy", currentUserId)
            }

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

        database.withTransaction {
            productDao.insert(finalProduct)
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_PRODUCTS,
                    documentId = finalProduct.id,
                    operation = if (isNew) OutboxOp.CREATE else OutboxOp.UPDATE,
                    payloadJson = payload.toString()
                )
            )
        }

        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun deleteProduct(id: String, currentUserId: String = "") = withContext(Dispatchers.IO) {
        val deletePayload = JSONObject().apply {
            put("isDeleted", true)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
        database.withTransaction {
            productDao.softDelete(id)
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_PRODUCTS,
                    documentId = id,
                    operation = OutboxOp.DELETE,
                    payloadJson = deletePayload.toString()
                )
            )
        }
        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun loadPublicCatalog(companyId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val firestore = com.flowexa.app.data.remote.FirebaseProvider.firestore
            val companyDoc = firestore.collection(AppConfig.COL_COMPANIES).document(companyId).get().await()
            if (companyDoc.exists()) {
                val company = com.flowexa.app.data.remote.FirestoreMappers.docToCompany(companyDoc)
                database.companyDao().insert(company)
            }

            val productsSnapshot = firestore.collection(AppConfig.COL_PRODUCTS)
                .whereEqualTo("companyId", companyId)
                .whereEqualTo("isDeleted", false)
                .get()
                .await()
            val products = productsSnapshot.documents.map { com.flowexa.app.data.remote.FirestoreMappers.docToProduct(it) }
            database.productDao().insertAll(products)

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
