package com.flowexa.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.flowexa.app.data.local.dao.*
import com.flowexa.app.data.local.entity.*

@Database(
    entities = [
        UserProfileEntity::class,
        CompanyEntity::class,
        ProductEntity::class,
        CustomerEntity::class,
        OrderEntity::class,
        OrderItemEntity::class,
        NotificationEntity::class,
        CallRecordingEntity::class,
        SyncOperationEntity::class,
        ProductCategoryEntity::class,
        ProductBrandEntity::class,
        LocationEntity::class,
        OrderStageEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class FlowexaDatabase : RoomDatabase() {

    abstract fun userProfileDao(): UserProfileDao
    abstract fun companyDao(): CompanyDao
    abstract fun productDao(): ProductDao
    abstract fun customerDao(): CustomerDao
    abstract fun orderDao(): OrderDao
    abstract fun notificationDao(): NotificationDao
    abstract fun syncOperationDao(): SyncOperationDao
    abstract fun callRecordingDao(): CallRecordingDao
    abstract fun productCategoryDao(): ProductCategoryDao
    abstract fun productBrandDao(): ProductBrandDao
    abstract fun locationDao(): LocationDao
    abstract fun orderStageDao(): OrderStageDao

    companion object {
        @Volatile
        private var INSTANCE: FlowexaDatabase? = null

        fun getInstance(context: Context): FlowexaDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    FlowexaDatabase::class.java,
                    "flowexa.db"
                )
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
