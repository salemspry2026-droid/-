package com.flowexa.app.data.local.dao
 
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.flowexa.app.data.local.entity.CustomerPhoneEntity
import kotlinx.coroutines.flow.Flow
 
@Dao
interface CustomerPhoneDao {
    @Query("SELECT * FROM customer_phones WHERE customerId = :customerId AND isDeleted = 0 ORDER BY isPrimary DESC, createdAtMs ASC")
    fun observePhonesForCustomer(customerId: String): Flow<List<CustomerPhoneEntity>>
 
    @Query("SELECT * FROM customer_phones WHERE customerId = :customerId AND isDeleted = 0")
    suspend fun getPhonesForCustomer(customerId: String): List<CustomerPhoneEntity>
 
    @Query("SELECT * FROM customer_phones WHERE id = :id LIMIT 1")
    suspend fun getPhone(id: String): CustomerPhoneEntity?
 
    @Query("SELECT * FROM customer_phones WHERE companyId = :companyId AND phoneNormalized = :normalized AND isDeleted = 0 AND customerId != :excludeCustomerId LIMIT 1")
    suspend fun findDuplicateInCompany(companyId: String, normalized: String, excludeCustomerId: String): CustomerPhoneEntity?
 
    @Query("UPDATE customer_phones SET customerId = :newCustomerId, isPrimary = 0, syncState = 'PENDING', updatedAtMs = :nowMs WHERE id = :id")
    suspend fun reassignPhone(id: String, newCustomerId: String, nowMs: Long)
 
    @Query("SELECT * FROM customer_phones WHERE companyId = :companyId AND phoneNormalized = :normalized AND isDeleted = 0 LIMIT 1")
    suspend fun findByNormalizedPhone(companyId: String, normalized: String): CustomerPhoneEntity?
 
    @Query("SELECT * FROM customer_phones WHERE companyId = :companyId AND (phoneNormalized LIKE '%' || :query || '%' OR phoneRaw LIKE '%' || :query || '%') AND isDeleted = 0")
    suspend fun searchPhones(companyId: String, query: String): List<CustomerPhoneEntity>
 
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(phone: CustomerPhoneEntity)
 
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(phones: List<CustomerPhoneEntity>)
 
    @Update
    suspend fun update(phone: CustomerPhoneEntity)
 
    @Query("UPDATE customer_phones SET customerId = :newCustomerId, updatedAtMs = :nowMs, syncState = 'PENDING' WHERE customerId = :oldCustomerId")
    suspend fun reassignCustomerPhones(oldCustomerId: String, newCustomerId: String, nowMs: Long)
 
    @Query("UPDATE customer_phones SET isDeleted = 1, syncState = 'PENDING', updatedAtMs = :nowMs WHERE id = :id")
    suspend fun softDelete(id: String, nowMs: Long)