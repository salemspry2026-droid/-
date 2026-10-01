package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.CustomerEntity
import com.flowexa.app.data.local.entity.CustomerPhoneEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.domain.PhoneNormalizer
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class CustomerInsights(
    val totalOrders: Int = 0,
    val totalSales: Double = 0.0,
    val averageOrderValue: Double = 0.0,
    val lastOrderDateMs: Long? = null,
    val topProducts: List<String> = emptyList()
)

class CustomerRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val customerDao = database.customerDao()
    private val phoneDao = database.customerPhoneDao()
    private val orderDao = database.orderDao()
    private val syncDao = database.syncOperationDao()

    fun observeCustomers(companyId: String): Flow<List<CustomerEntity>> {
        return customerDao.observeCustomers(companyId)
    }

    fun observeCustomerPhones(customerId: String): Flow<List<CustomerPhoneEntity>> {
        return phoneDao.observePhonesForCustomer(customerId)
    }

    fun searchCustomers(companyId: String, query: String): Flow<List<CustomerEntity>> {
        return customerDao.searchCustomers(companyId, query)
    }

    suspend fun getCustomer(id: String): CustomerEntity? = withContext(Dispatchers.IO) {
        customerDao.getCustomer(id)
    }

    suspend fun getCustomerPhones(customerId: String): List<CustomerPhoneEntity> = withContext(Dispatchers.IO) {
        phoneDao.getPhonesForCustomer(customerId)
    }

    suspend fun findCustomerByPhone(companyId: String, rawPhone: String): CustomerEntity? = withContext(Dispatchers.IO) {
        val normalized = PhoneNormalizer.normalize(rawPhone)
        if (normalized.isNotEmpty()) {
            val phoneMatch = phoneDao.findByNormalizedPhone(companyId, normalized)
            if (phoneMatch != null) {
                val cust = customerDao.getCustomer(phoneMatch.customerId)
                if (cust != null && !cust.isDeleted) return@withContext cust
            }
        }
        customerDao.getCustomerByPhone(companyId, rawPhone.trim())
    }

    suspend fun saveCustomer(
        customer: CustomerEntity,
        isNew: Boolean,
        additionalPhones: List<String> = emptyList(),
        currentUserId: String = ""
    ) = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        val finalCustomer = customer.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = nowMs
        )
        customerDao.insert(finalCustomer)

        // Save Primary phone record
        if (!finalCustomer.phone.isNullOrBlank()) {
            val normPrimary = PhoneNormalizer.normalize(finalCustomer.phone)
            val primaryPhoneEntity = CustomerPhoneEntity(
                id = "${finalCustomer.id}_primary",
                companyId = finalCustomer.companyId,
                customerId = finalCustomer.id,
                phoneRaw = finalCustomer.phone,
                phoneNormalized = normPrimary,
                label = "primary",
                isPrimary = true,
                createdAtMs = nowMs,
                updatedAtMs = nowMs,
                isDeleted = false,
                syncState = AppConfig.SYNC_STATE_PENDING
            )
            phoneDao.insert(primaryPhoneEntity)
        }

        // Save additional phones
        for ((idx, p) in additionalPhones.withIndex()) {
            if (p.isNotBlank()) {
                val norm = PhoneNormalizer.normalize(p)
                val extraPhone = CustomerPhoneEntity(
                    id = "${finalCustomer.id}_extra_$idx",
                    companyId = finalCustomer.companyId,
                    customerId = finalCustomer.id,
                    phoneRaw = p.trim(),
                    phoneNormalized = norm,
                    label = "mobile",
                    isPrimary = false,
                    createdAtMs = nowMs,
                    updatedAtMs = nowMs,
                    isDeleted = false,
                    syncState = AppConfig.SYNC_STATE_PENDING
                )
                phoneDao.insert(extraPhone)
            }
        }

        val payload = JSONObject().apply {
            put("companyId", finalCustomer.companyId)
            put("name", finalCustomer.name)
            put("email", finalCustomer.email)
            put("phone", finalCustomer.phone)
            put("address", finalCustomer.address)
            put("notes", finalCustomer.notes)
            put("appUserId", finalCustomer.appUserId)
            put("isDeleted", false)
            if (currentUserId.isNotEmpty()) {
                if (isNew) put("createdBy", currentUserId)
                put("updatedBy", currentUserId)
            }
            if (finalCustomer.contactNumbersJson.isNotEmpty()) {
                try {
                    put("contactNumbers", JSONArray(finalCustomer.contactNumbersJson))
                } catch (_: Exception) {}
            }
        }

        syncDao.enqueueWithCoalescing(
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

    suspend fun deleteCustomer(id: String, currentUserId: String = "") = withContext(Dispatchers.IO) {
        customerDao.softDelete(id)
        val deletePayload = JSONObject().apply {
            put("isDeleted", true)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_CUSTOMERS,
                documentId = id,
                operation = "DELETE",
                payloadJson = deletePayload.toString()
            )
        )
        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun mergeCustomers(
        companyId: String,
        primaryCustomerId: String,
        duplicateCustomerId: String,
        currentUserId: String = ""
    ) = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        phoneDao.reassignCustomerPhones(duplicateCustomerId, primaryCustomerId, nowMs)
        customerDao.softDelete(duplicateCustomerId)

        val deletePayload = JSONObject().apply {
            put("isDeleted", true)
            put("mergedInto", primaryCustomerId)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_CUSTOMERS,
                documentId = duplicateCustomerId,
                operation = "DELETE",
                payloadJson = deletePayload.toString()
            )
        )
        SyncScheduler.scheduleImmediateSync(context)
    }

    suspend fun getCustomerInsights(customerId: String): CustomerInsights = withContext(Dispatchers.IO) {
        val orders = orderDao.getOrdersForCustomer(customerId)
        if (orders.isEmpty()) return@withContext CustomerInsights()

        var totalSpend = 0.0
        val productCounts = mutableMapOf<String, Int>()

        for (order in orders) {
            try {
                val json = JSONObject(order.totalAmountByCurrencyJson)
                val keys = json.keys()
                while (keys.hasNext()) {
                    totalSpend += json.optDouble(keys.next(), 0.0)
                }
            } catch (_: Exception) {}

            val items = orderDao.getOrderItems(order.id)
            for (item in items) {
                productCounts[item.productName] = (productCounts[item.productName] ?: 0) + 1
            }
        }

        val topProducts = productCounts.entries
            .sortedByDescending { it.value }
            .take(5)
            .map { it.key }

        val lastOrderDate = orders.maxOfOrNull { it.createdAtMs ?: 0L }
        val avg = if (orders.isNotEmpty()) totalSpend / orders.size else 0.0

        CustomerInsights(
            totalOrders = orders.size,
            totalSales = totalSpend,
            averageOrderValue = avg,
            lastOrderDateMs = lastOrderDate,
            topProducts = topProducts
        )
    }
}
