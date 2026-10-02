package com.flowexa.app.sync

import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.data.remote.FirebaseProvider
import com.flowexa.app.data.remote.FirestoreMappers
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
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

data class SyncReport(
    val synced: Int = 0,
    val failed: Int = 0,
    val pending: Int = 0
)

data class SyncDiagnostics(
    val pending: Int = 0,
    val processing: Int = 0,
    val failed: Int = 0,
    val synced: Int = 0
)

class SyncEngine(
    private val database: FlowexaDatabase
) {
    companion object {
        private const val MAX_RETRY_ATTEMPTS = 5
        private val singleFlightMutex = Mutex()

        @Volatile
        private var inFlight: Deferred<Result<SyncReport>>? = null
    }

    private val firestore = FirebaseProvider.firestore

    // Application-scoped so a single-flight sync survives the caller's lifecycle.
    private val engineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Uploads all pending local changes (Outbox pattern) to Firestore.
     *
     * Uses single-flight semantics: concurrent callers share the same in-progress run and await its
     * result instead of being dropped (previous implementation silently returned success when locked).
     */
    suspend fun syncOutbox(): Result<SyncReport> {
        val deferred = singleFlightMutex.withLock {
            val current = inFlight
            if (current != null && current.isActive) {
                current
            } else {
                engineScope.async { runSync() }.also { inFlight = it }
            }
        }
        return deferred.await()
    }

    /** Explicitly retries every FAILED operation and then runs a full sync. */
    suspend fun retryFailedOperations(): Result<SyncReport> {
        database.syncOperationDao().retryAllFailed()
        singleFlightMutex.withLock { inFlight = null }
        return syncOutbox()
    }

    suspend fun getDiagnostics(): SyncDiagnostics = withContext(Dispatchers.IO) {
        val dao = database.syncOperationDao()
        SyncDiagnostics(
            pending = dao.countByState("PENDING"),
            processing = dao.countByState("PROCESSING"),
            failed = dao.countByState("FAILED"),
            synced = dao.countByState("SYNCED")
        )
    }

    private suspend fun runSync(): Result<SyncReport> {
        val syncDao = database.syncOperationDao()
        // Give previously failed (non-permanent) operations another chance.
        syncDao.retryFailedUnderAttempts(MAX_RETRY_ATTEMPTS)

        var totalSynced = 0
        var totalFailed = 0
        var transientError: Throwable? = null

        try {
            syncDao.resetProcessingOperations()
            val pendingOps = syncDao.getPendingOperations()

            for (op in pendingOps) {
                try {
                    syncDao.markProcessing(op.id)
                    applyOperation(op)
                    syncDao.markSynced(op.id)
                    markLocalEntitySynced(op)
                    totalSynced++
                } catch (e: Exception) {
                    if (isTransientSyncError(e)) {
                        syncDao.markPending(op.id, e.message)
                        transientError = transientError ?: e
                    } else {
                        syncDao.markFailed(op.id, e.message)
                        totalFailed++
                    }
                }
            }

            syncDao.clearSynced()
        } catch (e: Exception) {
            if (isTransientSyncError(e)) {
                transientError = transientError ?: e
            } else {
                return Result.failure(e)
            }
        }

        val report = SyncReport(
            synced = totalSynced,
            failed = totalFailed,
            pending = syncDao.countByState(AppConfig.SYNC_STATE_PENDING)
        )

        return if (transientError != null) {
            Result.failure(IOException("Temporary sync failure; will retry", transientError))
        } else {
            Result.success(report)
        }
    }

    private suspend fun applyOperation(op: SyncOperationEntity) {
        val docRef = firestore.collection(op.collectionName).document(op.documentId)

        when (op.operation) {
            OutboxOp.CREATE, OutboxOp.UPDATE -> {
                val payloadMap = jsonToMap(JSONObject(op.payloadJson))
                    .filterKeys { !it.startsWith("__") }
                    .toMutableMap()
                payloadMap["updatedAt"] = FieldValue.serverTimestamp()
                if (op.operation == OutboxOp.CREATE && !payloadMap.containsKey("createdAt")) {
                    payloadMap["createdAt"] = FieldValue.serverTimestamp()
                }
                docRef.set(payloadMap, SetOptions.merge()).await()
            }

            OutboxOp.DELETE -> {
                val payloadMap = try {
                    jsonToMap(JSONObject(op.payloadJson))
                } catch (_: Exception) {
                    emptyMap()
                }
                val updateMap = mutableMapOf<String, Any?>(
                    "isDeleted" to true,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
                (payloadMap["updatedBy"] as? String)?.takeIf { it.isNotEmpty() }?.let { updateMap["updatedBy"] = it }
                (payloadMap["mergedInto"] as? String)?.takeIf { it.isNotEmpty() }?.let { updateMap["mergedInto"] = it }
                docRef.set(updateMap, SetOptions.merge()).await()
            }

            OutboxOp.ARRAY_ADD -> {
                val field = OutboxOp.arrayField(op.payloadJson)
                val values = OutboxOp.arrayValues(op.payloadJson)
                if (field.isNotEmpty() && values.isNotEmpty()) {
                    val updateMap = mutableMapOf<String, Any?>(
                        field to FieldValue.arrayUnion(*values.toTypedArray()),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                    (jsonToMap(JSONObject(op.payloadJson))["updatedBy"] as? String)
                        ?.takeIf { it.isNotEmpty() }
                        ?.let { updateMap["updatedBy"] = it }
                    docRef.set(updateMap, SetOptions.merge()).await()
                }
            }

            OutboxOp.ARRAY_REMOVE -> {
                val field = OutboxOp.arrayField(op.payloadJson)
                val values = OutboxOp.arrayValues(op.payloadJson)
                if (field.isNotEmpty() && values.isNotEmpty()) {
                    val updateMap = mutableMapOf<String, Any?>(
                        field to FieldValue.arrayRemove(*values.toTypedArray()),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                    (jsonToMap(JSONObject(op.payloadJson))["updatedBy"] as? String)
                        ?.takeIf { it.isNotEmpty() }
                        ?.let { updateMap["updatedBy"] = it }
                    docRef.set(updateMap, SetOptions.merge()).await()
                }
            }
        }
    }

    private suspend fun markLocalEntitySynced(op: SyncOperationEntity) {
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
    }

    /**
     * Downloads data from Firestore into local Room database for the given companyId and role,
     * respecting local pending drafts (never overwriting an unsynced local mutation) and applying
     * remote tombstones.
     */
    suspend fun syncCompanyData(companyId: String, uid: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            // 1. Company profile
            val companyDoc = firestore.collection(AppConfig.COL_COMPANIES).document(companyId).get().await()
            if (companyDoc.exists()) {
                val company = FirestoreMappers.docToCompany(companyDoc)
                val localComp = database.companyDao().getCompany(companyId)
                if (localComp == null || localComp.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    database.companyDao().insert(company)
                }
            }

            // 2. Products
            val productsSnapshot = firestore.collection(AppConfig.COL_PRODUCTS)
                .whereEqualTo("companyId", companyId).get().await()
            for (doc in productsSnapshot.documents) {
                val rp = FirestoreMappers.docToProduct(doc)
                val local = database.productDao().getProduct(rp.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (rp.isDeleted) database.productDao().softDelete(rp.id) else database.productDao().insert(rp)
                }
            }

            // 3. Categories
            for (doc in firestore.collection(AppConfig.COL_PRODUCT_CATEGORIES)
                .whereEqualTo("companyId", companyId).get().await().documents) {
                val cat = FirestoreMappers.docToProductCategory(doc)
                val local = database.productCategoryDao().getCategory(cat.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (cat.isDeleted) database.productCategoryDao().softDelete(cat.id) else database.productCategoryDao().insert(cat)
                }
            }

            // 4. Brands
            for (doc in firestore.collection(AppConfig.COL_PRODUCT_BRANDS)
                .whereEqualTo("companyId", companyId).get().await().documents) {
                val brand = FirestoreMappers.docToProductBrand(doc)
                val local = database.productBrandDao().getBrand(brand.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (brand.isDeleted) database.productBrandDao().softDelete(brand.id) else database.productBrandDao().insert(brand)
                }
            }

            // 5. Locations
            for (doc in firestore.collection(AppConfig.COL_LOCATIONS)
                .whereEqualTo("companyId", companyId).get().await().documents) {
                val loc = FirestoreMappers.docToLocation(doc)
                val local = database.locationDao().getLocation(loc.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (loc.isDeleted) database.locationDao().softDelete(loc.id) else database.locationDao().insert(loc)
                }
            }

            // 6. Order stages
            for (doc in firestore.collection(AppConfig.COL_ORDER_STAGES)
                .whereEqualTo("companyId", companyId).get().await().documents) {
                val stage = FirestoreMappers.docToOrderStage(doc)
                val local = database.orderStageDao().getOrderStage(stage.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (stage.isDeleted) database.orderStageDao().softDelete(stage.id) else database.orderStageDao().insert(stage)
                }
            }

            // 7. Customers
            for (doc in firestore.collection(AppConfig.COL_CUSTOMERS)
                .whereEqualTo("companyId", companyId).get().await().documents) {
                val rc = FirestoreMappers.docToCustomer(doc)
                val local = database.customerDao().getCustomer(rc.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (rc.isDeleted) database.customerDao().softDelete(rc.id) else database.customerDao().insert(rc)
                }
            }

            // 8. Customer phones (never overwrite a locally PENDING phone)
            for (doc in firestore.collection(AppConfig.COL_CUSTOMER_PHONES)
                .whereEqualTo("companyId", companyId).get().await().documents) {
                val phone = FirestoreMappers.docToCustomerPhone(doc)
                val local = database.customerPhoneDao().getPhone(phone.id)
                if (local == null || local.syncState == AppConfig.SYNC_STATE_SYNCED) {
                    if (phone.isDeleted) {
                        database.customerPhoneDao().softDelete(phone.id, System.currentTimeMillis())
                    } else {
                        database.customerPhoneDao().insert(phone)
                    }
                }
            }

            // 9. Orders (protect local uncommitted drafts)
            for (orderDoc in firestore.collection(AppConfig.COL_ORDERS)
                .whereEqualTo("companyId", companyId).get().await().documents) {
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

            // 10. Notifications (per-user read state)
            val notifications = firestore.collection(AppConfig.COL_NOTIFICATIONS)
                .whereEqualTo("companyId", companyId).get().await().documents
                .map { FirestoreMappers.docToNotification(it, uid) }
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
