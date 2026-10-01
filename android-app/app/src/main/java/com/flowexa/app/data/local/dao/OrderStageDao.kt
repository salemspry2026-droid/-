package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.flowexa.app.data.local.entity.OrderStageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderStageDao {
    @Query("SELECT * FROM order_stages WHERE companyId = :companyId AND isDeleted = 0 ORDER BY stageIndex ASC")
    fun observeOrderStages(companyId: String): Flow<List<OrderStageEntity>>

    @Query("SELECT * FROM order_stages WHERE id = :id LIMIT 1")
    suspend fun getOrderStage(id: String): OrderStageEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(stage: OrderStageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(stages: List<OrderStageEntity>)

    @Query("UPDATE order_stages SET isDeleted = 1, syncState = 'PENDING' WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("UPDATE order_stages SET syncState = :state WHERE id = :id")
    suspend fun updateSyncState(id: String, state: String)
}
