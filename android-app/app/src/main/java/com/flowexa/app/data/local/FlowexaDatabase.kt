package com.flowexa.app.data.local

import android.content.Context
import android.util.Log
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
    version = 3,
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

        val MIGRATION_2_3 = object : androidx.room.migration.Migration(2, 3) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `companies` ADD COLUMN `companyTypeOther` TEXT DEFAULT NULL")
                db.execSQL("ALTER TABLE `companies` ADD COLUMN `isVisibleToClients` INTEGER NOT NULL DEFAULT 0")
            }
        }

        fun getInstance(context: Context): FlowexaDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: openSafely(context.applicationContext).also { INSTANCE = it }
            }
        }

        /**
         * Room opens lazily, so a failed migration / corrupt file would crash on the FIRST query
         * (an instant app close). Force-open here; if it fails, wipe the local cache and rebuild.
         * (The local DB is a cache of Firestore; unsynced outbox rows of a corrupt DB are unrecoverable anyway.)
         */
        private fun openSafely(appContext: Context): FlowexaDatabase {
            fun build(destructive: Boolean): FlowexaDatabase {
                val b = Room.databaseBuilder(appContext, FlowexaDatabase::class.java, "flowexa.db")
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                if (destructive) b.fallbackToDestructiveMigration()
                return b.build()
            }
            return try {
                build(false).also { it.openHelper.writableDatabase }
            } catch (e: Exception) {
                Log.e("FlowexaDatabase", "Open/migration failed, rebuilding local cache: ${e.message}", e)
                try { appContext.deleteDatabase("flowexa.db") } catch (_: Exception) {}
                build(true).also { it.openHelper.writableDatabase }
            }
        }
    }
}
