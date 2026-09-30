package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.flowexa.app.data.local.entity.LocationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LocationDao {
    @Query("SELECT * FROM locations WHERE companyId = :companyId AND isDeleted = 0 ORDER BY name ASC")
    fun observeLocations(companyId: String): Flow<List<LocationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(location: LocationEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(locations: List<LocationEntity>)
}
