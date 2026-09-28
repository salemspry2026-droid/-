package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.flowexa.app.data.local.entity.CustomerEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CustomerDao {
    @Query("""
        SELECT * FROM customers 
        WHERE companyId = :companyId AND isDeleted = 0 
        ORDER BY name ASC
    """)
    fun observeCustomers(companyId: String): Flow<List<CustomerEntity>>

    @Query("""
        SELECT * FROM customers 
        WHERE companyId = :companyId AND isDeleted = 0 
        AND (name LIKE '%' || :query || '%' OR phone LIKE '%' || :query || '%')
        ORDER BY name ASC
    """)
    fun searchCustomers(companyId: String, query: String): Flow<List<CustomerEntity>>

    @Query("SELECT * FROM customers WHERE id = :id LIMIT 1")
    suspend fun getCustomer(id: String): CustomerEntity?

    @Query("SELECT * FROM customers WHERE companyId = :companyId AND phone = :phone LIMIT 1")
    suspend fun getCustomerByPhone(companyId: String, phone: String): CustomerEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(customer: CustomerEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(customers: List<CustomerEntity>)

    @Update
    suspend fun update(customer: CustomerEntity)

    @Query("UPDATE customers SET isDeleted = 1, syncState = 'PENDING' WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("UPDATE customers SET syncState = :state WHERE id = :id")
    suspend fun updateSyncState(id: String, state: String)
}
