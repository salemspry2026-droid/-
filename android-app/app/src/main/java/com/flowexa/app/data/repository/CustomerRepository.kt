package com.flowexa.app.data.repository

import android.content.Context
import androidx.room.withTransaction
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
import com.flowexa.app.data.local.entity.CustomerEntity
import com.flowexa.app.data.local.entity.CustomerPhoneEntity
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.domain.PhoneNormalizer
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class ProductStat(
    val name: String,
    val totalQuantity: Double,
    val orderCount: Int
)

data class CustomerInsights(
    val totalOrders: Int = 0,
    val totalsByCurrency: Map<String, Double> = emptyMap(),
    val averageByCurrency: Map<String, Double> = emptyMap(),
    val lastOrderDateMs: Long? = null,
    val topProducts: List<ProductStat> = emptyList()
)

class DuplicatePhoneException(message: String) : Exception(message)

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

    /**
     * Saves a customer, its primary phone and any additional phones in one atomic local+outbox
     * transaction. Duplicate normalized phone numbers within the same company are rejected.
     */
    suspend fun saveCustomer(
        customer: CustomerEntity,
        isNew: Boolean,
        additionalPhones: List<String> = emptyList(),
        currentUserId: String = ""
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        val finalCustomer = customer.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = nowMs
        )

        try {
            database.withTransaction {
                customerDao.insert(finalCustomer)
                syncDao.enqueueWithCoalescing(customerOutboxOp(finalCustomer, isNew, currentUserId))

                if (!finalCustomer.phone.isNullOrBlank()) {
                    val norm = PhoneNormalizer.normalize(finalCustomer.phone)
                    ensureNotDuplicate(finalCustomer.companyId, norm, finalCustomer.id)
                    val existing = phoneDao.getPhone("${finalCustomer.id}_primary")
                    val primary = CustomerPhoneEntity(
                        id = "${finalCustomer.id}_primary",
                        companyId = finalCustomer.companyId,
                        customerId = finalCustomer.id,
                        phoneRaw = finalCustomer.phone.trim(),
                        phoneNormalized = norm,
                        label = "primary",
                        isPrimary = true,
                        createdAtMs = existing?.createdAtMs ?: nowMs,
                        updatedAtMs = nowMs,
                        isDeleted = false,
                        syncState = AppConfig.SYNC_STATE_PENDING
                    )
                    phoneDao.insert(primary)
                    syncDao.enqueueWithCoalescing(
                        phoneOutboxOp(primary, isNew = existing == null, currentUserId = currentUserId)
                    )
                }

                for (raw in additionalPhones) {
                    if (raw.isBlank()) continue
                    val norm = PhoneNormalizer.normalize(raw)
                    if (norm.isEmpty()) continue
                    ensureNotDuplicate(finalCustomer.companyId, norm, finalCustomer.id)
                    val id = "${finalCustomer.id}_$norm"
                    val existing = phoneDao.getPhone(id)
                    val extra = CustomerPhoneEntity(
                        id = id,
                        companyId = finalCustomer.companyId,
                        customerId = finalCustomer.id,
                        phoneRaw = raw.trim(),
                        phoneNormalized = norm,
                        label = "mobile",
                        isPrimary = false,
                        createdAtMs = existing?.createdAtMs ?: nowMs,
                        updatedAtMs = nowMs,
                        isDeleted = false,
                        syncState = AppConfig.SYNC_STATE_PENDING
                    )
                    phoneDao.insert(extra)
                    syncDao.enqueueWithCoalescing(
                        phoneOutboxOp(extra, isNew = existing == null, currentUserId = currentUserId)
                    )
                }
            }
            SyncScheduler.scheduleImmediateSync(context)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addCustomerPhone(
        companyId: String,
        customerId: String,
        rawPhone: String,
        label: String = "mobile",
        currentUserId: String = ""
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val norm = PhoneNormalizer.normalize(rawPhone)
        if (norm.isEmpty()) return@withContext Result.failure(IllegalArgumentException("رقم هاتف غير صالح"))
        try {
            val nowMs = System.currentTimeMillis()
            database.withTransaction {
                ensureNotDuplicate(companyId, norm, customerId)
                val id = "${customerId}_$norm"
                val existing = phoneDao.getPhone(id)
                val phone = CustomerPhoneEntity(
                    id = id,
                    companyId = companyId,
                    customerId = customerId,
                    phoneRaw = rawPhone.trim(),
                    phoneNormalized = norm,
                    label = label,
                    isPrimary = false,
                    createdAtMs = existing?.createdAtMs ?: nowMs,
                    updatedAtMs = nowMs,
                    isDeleted = false,
                    syncState = AppConfig.SYNC_STATE_PENDING
                )
                phoneDao.insert(phone)
                syncDao.enqueueWithCoalescing(
                    phoneOutboxOp(phone, isNew = existing == null, currentUserId = currentUserId)
                )
            }
            SyncScheduler.scheduleImmediateSync(context)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteCustomerPhone(phoneId: String, currentUserId: String = ""): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val nowMs = System.currentTimeMillis()
            database.withTransaction {
                phoneDao.softDelete(phoneId, nowMs)
                syncDao.enqueueWithCoalescing(
                    SyncOperationEntity(
                        id = UUID.randomUUID().toString(),
                        collectionName = AppConfig.COL_CUSTOMER_PHONES,
                        documentId = phoneId,
                        operation = OutboxOp.DELETE,
                        payloadJson = JSONObject().apply {
                            put("isDeleted", true)
                            if (currentUserId.isNotEmpty()) put("updatedBy", currentUserId)
                        }.toString()
                    )
                )
            }
            SyncScheduler.scheduleImmediateSync(context)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteCustomer(id: String, currentUserId: String = "") = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        val deletePayload = JSONObject().apply {
            put("isDeleted", true)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
        database.withTransaction {
            customerDao.softDelete(id)
            // Soft-delete every phone of this customer so the tombstone propagates too.
            for (phone in phoneDao.getPhonesForCustomer(id)) {
                phoneDao.softDelete(phone.id, nowMs)
                syncDao.enqueueWithCoalescing(
                    SyncOperationEntity(
                        id = UUID.randomUUID().toString(),
                        collectionName = AppConfig.COL_CUSTOMER_PHONES,
                        documentId = phone.id,
                        operation = OutboxOp.DELETE,
                        payloadJson = deletePayload.toString()
                    )
                )
            }
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_CUSTOMERS,
                    documentId = id,
                    operation = OutboxOp.DELETE,
                    payloadJson = deletePayload.toString()
                )
            )
        }
        SyncScheduler.scheduleImmediateSync(context)
    }

    /**
     * Merges [duplicateCustomerId] into [primaryCustomerId]:
     *  - reassigns phones and historical orders to the primary customer,
     *  - fills missing primary fields from the duplicate,
     *  - records `mergedInto` and soft-deletes the duplicate,
     *  - enqueues outbox operations for every cloud-visible change,
     *  - all inside a single local transaction, guarded against cross-company merges.
     */
    suspend fun mergeCustomers(
        companyId: String,
        primaryCustomerId: String,
        duplicateCustomerId: String,
        currentUserId: String = ""
    ): Result<Unit> = withContext(Dispatchers.IO) {
        if (primaryCustomerId == duplicateCustomerId) {
            return@withContext Result.failure(IllegalArgumentException("لا يمكن دمج العميل مع نفسه"))
        }
        try {
            database.withTransaction {
                val primary = customerDao.getCustomer(primaryCustomerId)
                    ?: throw IllegalArgumentException("العميل الأساسي غير موجود")
                val duplicate = customerDao.getCustomer(duplicateCustomerId)
                    ?: throw IllegalArgumentException("العميل المكرر غير موجود")
                if (primary.companyId != companyId || duplicate.companyId != companyId) {
                    throw IllegalArgumentException("لا يمكن دمج عملاء من شركات مختلفة")
                }

                val nowMs = System.currentTimeMillis()
                val auditJson = JSONObject().apply {
                    put("isDeleted", true)
                    put("mergedInto", primaryCustomerId)
                    if (currentUserId.isNotEmpty()) put("updatedBy", currentUserId)
                }

                // 1. Move phones (dedupe against phones already owned by the primary).
                val primaryNormalized = phoneDao.getPhonesForCustomer(primaryCustomerId)
                    .map { it.phoneNormalized }
                    .toMutableSet()
                for (phone in phoneDao.getPhonesForCustomer(duplicateCustomerId)) {
                    if (primaryNormalized.contains(phone.phoneNormalized)) {
                        // Already represented on the primary: remove the duplicate record entirely.
                        phoneDao.softDelete(phone.id, nowMs)
                        syncDao.enqueueWithCoalescing(
                            SyncOperationEntity(
                                id = UUID.randomUUID().toString(),
                                collectionName = AppConfig.COL_CUSTOMER_PHONES,
                                documentId = phone.id,
                                operation = OutboxOp.DELETE,
                                payloadJson = auditJson.toString()
                            )
                        )
                    } else {
                        primaryNormalized.add(phone.phoneNormalized)
                        phoneDao.reassignPhone(phone.id, primaryCustomerId, nowMs)
                        syncDao.enqueueWithCoalescing(
                            SyncOperationEntity(
                                id = UUID.randomUUID().toString(),
                                collectionName = AppConfig.COL_CUSTOMER_PHONES,
                                documentId = phone.id,
                                operation = OutboxOp.UPDATE,
                                payloadJson = JSONObject().apply {
                                    put("customerId", primaryCustomerId)
                                    put("isPrimary", false)
                                    if (currentUserId.isNotEmpty()) put("updatedBy", currentUserId)
                                }.toString()
                            )
                        )
                    }
                }

                // 2. Reassign historical orders without losing history.
                val orders: List<OrderEntity> = orderDao.getOrdersForCustomer(duplicateCustomerId)
                if (orders.isNotEmpty()) {
                    orderDao.reassignOrders(duplicateCustomerId, primaryCustomerId, primary.name, nowMs)
                    for (order in orders) {
                        syncDao.enqueueWithCoalescing(
                            SyncOperationEntity(
                                id = UUID.randomUUID().toString(),
                                collectionName = AppConfig.COL_ORDERS,
                                documentId = order.id,
                                operation = OutboxOp.UPDATE,
                                payloadJson = JSONObject().apply {
                                    put("customerId", primaryCustomerId)
                                    put("customerName", primary.name)
                                    if (currentUserId.isNotEmpty()) put("updatedBy", currentUserId)
                                }.toString()
                            )
                        )
                    }
                }

                // 3. Merge missing descriptive fields into the primary.
                val mergedPrimary = primary.copy(
                    email = primary.email ?: duplicate.email,
                    address = primary.address ?: duplicate.address,
                    notes = primary.notes ?: duplicate.notes,
                    appUserId = primary.appUserId ?: duplicate.appUserId,
                    updatedAtMs = nowMs,
                    syncState = AppConfig.SYNC_STATE_PENDING
                )
                customerDao.insert(mergedPrimary)
                syncDao.enqueueWithCoalescing(customerOutboxOp(mergedPrimary, isNew = false, currentUserId = currentUserId))

                // 4. Soft-delete the duplicate with mergedInto.
                customerDao.softDelete(duplicateCustomerId)
                syncDao.enqueueWithCoalescing(
                    SyncOperationEntity(
                        id = UUID.randomUUID().toString(),
                        collectionName = AppConfig.COL_CUSTOMERS,
                        documentId = duplicateCustomerId,
                        operation = OutboxOp.DELETE,
                        payloadJson = auditJson.toString()
                    )
                )
            }
            SyncScheduler.scheduleImmediateSync(context)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCustomerInsights(customerId: String): CustomerInsights = withContext(Dispatchers.IO) {
        val orders = orderDao.getOrdersForCustomer(customerId)
        if (orders.isEmpty()) return@withContext CustomerInsights()

        val totalsByCurrency = mutableMapOf<String, Double>()
        val productStats = mutableMapOf<String, Pair<Double, Int>>()

        for (order in orders) {
            try {
                val json = JSONObject(order.totalAmountByCurrencyJson)
                val keys = json.keys()
                while (keys.hasNext()) {
                    val currency = keys.next()
                    totalsByCurrency[currency] =
                        (totalsByCurrency[currency] ?: 0.0) + json.optDouble(currency, 0.0)
                }
            } catch (_: Exception) {}

            for (item in orderDao.getOrderItems(order.id)) {
                val current = productStats[item.productName] ?: (0.0 to 0)
                productStats[item.productName] = (current.first + item.quantity) to (current.second + 1)
            }
        }

        val topProducts = productStats.entries
            .sortedByDescending { it.value.first }
            .take(5)
            .map { ProductStat(it.key, it.value.first, it.value.second) }

        val averageByCurrency = totalsByCurrency.mapValues { (_, total) -> total / orders.size }
        val lastOrderDate = orders.maxOfOrNull { it.createdAtMs ?: 0L }

        CustomerInsights(
            totalOrders = orders.size,
            totalsByCurrency = totalsByCurrency,
            averageByCurrency = averageByCurrency,
            lastOrderDateMs = lastOrderDate,
            topProducts = topProducts
        )
    }

    private suspend fun ensureNotDuplicate(companyId: String, normalized: String, customerId: String) {
        if (normalized.isEmpty()) return
        val duplicate = phoneDao.findDuplicateInCompany(companyId, normalized, customerId)
        if (duplicate != null) {
            throw DuplicatePhoneException("رقم الهاتف $normalized مسجل بالفعل لعميل آخر في نفس الشركة")
        }
    }

    private fun customerOutboxOp(customer: CustomerEntity, isNew: Boolean, currentUserId: String): SyncOperationEntity {
        val payload = JSONObject().apply {
            put("companyId", customer.companyId)
            put("name", customer.name)
            put("email", customer.email)
            put("phone", customer.phone)
            put("address", customer.address)
            put("notes", customer.notes)
            put("appUserId", customer.appUserId)
            put("isDeleted", false)
            if (currentUserId.isNotEmpty()) {
                if (isNew) put("createdBy", currentUserId)
                put("updatedBy", currentUserId)
            }
            if (customer.contactNumbersJson.isNotEmpty()) {
                try {
                    put("contactNumbers", JSONArray(customer.contactNumbersJson))
                } catch (_: Exception) {}
            }
        }
        return SyncOperationEntity(
            id = UUID.randomUUID().toString(),
            collectionName = AppConfig.COL_CUSTOMERS,
            documentId = customer.id,
            operation = if (isNew) OutboxOp.CREATE else OutboxOp.UPDATE,
            payloadJson = payload.toString()
        )
    }

    private fun phoneOutboxOp(phone: CustomerPhoneEntity, isNew: Boolean, currentUserId: String): SyncOperationEntity {
        val payload = JSONObject().apply {
            put("companyId", phone.companyId)
            put("customerId", phone.customerId)
            put("phoneRaw", phone.phoneRaw)
            put("phoneNormalized", phone.phoneNormalized)
            put("label", phone.label)
            put("isPrimary", phone.isPrimary)
            put("isDeleted", false)
            if (currentUserId.isNotEmpty()) {
                if (isNew) put("createdBy", currentUserId)
                put("updatedBy", currentUserId)
            }
        }
        return SyncOperationEntity(
            id = UUID.randomUUID().toString(),
            collectionName = AppConfig.COL_CUSTOMER_PHONES,
            documentId = phone.id,
            operation = if (isNew) OutboxOp.CREATE else OutboxOp.UPDATE,
            payloadJson = payload.toString()
        )
    }
}
