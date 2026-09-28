package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.flowexa.app.data.local.entity.SyncOperationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncOperationDao {
    @Query("SELECT * FROM sync_operations WHERE state = 'PENDING' ORDER BY createdAtMs ASC")
    suspend fun getPendingOperations(): List<SyncOperationEntity>

    @Query("SELECT COUNT(*) FROM sync_operations WHERE state IN ('PENDING', 'PROCESSING')")
    fun observePendingCount(): Flow<Int>

    @Query("UPDATE sync_operations SET state = 'PENDING', lastError = NULL WHERE state = 'PROCESSING'")
    suspend fun resetProcessingOperations()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(operation: SyncOperationEntity)

    @Update
    suspend fun update(operation: SyncOperationEntity)

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
}
