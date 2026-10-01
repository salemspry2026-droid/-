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
            customerPhone = customerPhone,
            customerAddress = customerAddress,
            status = "pending",
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
 
        // Save order & items to Room in a transaction
        orderDao.saveOrderWithItems(order, updatedItems)
 
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
            put("status", "pending")
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
 
        syncDao.insert(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_ORDERS,
                documentId = orderId,
                operation = "CREATE",
                payloadJson = orderPayload.toString()
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
        )
        }
 
        SyncScheduler.scheduleImmediateSync(context)
        order
    }
 
    suspend fun updateStatus(orderId: String, newStatus: String, updatedBy: String) = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        orderDao.updateOrderStatus(orderId, newStatus, now)
 
        val payload = JSONObject().apply {
            put("status", newStatus)
            put("updatedBy", updatedBy)
        }
 
        syncDao.insert(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_ORDERS,
                documentId = orderId,
                operation = "UPDATE",
                payloadJson = payload.toString()
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
        )
        }
 
        SyncScheduler.scheduleImmediateSync(context)
    }
}