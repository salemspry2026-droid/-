package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.CompanyEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.data.remote.FirebaseProvider
import com.flowexa.app.data.remote.FirestoreMappers
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID

class CompanyRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    private val companyDao = database.companyDao()
    private val syncDao = database.syncOperationDao()
    private val firestore = FirebaseProvider.firestore

    fun observeCompany(id: String): Flow<CompanyEntity?> {
        return companyDao.observeCompany(id)
    }

    suspend fun getCompany(id: String): CompanyEntity? = withContext(Dispatchers.IO) {
        val cached = companyDao.getCompany(id)
        if (cached != null) return@withContext cached

        try {
            val doc = firestore.collection(AppConfig.COL_COMPANIES).document(id).get().await()
            if (doc.exists()) {
                val company = FirestoreMappers.docToCompany(doc)
                companyDao.insert(company)
                company
            } else null
        } catch (e: Exception) {
            null
        }
    }

    suspend fun updateCompany(company: CompanyEntity) = withContext(Dispatchers.IO) {
        companyDao.insert(company)

        val payload = JSONObject().apply {
            put("name", company.name)
            put("phone", company.phone)
            put("address", company.address)
            put("taxId", company.taxId)
            put("aboutUs", company.aboutUs)
            put("email", company.email)
            put("notes", company.notes)
            put("workingHours", company.workingHours)
            put("primaryCurrency", company.primaryCurrency)
        }

        syncDao.insert(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_COMPANIES,
                documentId = company.id,
                operation = "UPDATE",
                payloadJson = payload.toString()
            )
        )

        SyncScheduler.scheduleImmediateSync(context)
    }
}
