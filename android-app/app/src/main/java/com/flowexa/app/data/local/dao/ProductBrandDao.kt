package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.flowexa.app.data.local.entity.ProductBrandEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductBrandDao {
    @Query("SELECT * FROM product_brands WHERE companyId = :companyId AND isDeleted = 0 ORDER BY name ASC")
    fun observeBrands(companyId: String): Flow<List<ProductBrandEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(brand: ProductBrandEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(brands: List<ProductBrandEntity>)

    @Query("UPDATE product_brands SET isDeleted = 1, syncState = 'PENDING' WHERE id = :id")
    suspend fun softDelete(id: String)
}
