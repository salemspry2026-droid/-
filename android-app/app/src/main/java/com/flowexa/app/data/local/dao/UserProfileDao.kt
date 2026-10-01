package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.flowexa.app.data.local.entity.UserProfileEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface UserProfileDao {
    @Query("SELECT * FROM user_profiles WHERE id = :id LIMIT 1")
    fun observeProfile(id: String): Flow<UserProfileEntity?>

    @Query("SELECT * FROM user_profiles WHERE id = :id LIMIT 1")
    suspend fun getProfile(id: String): UserProfileEntity?

    @Query("SELECT * FROM user_profiles WHERE companyId = :companyId AND role IN ('owner', 'admin', 'sales') AND isDeleted = 0")
    fun observeStaff(companyId: String): Flow<List<UserProfileEntity>>

    @Query("SELECT * FROM user_profiles WHERE companyId = :companyId AND role = 'pending_employee' AND isDeleted = 0")
    fun observePendingStaff(companyId: String): Flow<List<UserProfileEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(profile: UserProfileEntity)

    @Update
    suspend fun update(profile: UserProfileEntity)

    @Query("UPDATE user_profiles SET role = :newRole, syncState = 'PENDING' WHERE id = :id")
    suspend fun updateRole(id: String, newRole: String)

    @Query("UPDATE user_profiles SET isDeleted = 1, syncState = 'PENDING' WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("UPDATE user_profiles SET syncState = :state WHERE id = :id")
    suspend fun updateSyncState(id: String, state: String)

    @Query("DELETE FROM user_profiles WHERE id = :id")
    suspend fun delete(id: String)
}
