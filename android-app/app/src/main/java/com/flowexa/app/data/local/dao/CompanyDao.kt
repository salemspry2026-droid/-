package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.flowexa.app.data.local.entity.CompanyEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CompanyDao {
    @Query("SELECT * FROM companies WHERE id = :id LIMIT 1")
    fun observeCompany(id: String): Flow<CompanyEntity?>

    @Query("SELECT * FROM companies WHERE id = :id LIMIT 1")
    suspend fun getCompany(id: String): CompanyEntity?

    @Query("SELECT * FROM companies WHERE joinCode = :code AND isDeleted = 0 LIMIT 1")
    suspend fun getCompanyByJoinCode(code: String): CompanyEntity?

    @Query("SELECT * FROM companies WHERE clientJoinCode = :code AND isDeleted = 0 LIMIT 1")
    suspend fun getCompanyByClientJoinCode(code: String): CompanyEntity?

    @Query("SELECT * FROM companies WHERE isDeleted = 0")
    fun observeAllCompanies(): Flow<List<CompanyEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(company: CompanyEntity)

    @Update
    suspend fun update(company: CompanyEntity)

    @Query("UPDATE companies SET syncState = :state WHERE id = :id")
    suspend fun updateSyncState(id: String, state: String)

    @Query("DELETE FROM companies WHERE id = :id")
    suspend fun delete(id: String)
}
