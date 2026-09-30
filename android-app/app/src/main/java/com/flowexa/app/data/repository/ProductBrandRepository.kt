package com.flowexa.app.data.repository

import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.ProductBrandEntity
import kotlinx.coroutines.flow.Flow

class ProductBrandRepository(private val database: FlowexaDatabase) {
    fun observeBrands(companyId: String): Flow<List<ProductBrandEntity>> {
        return database.productBrandDao().observeBrands(companyId)
    }
}
