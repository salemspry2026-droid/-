package com.flowexa.app.data.repository

import android.content.Context
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.entity.CompanyEntity
import com.flowexa.app.data.local.entity.NotificationEntity
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.data.local.entity.UserProfileEntity
import com.flowexa.app.data.remote.FirebaseProvider
import com.flowexa.app.data.remote.FirestoreMappers
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONArray
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
        } catch (_: Exception) {
            null
        }
    }

    suspend fun createCompany(
        name: String,
        primaryCurrency: String,
        ownerId: String,
        ownerEmail: String,
        ownerDisplayName: String
    ): Result<CompanyEntity> = withContext(Dispatchers.IO) {
        try {
            val companyId = "comp_" + UUID.randomUUID().toString().replace("-", "").take(12)
            val joinCode = (100000..999999).random().toString()
            val clientJoinCode = (100000..999999).random().toString()
            val nowMs = System.currentTimeMillis()

            val company = CompanyEntity(
                id = companyId,
                name = name,
                ownerId = ownerId,
                joinCode = joinCode,
                clientJoinCode = clientJoinCode,
                logoUrl = null,
                phone = null,
                address = null,
                taxId = null,
                contactNumbersJson = "[]",
                aboutUs = null,
                email = ownerEmail,
                notes = null,
                workingHours = null,
                companyType = "trading",
                primaryCurrency = primaryCurrency,
                secondaryCurrenciesJson = "[]",
                exchangeRatesJson = "{}",
                productUnitsJson = "[\"قطعة\",\"كرتون\"]",
                createdAtMs = nowMs,
                updatedAtMs = nowMs,
                isDeleted = false,
                syncState = AppConfig.SYNC_STATE_PENDING
            )

            companyDao.insert(company)

            val companyPayload = JSONObject().apply {
                put("name", company.name)
                put("ownerId", ownerId)
                put("joinCode", joinCode)
                put("clientJoinCode", clientJoinCode)
                put("companyType", "trading")
                put("primaryCurrency", primaryCurrency)
                put("secondaryCurrencies", JSONArray())
                put("exchangeRates", JSONObject())
                put("productUnits", JSONArray().put("قطعة").put("كرتون"))
                put("email", ownerEmail)
                put("isDeleted", false)
                put("createdBy", ownerId)
                put("updatedBy", ownerId)
            }

            syncDao.insert(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_COMPANIES,
                    documentId = companyId,
                    operation = "CREATE",
                    payloadJson = companyPayload.toString()
                )
            )

            val userProfileDao = database.userProfileDao()
            val existingProfile = userProfileDao.getProfile(ownerId)
            val updatedProfile = (existingProfile ?: UserProfileEntity(
                id = ownerId,
                email = ownerEmail,
                displayName = ownerDisplayName,
                companyId = companyId,
                role = AppConfig.ROLE_OWNER,
                companyName = name,
                phone = null,
                storeName = null,
                address = null,
                addressCountry = null,
                addressGov = null,
                addressCity = null,
                addressNeighborhood = null,
                logoUrl = null,
                activityType = null,
                activityTypeOther = null,
                notes = null,
                favoriteProductIdsJson = "[]",
                permissionsJson = "{}",
                createdAtMs = nowMs,
                updatedAtMs = nowMs,
                isDeleted = false,
                syncState = AppConfig.SYNC_STATE_PENDING
            )).copy(
                companyId = companyId,
                role = AppConfig.ROLE_OWNER,
                companyName = name,
                updatedAtMs = nowMs,
                syncState = AppConfig.SYNC_STATE_PENDING
            )
            userProfileDao.insert(updatedProfile)

            val profilePayload = JSONObject().apply {
                put("email", updatedProfile.email)
                put("displayName", updatedProfile.displayName)
                put("companyId", companyId)
                put("companyName", name)
                put("role", AppConfig.ROLE_OWNER)
                put("isDeleted", false)
                put("createdBy", ownerId)
                put("updatedBy", ownerId)
            }

            syncDao.insert(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_USER_PROFILES,
                    documentId = ownerId,
                    operation = "UPDATE",
                    payloadJson = profilePayload.toString()
                )
            )

            SyncScheduler.scheduleImmediateSync(context)
            Result.success(company)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun joinAsEmployee(
        joinCode: String,
        userUid: String,
        userEmail: String,
        userDisplayName: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            var matchedCompany: CompanyEntity? = companyDao.getCompanyByJoinCode(joinCode)
            if (matchedCompany == null) {
                val query = firestore.collection(AppConfig.COL_COMPANIES)
                    .whereEqualTo("joinCode", joinCode)
                    .whereEqualTo("isDeleted", false)
                    .limit(1)
                    .get()
                    .await()
                if (!query.isEmpty) {
                    val doc = query.documents.first()
                    matchedCompany = FirestoreMappers.docToCompany(doc)
                    companyDao.insert(matchedCompany)
                }
            }

            if (matchedCompany == null) {
                return@withContext Result.failure(Exception("كود الانضمام غير صحيح أو الشركة غير موجودة"))
            }

            val nowMs = System.currentTimeMillis()
            val userProfileDao = database.userProfileDao()
            val profile = UserProfileEntity(
                id = userUid,
                email = userEmail,
                displayName = userDisplayName,
                companyId = matchedCompany.id,
                role = AppConfig.ROLE_PENDING_EMPLOYEE,
                companyName = matchedCompany.name,
                phone = null,
                storeName = null,
                address = null,
                addressCountry = null,
                addressGov = null,
                addressCity = null,
                addressNeighborhood = null,
                logoUrl = null,
                activityType = null,
                activityTypeOther = null,
                notes = null,
                favoriteProductIdsJson = "[]",
                permissionsJson = "{}",
                createdAtMs = nowMs,
                updatedAtMs = nowMs,
                isDeleted = false,
                syncState = AppConfig.SYNC_STATE_PENDING
            )
            userProfileDao.insert(profile)

            val profilePayload = JSONObject().apply {
                put("email", profile.email)
                put("displayName", profile.displayName)
                put("companyId", matchedCompany.id)
                put("companyName", matchedCompany.name)
                put("role", AppConfig.ROLE_PENDING_EMPLOYEE)
                put("isDeleted", false)
                put("createdBy", userUid)
                put("updatedBy", userUid)
            }

            syncDao.insert(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_USER_PROFILES,
                    documentId = userUid,
                    operation = "UPDATE",
                    payloadJson = profilePayload.toString()
                )
            )

            val notifId = "notif_" + UUID.randomUUID().toString().replace("-", "").take(12)
            val notif = NotificationEntity(
                id = notifId,
                companyId = matchedCompany.id,
                title = "طلب انضمام موظف جديد",
                message = "قدم $userDisplayName ($userEmail) طلب انضمام كفرد في فريق العمل.",
                type = "staff_join",
                orderId = null,
                clientUid = userUid,
                isRead = false,
                createdAtMs = nowMs
            )
            database.notificationDao().insert(notif)

            val notifPayload = JSONObject().apply {
                put("companyId", matchedCompany.id)
                put("title", notif.title)
                put("message", notif.message)
                put("type", notif.type)
                put("clientUid", userUid)
                put("readBy", JSONArray())
                put("createdBy", userUid)
            }
            syncDao.insert(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_NOTIFICATIONS,
                    documentId = notifId,
                    operation = "CREATE",
                    payloadJson = notifPayload.toString()
                )
            )

            SyncScheduler.scheduleImmediateSync(context)
            Result.success(matchedCompany.name)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun joinAsClient(
        clientJoinCode: String,
        userUid: String,
        userEmail: String,
        userDisplayName: String
    ): Result<CompanyEntity> = withContext(Dispatchers.IO) {
        try {
            var matchedCompany: CompanyEntity? = companyDao.getCompanyByClientJoinCode(clientJoinCode)
            if (matchedCompany == null) {
                val query = firestore.collection(AppConfig.COL_COMPANIES)
                    .whereEqualTo("clientJoinCode", clientJoinCode)
                    .whereEqualTo("isDeleted", false)
                    .limit(1)
                    .get()
                    .await()
                if (!query.isEmpty) {
                    val doc = query.documents.first()
                    matchedCompany = FirestoreMappers.docToCompany(doc)
                    companyDao.insert(matchedCompany)
                }
            }

            if (matchedCompany == null) {
                return@withContext Result.failure(Exception("كود متجر الشركة غير صحيح أو غير متوفر"))
            }

            val nowMs = System.currentTimeMillis()
            val userProfileDao = database.userProfileDao()
            val existing = userProfileDao.getProfile(userUid)
            val profile = (existing ?: UserProfileEntity(
                id = userUid,
                email = userEmail,
                displayName = userDisplayName,
                companyId = matchedCompany.id,
                role = AppConfig.ROLE_CLIENT,
                companyName = matchedCompany.name,
                phone = null,
                storeName = null,
                address = null,
                addressCountry = null,
                addressGov = null,
                addressCity = null,
                addressNeighborhood = null,
                logoUrl = null,
                activityType = null,
                activityTypeOther = null,
                notes = null,
                favoriteProductIdsJson = "[]",
                permissionsJson = "{}",
                createdAtMs = nowMs,
                updatedAtMs = nowMs,
                isDeleted = false,
                syncState = AppConfig.SYNC_STATE_PENDING
            )).copy(
                companyId = matchedCompany.id,
                role = AppConfig.ROLE_CLIENT,
                companyName = matchedCompany.name,
                updatedAtMs = nowMs,
                syncState = AppConfig.SYNC_STATE_PENDING
            )
            userProfileDao.insert(profile)

            val profilePayload = JSONObject().apply {
                put("email", profile.email)
                put("displayName", profile.displayName)
                put("companyId", matchedCompany.id)
                put("companyName", matchedCompany.name)
                put("role", AppConfig.ROLE_CLIENT)
                put("isDeleted", false)
                put("createdBy", userUid)
                put("updatedBy", userUid)
            }

            syncDao.insert(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_USER_PROFILES,
                    documentId = userUid,
                    operation = "UPDATE",
                    payloadJson = profilePayload.toString()
                )
            )

            SyncScheduler.scheduleImmediateSync(context)
            Result.success(matchedCompany)
        } catch (e: Exception) {
            Result.failure(e)
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
