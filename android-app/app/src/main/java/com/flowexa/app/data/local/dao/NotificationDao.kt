package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.flowexa.app.data.local.entity.NotificationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationDao {
    @Query("""
        SELECT * FROM notifications 
        WHERE companyId = :companyId 
        ORDER BY createdAtMs DESC
    """)
    fun observeNotifications(companyId: String): Flow<List<NotificationEntity>>

    @Query("""
        SELECT * FROM notifications 
        WHERE clientUid = :clientUid 
        ORDER BY createdAtMs DESC
    """)
    fun observeClientNotifications(clientUid: String): Flow<List<NotificationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(notifications: List<NotificationEntity>)

    @Query("UPDATE notifications SET isRead = 1 WHERE id = :id")
    suspend fun markAsRead(id: String)

    @Query("UPDATE notifications SET isRead = 1 WHERE companyId = :companyId")
    suspend fun markAllAsRead(companyId: String)
}
