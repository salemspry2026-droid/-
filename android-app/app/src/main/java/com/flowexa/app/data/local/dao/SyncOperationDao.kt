package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.flowexa.app.data.local.entity.SyncOperationEntity
import kotlinx.coroutines.flow.Flow
import org.json.JSONArray
import org.json.JSONObject

/**
 * Outbox operations. Each mutation writes its local entity and its outbox row inside a single
 * Room transaction (see the repositories), so a crash can never leave a PENDING local entity
 * without a matching outbox entry.
 *
 * Supported operation semantics:
 *  - CREATE      : create the document with the full payload (SetOptions.merge).
 *  - UPDATE      : merge/patch only the supplied fields (SetOptions.merge).
 *  - DELETE      : soft delete (isDeleted=true + audit fields + server timestamp).
 *  - ARRAY_ADD   : FieldValue.arrayUnion on a single array field.
 *  - ARRAY_REMOVE: FieldValue.arrayRemove on a single array field.
 */
@Dao
interface SyncOperationDao {
    @Query("SELECT * FROM sync_operations WHERE state = 'PENDING' ORDER BY createdAtMs ASC")
    suspend fun getPendingOperations(): List<SyncOperationEntity>

    @Query("SELECT * FROM sync_operations WHERE state = 'PENDING' AND collectionName = :col AND documentId = :docId ORDER BY createdAtMs ASC")
    suspend fun findPendingOps(col: String, docId: String): List<SyncOperationEntity>

    @Query("SELECT * FROM sync_operations WHERE state = 'FAILED' ORDER BY createdAtMs ASC")
    suspend fun getFailedOperations(): List<SyncOperationEntity>

    @Query("SELECT COUNT(*) FROM sync_operations WHERE state IN ('PENDING', 'PROCESSING')")
    fun observePendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM sync_operations WHERE state = :state")
    suspend fun countByState(state: String): Int

    @Query("UPDATE sync_operations SET state = 'PENDING', lastError = NULL WHERE state = 'PROCESSING'")
    suspend fun resetProcessingOperations()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(operation: SyncOperationEntity)

    @Update
    suspend fun update(operation: SyncOperationEntity)

    @Query("DELETE FROM sync_operations WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("UPDATE sync_operations SET state = 'PROCESSING' WHERE id = :id")
    suspend fun markProcessing(id: String)

    @Query("UPDATE sync_operations SET state = 'SYNCED' WHERE id = :id")
    suspend fun markSynced(id: String)

    @Query("UPDATE sync_operations SET state = 'PENDING', lastError = :error WHERE id = :id")
    suspend fun markPending(id: String, error: String?)

    @Query("UPDATE sync_operations SET state = 'FAILED', lastError = :error, attempts = attempts + 1 WHERE id = :id")
    suspend fun markFailed(id: String, error: String?)

    /** Permanent failure (permission / validation). Never retried automatically. */
    @Query("UPDATE sync_operations SET state = 'FAILED', lastError = :error, attempts = attempts + 1 WHERE id = :id")
    suspend fun markFailedPermanent(id: String, error: String?)

    @Query("UPDATE sync_operations SET state = 'PENDING', lastError = NULL WHERE id = :id AND state = 'FAILED'")
    suspend fun retryFailed(id: String)

    @Query("UPDATE sync_operations SET state = 'PENDING', lastError = NULL WHERE state = 'FAILED'")
    suspend fun retryAllFailed()

    @Query("UPDATE sync_operations SET state = 'PENDING', lastError = NULL WHERE state = 'FAILED' AND attempts < :maxAttempts")
    suspend fun retryFailedUnderAttempts(maxAttempts: Int)

    @Query("DELETE FROM sync_operations WHERE state = 'SYNCED'")
    suspend fun clearSynced()

    /**
     * Enqueues an operation, coalescing it with any pending operation for the same document so the
     * outbox always holds the minimal correct set of operations.
     */
    @Transaction
    suspend fun enqueueWithCoalescing(newOp: SyncOperationEntity) {
        val pending = findPendingOps(newOp.collectionName, newOp.documentId)

        if (newOp.operation == OutboxOp.ARRAY_ADD || newOp.operation == OutboxOp.ARRAY_REMOVE) {
            enqueueArrayOp(pending, newOp)
            return
        }

        val existing = pending.firstOrNull {
            it.operation == OutboxOp.CREATE || it.operation == OutboxOp.UPDATE || it.operation == OutboxOp.DELETE
        }

        if (existing == null) {
            insert(newOp)
            return
        }

        when (existing.operation) {
            OutboxOp.CREATE -> when (newOp.operation) {
                OutboxOp.UPDATE -> update(existing.copy(payloadJson = mergeShallow(existing.payloadJson, newOp.payloadJson)))
                OutboxOp.DELETE -> deleteById(existing.id) // never reached the server, nothing to delete remotely
                else -> insert(newOp)
            }
            OutboxOp.UPDATE -> when (newOp.operation) {
                OutboxOp.UPDATE -> update(existing.copy(payloadJson = mergeShallow(existing.payloadJson, newOp.payloadJson)))
                OutboxOp.DELETE -> update(existing.copy(operation = OutboxOp.DELETE, payloadJson = newOp.payloadJson))
                else -> insert(newOp)
            }
            OutboxOp.DELETE -> {
                // The entity is already scheduled for deletion; ignore later mutations.
            }
            else -> insert(newOp)
        }
    }

    private suspend fun enqueueArrayOp(pending: List<SyncOperationEntity>, newOp: SyncOperationEntity) {
        val field = OutboxOp.arrayField(newOp.payloadJson)
        val sameField = pending.filter { OutboxOp.arrayField(it.payloadJson) == field }

        val oppositeType = if (newOp.operation == OutboxOp.ARRAY_ADD) OutboxOp.ARRAY_REMOVE else OutboxOp.ARRAY_ADD
        val sameType = sameField.firstOrNull { it.operation == newOp.operation }
        val opposite = sameField.firstOrNull { it.operation == oppositeType }

        val newValues = OutboxOp.arrayValues(newOp.payloadJson).toMutableSet()
        val oppositeValues = opposite?.let { OutboxOp.arrayValues(it.payloadJson).toMutableSet() } ?: mutableSetOf()

        // ADD + REMOVE of the same value annihilate: the net effect equals the remote state.
        val canceled = newValues.intersect(oppositeValues)

        if (opposite != null) {
            oppositeValues.removeAll(canceled)
            if (oppositeValues.isEmpty()) {
                deleteById(opposite.id)
            } else {
                update(opposite.copy(payloadJson = OutboxOp.buildArrayPayload(field, oppositeValues.toList())))
            }
        }

        val remainingNew = (newValues - canceled).toMutableSet()

        if (remainingNew.isNotEmpty()) {
            if (sameType != null) {
                val merged = OutboxOp.arrayValues(sameType.payloadJson).toMutableSet()
                merged.addAll(remainingNew)
                update(sameType.copy(payloadJson = OutboxOp.buildArrayPayload(field, merged.toList())))
            } else {
                insert(newOp.copy(payloadJson = OutboxOp.buildArrayPayload(field, remainingNew.toList())))
            }
        }
    }

    private fun mergeShallow(baseJson: String, overlayJson: String): String {
        return try {
            val base = if (baseJson.isBlank()) JSONObject() else JSONObject(baseJson)
            val overlay = if (overlayJson.isBlank()) JSONObject() else JSONObject(overlayJson)
            val keys = overlay.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                base.put(key, overlay.get(key))
            }
            base.toString()
        } catch (_: Exception) {
            overlayJson
        }
    }
}

/** Canonical outbox operation names plus small JSON helpers shared by the DAO and SyncEngine. */
object OutboxOp {
    const val CREATE = "CREATE"
    const val UPDATE = "UPDATE"
    const val DELETE = "DELETE"
    const val ARRAY_ADD = "ARRAY_ADD"
    const val ARRAY_REMOVE = "ARRAY_REMOVE"

    private const val FIELD_KEY = "__field"
    private const val VALUES_KEY = "__values"

    fun arrayField(payloadJson: String): String {
        return try {
            JSONObject(payloadJson).optString(FIELD_KEY, "")
        } catch (_: Exception) {
            ""
        }
    }

    fun arrayValues(payloadJson: String): List<String> {
        return try {
            val json = JSONObject(payloadJson)
            val arr = json.optJSONArray(VALUES_KEY) ?: JSONArray()
            val out = mutableListOf<String>()
            for (i in 0 until arr.length()) out.add(arr.getString(i))
            out
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun buildArrayPayload(field: String, values: List<String>): String {
        val json = JSONObject()
        json.put(FIELD_KEY, field)
        json.put(VALUES_KEY, JSONArray(values))
        return json.toString()
    }
}
