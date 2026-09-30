package com.flowexa.app.data.repository

import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.OrderStageEntity
import kotlinx.coroutines.flow.Flow

class OrderStageRepository(private val database: FlowexaDatabase) {
    fun observeOrderStages(companyId: String): Flow<List<OrderStageEntity>> {
        return database.orderStageDao().observeOrderStages(companyId)
    }
}
