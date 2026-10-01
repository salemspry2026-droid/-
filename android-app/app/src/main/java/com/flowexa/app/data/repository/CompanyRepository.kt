package com.flowexa.app.data.repository
 
import android.content.Context
import androidx.room.withTransaction
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
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
            database.withTransaction {
                companyDao.insert(company)
                syncDao.insert(
                    SyncOperationEntity(
                        id = UUID.randomUUID().toString(),
                        collectionName = AppConfig.COL_COMPANIES,
                        documentId = companyId,
                        operation = OutboxOp.CREATE,
                        payloadJson = companyPayload.toString()
                    )
                )
            )
            }
 
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
            database.withTransaction {
                userProfileDao.insert(updatedProfile)
                syncDao.insert(
                    SyncOperationEntity(
                        id = UUID.randomUUID().toString(),
                        collectionName = AppConfig.COL_USER_PROFILES,
                        documentId = ownerId,
                        operation = OutboxOp.UPDATE,
                        payloadJson = profilePayload.toString()
                    )
                )
            )
            }
 
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
            database.withTransaction {
                userProfileDao.insert(profile)
                syncDao.insert(
                    SyncOperationEntity(
                        id = UUID.randomUUID().toString(),
                        collectionName = AppConfig.COL_USER_PROFILES,
                        documentId = userUid,
                        operation = OutboxOp.UPDATE,
                        payloadJson = profilePayload.toString()
                    )
                )
            )
            }
 
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
            database.notificationDao().insertAll(listOf(notif))
 
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
            database.withTransaction {
                database.notificationDao().insertAll(listOf(notif))
                syncDao.insert(
                    SyncOperationEntity(
                        id = UUID.randomUUID().toString(),
                        collectionName = AppConfig.COL_NOTIFICATIONS,
                        documentId = notifId,
                        operation = OutboxOp.CREATE,
                        payloadJson = notifPayload.toString()
                    )
                )
            )
            }
 
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
 
    suspend fun updateCompany(company: CompanyEntity, currentUserId: String = "") = withContext(Dispatchers.IO) {
        val nowMs = System.currentTimeMillis()
        val pendingCompany = company.copy(
            syncState = AppConfig.SYNC_STATE_PENDING,
            updatedAtMs = nowMs
        )
        companyDao.insert(pendingCompany)
 
        val payload = JSONObject().apply {
            put("name", pendingCompany.name)
            put("phone", pendingCompany.phone)
            put("address", pendingCompany.address)
            put("taxId", pendingCompany.taxId)
            put("aboutUs", pendingCompany.aboutUs)
            put("email", pendingCompany.email)
            put("notes", pendingCompany.notes)
            put("workingHours", pendingCompany.workingHours)
            put("primaryCurrency", pendingCompany.primaryCurrency)
            put("isDeleted", false)
            if (currentUserId.isNotEmpty()) {
                put("updatedBy", currentUserId)
            }
        }
 
        syncDao.enqueueWithCoalescing(
            SyncOperationEntity(
                id = UUID.randomUUID().toString(),
                collectionName = AppConfig.COL_COMPANIES,
                documentId = pendingCompany.id,
                operation = "UPDATE",
                payloadJson = payload.toString()
        database.withTransaction {
            companyDao.insert(pendingCompany)
            syncDao.enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_COMPANIES,
                    documentId = pendingCompany.id,
                    operation = OutboxOp.UPDATE,
                    payloadJson = payload.toString()
                )
            )
        )
        }
 
        SyncScheduler.scheduleImmediateSync(context)
    }
}