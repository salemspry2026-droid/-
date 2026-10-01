package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.flowexa.app.data.local.entity.ProductCategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductCategoryDao {
    @Query("SELECT * FROM product_categories WHERE companyId = :companyId AND isDeleted = 0 ORDER BY name ASC")
    fun observeCategories(companyId: String): Flow<List<ProductCategoryEntity>>

    @Query("SELECT * FROM product_categories WHERE id = :id LIMIT 1")
    suspend fun getCategory(id: String): ProductCategoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(category: ProductCategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<ProductCategoryEntity>)

    @Query("UPDATE product_categories SET isDeleted = 1, syncState = 'PENDING' WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("UPDATE product_categories SET syncState = :state WHERE id = :id")
    suspend fun updateSyncState(id: String, state: String)
}
