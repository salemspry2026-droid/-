package com.flowexa.app.data

import android.content.Context
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.sqlite.db.SupportSQLiteOpenHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.flowexa.app.data.local.FlowexaDatabase
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Executes the REAL FlowexaDatabase.MIGRATION_1_2 on a real SQLite engine (emulator/device).
 *
 * A version-1 database is created with only the tables the migration touches (locations,
 * order_stages) in their version-1 shape, seeded with data, then migrated. We assert:
 *  - customer_phones exists with the expected columns
 *  - locations / order_stages gained the new columns
 *  - pre-existing rows survived and got the declared defaults
 *
 * Why not Room's MigrationTestHelper: it needs the exported 1.json schema, which is not in the
 * repository. This test needs no schema files and still runs the production migration code.
 */
@RunWith(AndroidJUnit4::class)
class Migration1To2Test {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val dbName = "migration-1-2-test.db"
    private lateinit var helper: SupportSQLiteOpenHelper
    private lateinit var db: SupportSQLiteDatabase

    @Before
    fun setUp() {
        context.deleteDatabase(dbName)
        val config = SupportSQLiteOpenHelper.Configuration.builder(context)
            .name(dbName)
            .callback(object : SupportSQLiteOpenHelper.Callback(1) {
                override fun onCreate(db: SupportSQLiteDatabase) {
                    db.execSQL(
                        "CREATE TABLE `locations` (`id` TEXT NOT NULL, `companyId` TEXT NOT NULL, " +
                            "`name` TEXT NOT NULL, `address` TEXT, `isDeleted` INTEGER NOT NULL, " +
                            "`syncState` TEXT NOT NULL, PRIMARY KEY(`id`))"
                    )
                    db.execSQL(
                        "CREATE TABLE `order_stages` (`id` TEXT NOT NULL, `companyId` TEXT NOT NULL, " +
                            "`name` TEXT NOT NULL, `color` TEXT, `isDeleted` INTEGER NOT NULL, " +
                            "`syncState` TEXT NOT NULL, PRIMARY KEY(`id`))"
                    )
                    db.execSQL("INSERT INTO locations VALUES ('loc1','c1','Sanaa','Street 1',0,'SYNCED')")
                    db.execSQL("INSERT INTO order_stages VALUES ('st1','c1','New','#00f',0,'SYNCED')")
                }

                override fun onUpgrade(db: SupportSQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
            })
            .build()
        helper = FrameworkSQLiteOpenHelperFactory().create(config)
        db = helper.writableDatabase
    }

    @After
    fun tearDown() {
        helper.close()
        context.deleteDatabase(dbName)
    }

    private fun columns(table: String): Set<String> {
        val out = mutableSetOf<String>()
        db.query("PRAGMA table_info(`$table`)").use { c ->
            val nameIdx = c.getColumnIndexOrThrow("name")
            while (c.moveToNext()) out.add(c.getString(nameIdx))
        }
        return out
    }

    @Test
    fun migration_createsCustomerPhones_addsColumns_andKeepsExistingData() {
        FlowexaDatabase.MIGRATION_1_2.migrate(db)

        // customer_phones exists with every column the entity declares
        assertEquals(
            setOf(
                "id", "companyId", "customerId", "phoneRaw", "phoneNormalized", "label",
                "isPrimary", "createdAtMs", "updatedAtMs", "isDeleted", "syncState"
            ),
            columns("customer_phones")
        )

        // new location columns
        assertTrue(columns("locations").containsAll(listOf("type", "parentId", "createdAtMs", "updatedAtMs")))

        // new order stage columns
        assertTrue(
            columns("order_stages").containsAll(
                listOf("stageIndex", "allowedRolesJson", "createdAtMs", "updatedAtMs")
            )
        )

        // existing rows survived and received the declared defaults
        db.query("SELECT id, name, type, parentId FROM locations WHERE id = 'loc1'").use { c ->
            assertTrue(c.moveToFirst())
            assertEquals("Sanaa", c.getString(c.getColumnIndexOrThrow("name")))
            assertEquals("region", c.getString(c.getColumnIndexOrThrow("type")))
            assertTrue(c.isNull(c.getColumnIndexOrThrow("parentId")))
        }
        db.query("SELECT name, stageIndex, allowedRolesJson FROM order_stages WHERE id = 'st1'").use { c ->
            assertTrue(c.moveToFirst())
            assertEquals("New", c.getString(c.getColumnIndexOrThrow("name")))
            assertEquals(0, c.getInt(c.getColumnIndexOrThrow("stageIndex")))
            assertEquals("[\"admin\",\"sales\"]", c.getString(c.getColumnIndexOrThrow("allowedRolesJson")))
        }

        // indices were created
        val indexNames = mutableSetOf<String>()
        db.query("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'customer_phones'").use { c ->
            while (c.moveToNext()) indexNames.add(c.getString(0))
        }
        assertTrue(indexNames.contains("index_customer_phones_companyId_phoneNormalized"))
    }
}
