package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.flowexa.app.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("""
        SELECT * FROM products 
        WHERE companyId = :companyId AND isDeleted = 0 
        ORDER BY name ASC
    """)
    fun observeProducts(companyId: String): Flow<List<ProductEntity>>

    @Query("""
        SELECT * FROM products 
        WHERE companyId = :companyId AND isDeleted = 0 
        AND (name LIKE '%' || :query || '%' OR scientificName LIKE '%' || :query || '%')
        ORDER BY name ASC
    """)
    fun searchProducts(companyId: String, query: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id LIMIT 1")
    suspend fun getProduct(id: String): ProductEntity?

    @Query("SELECT * FROM products WHERE id IN (:ids) AND isDeleted = 0")
    fun getProductsByIds(ids: List<String>): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(product: ProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Update
    suspend fun update(product: ProductEntity)

    @Query("UPDATE products SET isDeleted = 1, syncState = 'PENDING' WHERE id = :id")
    suspend fun softDelete(id: String)
}
