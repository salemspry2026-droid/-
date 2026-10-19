package com.flowexa.app.data.repository

import android.content.Context
import androidx.room.withTransaction
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.data.local.entity.OrderItemEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class OrderRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val orderDao = database.orderDao()
    private val syncDao = database.syncOperationDao()

    fun observeOrders(companyId: String): Flow<List<OrderEntity>> {
        return orderDao.observeOrders(companyId)
    }

    fun observeOrdersByStatus(companyId: String, status: String): Flow<List<OrderEntity>> {
        return orderDao.observeOrdersByStatus(companyId, status)
    }

    fun observeClientOrders(clientUid: String): Flow<List<OrderEntity>> {
        return orderDao.observeClientOrders(clientUid)
    }

    suspend fun getOrder(id: String): OrderEntity? = withContext(Dispatchers.IO) {
        orderDao.getOrder(id)
    }

    fun observeOrderItems(orderId: String): Flow<List<OrderItemEntity>> {
        return orderDao.observeOrderItems(orderId)
    }

    suspend fun getOrderItems(orderId: String): List<OrderItemEntity> = withContext(Dispatchers.IO) {
        orderDao.getOrderItems(orderId)
    }

    /**
     * Creates an order with full offline capability.
     * Inserts into Room immediately, queues an Outbox sync operation, and triggers WorkManager.
     */
    suspend fun createOrder(
        companyId: String,
        customerId: String,
        customerName: String,
        customerPhone: String?,
        customerAddress: String?,
        invoiceType: String?,
        dueDate: String?,
        notes: String?,
        source: String,
        clientUid: String?,
        createdBy: String,
        createdByName: String?,
        items: List<OrderItemEntity>,
        totalAmountByCurrency: Map<String, Double>,
        initialStatus: String = "pending"
    ): OrderEntity = withContext(Dispatchers.IO) {
        val orderId = "ord_${UUID.randomUUID()}"
        val now = System.currentTimeMillis()

        val totalsJson = JSONObject(totalAmountByCurrency).toString()

        val order = OrderEntity(
            id = orderId,
            companyId = companyId,
            customerId = customerId,
            customerName = customerName,
            customerPhone = customerPhone,
            customerAddress = customerAddress,
            status = initialStatus,
            invoiceType = invoiceType,
            dueDate = dueDate,
            source = source,
            clientUid = clientUid,
            totalAmountByCurrencyJson = totalsJson,
            notes = notes,
            createdBy = createdBy,
            createdByName = createdByName,
            updatedBy = createdBy,
            createdAtMs = now,
            updatedAtMs = now,
            isDeleted = false,
            syncState = AppConfig.SYNC_STATE_PENDING
        )

        val updatedItems = items.map { it.copy(orderId = orderId) }

        // Prepare JSON payload for Firestore outbox
        val itemsArray = JSONArray()
        for (item in updatedItems) {
            val itemObj = JSONObject().apply {
                put("productId", item.productId)
                put("productName", item.productName)
                put("quantity", item.quantity)
                put("bonusQuantity", item.bonusQuantity)
                put("price", item.price)
                put("currency", item.currency)
                put("note", item.note)
                put("isManualBonus", item.isManualBonus)
            }
            itemsArray.put(itemObj)
        }

        val orderPayload = JSONObject().apply {
            put("companyId", companyId)
            put("customerId", customerId)
            put("customerName", customerName)
            put("customerPhone", customerPhone)
            put("customerAddress", customerAddress)
            put("status", initialStatus)
            put("invoiceType", invoiceType)
            put("dueDate", dueDate)
            put("source", source)
            put("clientUid", clientUid)
            put("totalAmountByCurrency", JSONObject(totalAmountByCurrency))
            put("notes", notes)
            put("createdBy", createdBy)
            put("createdByName", createdByName)
            put("updatedBy", createdBy)
            put("items", itemsArray)
            put("isDeleted", false)
        }

        database.withTransaction {
            orderDao.saveOrderWithItems(order, updatedItems)
            syncDao.insert(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_ORDERS,
                    documentId = orderId,
                    operation = OutboxOp.CREATE,
                    payloadJson = orderPayload.toString()
                )
            )
        }

        SyncScheduler.scheduleImmediateSync(context)
        order
    }

    suspend fun updateStatus(orderId: String, newStatus: String, updatedBy: String) = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()

        val payload = JSONObject().apply {
            put("status", newStatus)
            put("updatedBy", updatedBy)
        }

        database.withTransaction {
            orderDao.updateOrderStatus(orderId, newStatus, now)
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_ORDERS,
                    documentId = orderId,
                    operation = OutboxOp.UPDATE,
                    payloadJson = payload.toString()
                )
            )
        }

        SyncScheduler.scheduleImmediateSync(context)
    }

    /**
     * Web parity (OrderDetailsDialog.handleExcludeItems): removes the selected items from [order]
     * (recomputing its totals) and creates a NEW order with them at the first stage.
     * Returns false when every item would be excluded.
     */
    suspend fun excludeItems(
        order: OrderEntity,
        items: List<OrderItemEntity>,
        excludedIndexes: Set<Int>,
        firstStageName: String,
        userId: String,
        userName: String?
    ): Boolean = withContext(Dispatchers.IO) {
        val excluded = items.filterIndexed { i, _ -> i in excludedIndexes }
        val remaining = items.filterIndexed { i, _ -> i !in excludedIndexes }
        if (excluded.isEmpty() || remaining.isEmpty()) return@withContext false

        fun totals(list: List<OrderItemEntity>): Map<String, Double> {
            val m = linkedMapOf<String, Double>()
            list.forEach { m[it.currency] = (m[it.currency] ?: 0.0) + it.price * it.quantity }
            return m
        }
        val remainingTotals = totals(remaining)
        val now = System.currentTimeMillis()

        val itemsArray = JSONArray()
        remaining.forEach { item ->
            itemsArray.put(JSONObject().apply {
                put("productId", item.productId); put("productName", item.productName)
                put("quantity", item.quantity); put("bonusQuantity", item.bonusQuantity)
                put("price", item.price); put("currency", item.currency)
                put("note", item.note); put("isManualBonus", item.isManualBonus)
            })
        }
        val payload = JSONObject().apply {
            put("items", itemsArray)
            put("totalAmountByCurrency", JSONObject(remainingTotals))
            put("updatedBy", userId)
        }
        database.withTransaction {
            orderDao.saveOrderWithItems(
                order.copy(
                    totalAmountByCurrencyJson = JSONObject(remainingTotals).toString(),
                    syncState = AppConfig.SYNC_STATE_PENDING, updatedAtMs = now
                ),
                remaining
            )
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(), collectionName = AppConfig.COL_ORDERS,
                    documentId = order.id, operation = OutboxOp.UPDATE, payloadJson = payload.toString()
                )
            )
        }
        createOrder(
            companyId = order.companyId, customerId = order.customerId, customerName = order.customerName,
            customerPhone = order.customerPhone, customerAddress = order.customerAddress,
            invoiceType = order.invoiceType, dueDate = order.dueDate, notes = order.notes,
            source = order.source, clientUid = order.clientUid, createdBy = userId,
            createdByName = userName, items = excluded, totalAmountByCurrency = totals(excluded),
            initialStatus = firstStageName
        )
        true
    }
}
