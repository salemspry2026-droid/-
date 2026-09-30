package com.flowexa.app.data.repository

import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.ProductCategoryEntity
import kotlinx.coroutines.flow.Flow

class ProductCategoryRepository(private val database: FlowexaDatabase) {
    fun observeCategories(companyId: String): Flow<List<ProductCategoryEntity>> {
        return database.productCategoryDao().observeCategories(companyId)
    }
}
