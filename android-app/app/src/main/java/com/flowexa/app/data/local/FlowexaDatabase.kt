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
        OrderStageEntity::class,
        CustomerPhoneEntity::class
    ],
    version = 2,
    exportSchema = true
)
abstract class FlowexaDatabase : RoomDatabase() {

    abstract fun userProfileDao(): UserProfileDao
    abstract fun companyDao(): CompanyDao
    abstract fun productDao(): ProductDao
    abstract fun customerDao(): CustomerDao
    abstract fun customerPhoneDao(): CustomerPhoneDao
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

        val MIGRATION_1_2 = object : androidx.room.migration.Migration(1, 2) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `customer_phones` (
                        `id` TEXT NOT NULL,
                        `companyId` TEXT NOT NULL,
                        `customerId` TEXT NOT NULL,
                        `phoneRaw` TEXT NOT NULL,
                        `phoneNormalized` TEXT NOT NULL,
                        `label` TEXT NOT NULL,
                        `isPrimary` INTEGER NOT NULL,
                        `createdAtMs` INTEGER NOT NULL,
                        `updatedAtMs` INTEGER NOT NULL,
                        `isDeleted` INTEGER NOT NULL,
                        `syncState` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_customer_phones_companyId` ON `customer_phones` (`companyId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_customer_phones_customerId` ON `customer_phones` (`customerId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_customer_phones_phoneNormalized` ON `customer_phones` (`phoneNormalized`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_customer_phones_companyId_phoneNormalized` ON `customer_phones` (`companyId`, `phoneNormalized`)")

                // Update locations table with new columns
                db.execSQL("ALTER TABLE `locations` ADD COLUMN `type` TEXT NOT NULL DEFAULT 'region'")
                db.execSQL("ALTER TABLE `locations` ADD COLUMN `parentId` TEXT DEFAULT NULL")
                db.execSQL("ALTER TABLE `locations` ADD COLUMN `createdAtMs` INTEGER DEFAULT NULL")
                db.execSQL("ALTER TABLE `locations` ADD COLUMN `updatedAtMs` INTEGER DEFAULT NULL")

                // Update order_stages table with new columns
                db.execSQL("ALTER TABLE `order_stages` ADD COLUMN `stageIndex` INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE `order_stages` ADD COLUMN `allowedRolesJson` TEXT NOT NULL DEFAULT '[\"admin\",\"sales\"]'")
                db.execSQL("ALTER TABLE `order_stages` ADD COLUMN `createdAtMs` INTEGER DEFAULT NULL")
                db.execSQL("ALTER TABLE `order_stages` ADD COLUMN `updatedAtMs` INTEGER DEFAULT NULL")
            }
        }

        fun getInstance(context: Context): FlowexaDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    FlowexaDatabase::class.java,
                    "flowexa.db"
                )
                    .addMigrations(MIGRATION_1_2)
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
