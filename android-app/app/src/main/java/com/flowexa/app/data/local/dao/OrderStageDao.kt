package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.flowexa.app.data.local.entity.OrderStageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderStageDao {
    @Query("SELECT * FROM order_stages WHERE companyId = :companyId AND isDeleted = 0 ORDER BY orderIndex ASC")
    fun observeOrderStages(companyId: String): Flow<List<OrderStageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(stages: List<OrderStageEntity>)
}
