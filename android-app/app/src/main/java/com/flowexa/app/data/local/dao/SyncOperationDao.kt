package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.flowexa.app.data.local.entity.SyncOperationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncOperationDao {
    @Query("SELECT * FROM sync_operations WHERE state = 'PENDING' ORDER BY createdAtMs ASC")
    suspend fun getPendingOperations(): List<SyncOperationEntity>

    @Query("SELECT COUNT(*) FROM sync_operations WHERE state IN ('PENDING', 'PROCESSING')")
    fun observePendingCount(): Flow<Int>

    @Query("SELECT * FROM sync_operations WHERE collectionName = :col AND documentId = :docId AND state = 'PENDING' LIMIT 1")
    suspend fun findPendingOp(col: String, docId: String): SyncOperationEntity?

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

    @Query("UPDATE sync_operations SET state = 'PENDING', lastError = NULL WHERE id = :id AND state = 'FAILED'")
    suspend fun retryFailed(id: String)

    @Query("DELETE FROM sync_operations WHERE state = 'SYNCED'")
    suspend fun clearSynced()

    /**
     * Enqueues an operation with coalescing to prevent duplicate updates (Phase P8.3)
     */
    @Transaction
    suspend fun enqueueWithCoalescing(newOp: SyncOperationEntity) {
        val existing = findPendingOp(newOp.collectionName, newOp.documentId)
        if (existing == null) {
            insert(newOp)
            return
        }

        when (existing.operation) {
            "CREATE" -> {
                if (newOp.operation == "UPDATE") {
                    val merged = mergePayloads(existing.payloadJson, newOp.payloadJson)
                    update(existing.copy(payloadJson = merged))
                } else if (newOp.operation == "DELETE") {
                    deleteById(existing.id)
                }
            }
            "UPDATE" -> {
                if (newOp.operation == "UPDATE") {
                    val merged = mergePayloads(existing.payloadJson, newOp.payloadJson)
                    update(existing.copy(payloadJson = merged))
                } else if (newOp.operation == "DELETE") {
                    update(existing.copy(operation = "DELETE", payloadJson = newOp.payloadJson))
                }
            }
            else -> insert(newOp)
        }
    }

    private fun mergePayloads(baseJson: String, overlayJson: String): String {
        return try {
            val base = if (baseJson.isBlank()) org.json.JSONObject() else org.json.JSONObject(baseJson)
            val overlay = if (overlayJson.isBlank()) org.json.JSONObject() else org.json.JSONObject(overlayJson)
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
