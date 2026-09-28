package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.CustomerEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID

class CustomerRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val customerDao = database.customerDao()
    private val syncDao = database.syncOperationDao()

    fun observeCustomers(companyId: String): Flow<List<CustomerEntity>> {
        return customerDao.observeCustomers(companyId)
    }

    fun searchCustomers(companyId: String, query: String): Flow<List<CustomerEntity>> {
        return customerDao.searchCustomers(companyId, query)
    }

    suspend fun getCustomer(id: String): CustomerEntity? = withContext(Dispatchers.IO) {
        customerDao.getCustomer(id)
    }

    suspend fun saveCustomer(customer: CustomerEntity, isNew: Boolean) = withContext(Dispatchers.IO) {
        val finalCustomer = customer.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = System.currentTimeMillis()
        )
        customerDao.insert(finalCustomer)

        val payload = JSONObject().apply {
            put("companyId", finalCustomer.companyId)
            put("name", finalCustomer.name)
            put("email", finalCustomer.email)
            put("phone", finalCustomer.phone)
            put("address", finalCustomer.address)
            put("notes", finalCustomer.notes)
            put("appUserId", finalCustomer.appUserId)
            put("isDeleted", false)
            if (finalCustomer.contactNumbersJson.isNotEmpty()) {
                try {
                    put("contactNumbers", org.json.JSONArray(finalCustomer.contactNumbersJson))
                } catch (_: Exception) {}
            }
        }

        syncDao.insert(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_CUSTOMERS,
                documentId = finalCustomer.id,
                operation = if (isNew) "CREATE" else "UPDATE",
                payloadJson = payload.toString()
            )
        )

        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun deleteCustomer(id: String) = withContext(Dispatchers.IO) {
        customerDao.softDelete(id)
        syncDao.insert(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_CUSTOMERS,
                documentId = id,
                operation = "DELETE",
                payloadJson = "{}"
            )
        )
        SyncScheduler.scheduleImmediateSync(context)
    }
}
