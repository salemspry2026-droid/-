package com.flowexa.app.sync

import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.remote.FirebaseProvider
import com.flowexa.app.data.remote.FirestoreMappers
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

internal fun isTransientSyncError(error: Throwable): Boolean {
    val firestoreError = error as? FirebaseFirestoreException
    if (firestoreError != null) {
        return firestoreError.code in setOf(
            FirebaseFirestoreException.Code.UNAVAILABLE,
            FirebaseFirestoreException.Code.DEADLINE_EXCEEDED,
            FirebaseFirestoreException.Code.ABORTED,
            FirebaseFirestoreException.Code.RESOURCE_EXHAUSTED
        )
    }
    return error is IOException || error.cause?.let(::isTransientSyncError) == true
}
class SyncEngine(
    private val database: FlowexaDatabase
) {
    companion object {
        private val syncMutex = kotlinx.coroutines.sync.Mutex()
        @Volatile
        private var hasQueuedSync = false
    }

    private val firestore = FirebaseProvider.firestore

    /**
     * Uploads all pending local changes (Outbox pattern) to Firestore with single-flight mutex protection
     */
    suspend fun syncOutbox(): Result<Int> = withContext(Dispatchers.IO) {
        if (syncMutex.isLocked) {
            hasQueuedSync = true
            return@withContext Result.success(0)
        }

        syncMutex.lock()
        try {
            val syncDao = database.syncOperationDao()
            var totalSynced = 0
            var transientError: Throwable? = null

            do {
                hasQueuedSync = false
                syncDao.resetProcessingOperations()
                val pendingOps = syncDao.getPendingOperations()

                for (op in pendingOps) {
                    try {
                        syncDao.markProcessing(op.id)
                        val collection = firestore.collection(op.collectionName)

                        when (op.operation) {
                            "CREATE", "UPDATE" -> {
                                val payloadMap = jsonToMap(JSONObject(op.payloadJson))
                                val appendList = payloadMap["readByAppend"] as? List<*>
                                if (appendList != null && appendList.isNotEmpty()) {
                                    val updateMap = mutableMapOf<String, Any>(
                                        "readBy" to FieldValue.arrayUnion(*appendList.toTypedArray()),
                                        "updatedAt" to FieldValue.serverTimestamp()
                                    )
                                    val updatedBy = payloadMap["updatedBy"] as? String
                                    if (!updatedBy.isNullOrEmpty()) {
                                        updateMap["updatedBy"] = updatedBy
                                    }
                                    collection.document(op.documentId)
                                        .update(updateMap)
                                        .await()
                                } else {
                                    val finalPayload = payloadMap.toMutableMap().apply {
                                        put("updatedAt", FieldValue.serverTimestamp())
                                        if (op.operation == "CREATE" && !containsKey("createdAt")) {
                                            put("createdAt", FieldValue.serverTimestamp())
                                        }
                                    }
                                    collection.document(op.documentId)
                                        .set(finalPayload, SetOptions.merge())
                                        .await()
                                }
                            }
                            "DELETE" -> {
                                collection.document(op.documentId)
                                    .update(mapOf("isDeleted" to true, "updatedAt" to FieldValue.serverTimestamp()))
                                    .await()
                            }
                        }

                        syncDao.markSynced(op.id)

                        // Update Room entity syncState to SYNCED
                        when (op.collectionName) {
                            AppConfig.COL_PRODUCTS -> database.productDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_CUSTOMERS -> database.customerDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_CUSTOMER_PHONES -> database.customerPhoneDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_ORDERS -> database.orderDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_COMPANIES -> database.companyDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_PRODUCT_CATEGORIES -> database.productCategoryDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_PRODUCT_BRANDS -> database.productBrandDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_LOCATIONS -> database.locationDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_ORDER_STAGES -> database.orderStageDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                            AppConfig.COL_USER_PROFILES -> database.userProfileDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                        }

                        totalSynced++
                    } catch (e: Exception) {
                        if (isTransientSyncError(e)) {
                            syncDao.markPending(op.id, e.message)
                            transientError = transientError ?: e
                        } else {
                            syncDao.markFailed(op.id, e.message)
                        }
                    }
                }

                syncDao.clearSynced()
            } while (hasQueuedSync)

            transientError?.let { return@withContext Result.failure(IOException("Temporary sync failure", it)) }
            Result.success(totalSynced)
        } finally {
            syncMutex.unlock()
        }
    }

    /**
     * Downloads data from Firestore into local Room database for the given companyId and role,
     * respecting local drafts and applying remote tombstones.
     */
    suspend fun syncCompanyData(companyId: String, uid: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            // 1. Sync Company Profile
            val companyDoc = firestore.collection(AppConfig.COL_COMPANIES).document(companyId).get().await()
            if (companyDoc.exists()) {
                val company = FirestoreMappers.docToCompany(companyDoc)
                val localComp = database.companyDao().getCompany(companyId)
                if (localComp == null || localComp.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    database.companyDao().insert(company)
                }
            }

            // 2. Sync Products (with tombstones)
            val productsSnapshot = firestore.collection(AppConfig.COL_PRODUCTS)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            for (doc in productsSnapshot.documents) {
                val rp = FirestoreMappers.docToProduct(doc)
                val local = database.productDao().getProduct(rp.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (rp.isDeleted) {
                        database.productDao().softDelete(rp.id)
                    } else {
                        database.productDao().insert(rp)
                    }
                }
            }

            // 3. Sync Categories (with tombstones)
            val categoriesSnapshot = firestore.collection(AppConfig.COL_PRODUCT_CATEGORIES)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            for (doc in categoriesSnapshot.documents) {
                val cat = FirestoreMappers.docToProductCategory(doc)
                val local = database.productCategoryDao().getCategory(cat.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (cat.isDeleted) {
                        database.productCategoryDao().softDelete(cat.id)
                    } else {
                        database.productCategoryDao().insert(cat)
                    }
                }
            }

            // 4. Sync Brands (with tombstones)
            val brandsSnapshot = firestore.collection(AppConfig.COL_PRODUCT_BRANDS)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            for (doc in brandsSnapshot.documents) {
                val brand = FirestoreMappers.docToProductBrand(doc)
                val local = database.productBrandDao().getBrand(brand.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (brand.isDeleted) {
                        database.productBrandDao().softDelete(brand.id)
                    } else {
                        database.productBrandDao().insert(brand)
                    }
                }
            }

            // 5. Sync Locations (with tombstones)
            val locationsSnapshot = firestore.collection(AppConfig.COL_LOCATIONS)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            for (doc in locationsSnapshot.documents) {
                val loc = FirestoreMappers.docToLocation(doc)
                val local = database.locationDao().getLocation(loc.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (loc.isDeleted) {
                        database.locationDao().softDelete(loc.id)
                    } else {
                        database.locationDao().insert(loc)
                    }
                }
            }

            // 6. Sync Order Stages (with tombstones)
            val stagesSnapshot = firestore.collection(AppConfig.COL_ORDER_STAGES)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            for (doc in stagesSnapshot.documents) {
                val stage = FirestoreMappers.docToOrderStage(doc)
                val local = database.orderStageDao().getOrderStage(stage.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (stage.isDeleted) {
                        database.orderStageDao().softDelete(stage.id)
                    } else {
                        database.orderStageDao().insert(stage)
                    }
                }
            }

            // 7. Sync Customers (with tombstones)
            val customersSnapshot = firestore.collection(AppConfig.COL_CUSTOMERS)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            for (doc in customersSnapshot.documents) {
                val rc = FirestoreMappers.docToCustomer(doc)
                val local = database.customerDao().getCustomer(rc.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (rc.isDeleted) {
                        database.customerDao().softDelete(rc.id)
                    } else {
                        database.customerDao().insert(rc)
                    }
                }
            }

            // 8. Sync Customer Phones (with tombstones)
            val phonesSnapshot = firestore.collection(AppConfig.COL_CUSTOMER_PHONES)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            for (doc in phonesSnapshot.documents) {
                val phone = FirestoreMappers.docToCustomerPhone(doc)
                if (phone.isDeleted) {
                    database.customerPhoneDao().softDelete(phone.id, System.currentTimeMillis())
                } else {
                    database.customerPhoneDao().insert(phone)
                }
            }

            // 9. Sync Orders (protect local uncommitted drafts)
            val ordersSnapshot = firestore.collection(AppConfig.COL_ORDERS)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            for (orderDoc in ordersSnapshot.documents) {
                val (remoteOrder, items) = FirestoreMappers.docToOrder(orderDoc)
                val local = database.orderDao().getOrder(remoteOrder.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (remoteOrder.isDeleted) {
                        database.orderDao().softDelete(remoteOrder.id)
                    } else {
                        database.orderDao().saveOrderWithItems(remoteOrder, items)
                    }
                }
            }

            // 10. Sync Notifications (per-user read state)
            val notifsSnapshot = firestore.collection(AppConfig.COL_NOTIFICATIONS)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            val notifications = notifsSnapshot.documents.map { FirestoreMappers.docToNotification(it, uid) }
            database.notificationDao().insertAll(notifications)

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun jsonToMap(json: JSONObject): Map<String, Any?> {
        val map = mutableMapOf<String, Any?>()
        val keys = json.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            val value = json.get(key)
            map[key] = when (value) {
                is JSONObject -> jsonToMap(value)
                is JSONArray -> jsonToList(value)
                JSONObject.NULL -> null
                else -> value
            }
        }
        return map
    }

    private fun jsonToList(json: JSONArray): List<Any?> {
        val list = mutableListOf<Any?>()
        for (i in 0 until json.length()) {
            val value = json.get(i)
            list.add(
                when (value) {
                    is JSONObject -> jsonToMap(value)
                    is JSONArray -> jsonToList(value)
                    JSONObject.NULL -> null
                    else -> value
                }
            )
        }
        return list
    }
}
