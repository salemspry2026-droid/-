package com.flowexa.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.flowexa.app.data.local.entity.OrderEntity
import com.flowexa.app.data.local.entity.OrderItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Query("""
        SELECT * FROM orders 
        WHERE companyId = :companyId AND isDeleted = 0 
        ORDER BY createdAtMs DESC
    """)
    fun observeOrders(companyId: String): Flow<List<OrderEntity>>

    @Query("""
        SELECT * FROM orders 
        WHERE companyId = :companyId AND status = :status AND isDeleted = 0 
        ORDER BY createdAtMs DESC
    """)
    fun observeOrdersByStatus(companyId: String, status: String): Flow<List<OrderEntity>>

    @Query("""
        SELECT * FROM orders 
        WHERE clientUid = :clientUid AND isDeleted = 0 
        ORDER BY createdAtMs DESC
    """)
    fun observeClientOrders(clientUid: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE id = :id LIMIT 1")
    suspend fun getOrder(id: String): OrderEntity?

    @Query("SELECT * FROM order_items WHERE orderId = :orderId")
    fun observeOrderItems(orderId: String): Flow<List<OrderItemEntity>>

    @Query("SELECT * FROM order_items WHERE orderId = :orderId")
    suspend fun getOrderItems(orderId: String): List<OrderItemEntity>

    @Query("SELECT * FROM orders WHERE customerId = :customerId AND isDeleted = 0 ORDER BY createdAtMs DESC")
    suspend fun getOrdersForCustomer(customerId: String): List<OrderEntity>

    @Query("UPDATE orders SET customerId = :newCustomerId, customerName = :newCustomerName, syncState = 'PENDING', updatedAtMs = :nowMs WHERE customerId = :oldCustomerId")
    suspend fun reassignOrders(oldCustomerId: String, newCustomerId: String, newCustomerName: String, nowMs: Long): Int

    @Query("SELECT * FROM orders WHERE id = :orderId LIMIT 1")
    suspend fun getOrderById(orderId: String): OrderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrderItems(items: List<OrderItemEntity>)

    @Update
    suspend fun updateOrder(order: OrderEntity)

    @Query("UPDATE orders SET status = :newStatus, updatedAtMs = :timestamp, syncState = 'PENDING' WHERE id = :orderId")
    suspend fun updateOrderStatus(orderId: String, newStatus: String, timestamp: Long)

    @Query("UPDATE orders SET isDeleted = 1, syncState = 'PENDING' WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("UPDATE orders SET syncState = :state WHERE id = :id")
    suspend fun updateSyncState(id: String, state: String)

    @Query("DELETE FROM order_items WHERE orderId = :orderId")
    suspend fun deleteOrderItems(orderId: String)

    /**
     * Replaces ONE order and its items atomically: the order's existing local items are removed
     * first, so items that no longer exist remotely do not linger. Only [order].id is touched.
     */
    @Transaction
    suspend fun saveOrderWithItems(order: OrderEntity, items: List<OrderItemEntity>) {
        insertOrder(order)
        deleteOrderItems(order.id)
        insertOrderItems(items)
    }
}
