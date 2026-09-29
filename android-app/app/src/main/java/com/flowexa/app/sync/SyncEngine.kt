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
    private val firestore = FirebaseProvider.firestore

    /**
     * Uploads all pending local changes (Outbox pattern) to Firestore
     */
    suspend fun syncOutbox(): Result<Int> = withContext(Dispatchers.IO) {
        val syncDao = database.syncOperationDao()
        syncDao.resetProcessingOperations()
        val pendingOps = syncDao.getPendingOperations()
        var syncedCount = 0
        var transientError: Throwable? = null

        for (op in pendingOps) {
            try {
                syncDao.markProcessing(op.id)
                val collection = firestore.collection(op.collectionName)

                when (op.operation) {
                    "CREATE", "UPDATE" -> {
                        val payloadMap = jsonToMap(JSONObject(op.payloadJson))
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
                    AppConfig.COL_ORDERS -> database.orderDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                    AppConfig.COL_COMPANIES -> database.companyDao().updateSyncState(op.documentId, AppConfig.SYNC_STATE_SYNCED)
                }

                syncedCount++
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
        transientError?.let { return@withContext Result.failure(IOException("Temporary sync failure", it)) }
        Result.success(syncedCount)
    }

    /**
     * Downloads data from Firestore into local Room database for the given companyId and role
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

            // 2. Sync Products (protect local uncommitted drafts)
            val productsSnapshot = firestore.collection(AppConfig.COL_PRODUCTS)
                .whereEqualTo("companyId", companyId)
                .whereEqualTo("isDeleted", false)
                .get()
                .await()
            val remoteProducts = productsSnapshot.documents.map { FirestoreMappers.docToProduct(it) }
            for (rp in remoteProducts) {
                val local = database.productDao().getProduct(rp.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    database.productDao().insert(rp)
                }
            }

            // 3. Sync Customers (protect local uncommitted drafts)
            val customersSnapshot = firestore.collection(AppConfig.COL_CUSTOMERS)
                .whereEqualTo("companyId", companyId)
                .whereEqualTo("isDeleted", false)
                .get()
                .await()
            val remoteCustomers = customersSnapshot.documents.map { FirestoreMappers.docToCustomer(it) }
            for (rc in remoteCustomers) {
                val local = database.customerDao().getCustomer(rc.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    database.customerDao().insert(rc)
                }
            }

            // 4. Sync Orders (protect local uncommitted drafts)
            val ordersSnapshot = firestore.collection(AppConfig.COL_ORDERS)
                .whereEqualTo("companyId", companyId)
                .whereEqualTo("isDeleted", false)
                .get()
                .await()
            for (orderDoc in ordersSnapshot.documents) {
                val (remoteOrder, items) = FirestoreMappers.docToOrder(orderDoc)
                val local = database.orderDao().getOrder(remoteOrder.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    database.orderDao().saveOrderWithItems(remoteOrder, items)
                }
            }

            // 5. Sync Notifications (per-user read state)
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
