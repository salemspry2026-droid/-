package com.flowexa.app.sync

import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.remote.FirebaseProvider
import com.flowexa.app.data.remote.FirestoreMappers
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class SyncEngine(
    private val database: FlowexaDatabase
) {
    private val firestore = FirebaseProvider.firestore

    /**
     * Uploads all pending local changes (Outbox pattern) to Firestore
     */
    suspend fun syncOutbox(): Result<Int> = withContext(Dispatchers.IO) {
        val syncDao = database.syncOperationDao()
        val pendingOps = syncDao.getPendingOperations()
        var syncedCount = 0

        for (op in pendingOps) {
            try {
                syncDao.markProcessing(op.id)
                val collection = firestore.collection(op.collectionName)

                when (op.operation) {
                    "CREATE", "UPDATE" -> {
                        val payloadMap = jsonToMap(JSONObject(op.payloadJson))
                        // Add server timestamp for updatedAt
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
                        // Soft delete on server as per Flowexa guidelines
                        collection.document(op.documentId)
                            .update(mapOf("isDeleted" to true, "updatedAt" to FieldValue.serverTimestamp()))
                            .await()
                    }
                }

                syncDao.markSynced(op.id)
                syncedCount++
            } catch (e: Exception) {
                syncDao.markFailed(op.id, e.message)
            }
        }

        syncDao.clearSynced()
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
                database.companyDao().insert(company)
            }

            // 2. Sync Products
            val productsSnapshot = firestore.collection(AppConfig.COL_PRODUCTS)
                .whereEqualTo("companyId", companyId)
                .whereEqualTo("isDeleted", false)
                .get()
                .await()
            val products = productsSnapshot.documents.map { FirestoreMappers.docToProduct(it) }
            database.productDao().insertAll(products)

            // 3. Sync Customers
            val customersSnapshot = firestore.collection(AppConfig.COL_CUSTOMERS)
                .whereEqualTo("companyId", companyId)
                .whereEqualTo("isDeleted", false)
                .get()
                .await()
            val customers = customersSnapshot.documents.map { FirestoreMappers.docToCustomer(it) }
            database.customerDao().insertAll(customers)

            // 4. Sync Orders
            val ordersSnapshot = firestore.collection(AppConfig.COL_ORDERS)
                .whereEqualTo("companyId", companyId)
                .whereEqualTo("isDeleted", false)
                .get()
                .await()
            for (orderDoc in ordersSnapshot.documents) {
                val (order, items) = FirestoreMappers.docToOrder(orderDoc)
                database.orderDao().saveOrderWithItems(order, items)
            }

            // 5. Sync Notifications
            val notifsSnapshot = firestore.collection(AppConfig.COL_NOTIFICATIONS)
                .whereEqualTo("companyId", companyId)
                .get()
                .await()
            val notifications = notifsSnapshot.documents.map { FirestoreMappers.docToNotification(it) }
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
