package com.flowexa.app.data.repository

import android.content.Context
import androidx.room.withTransaction
import com.flowexa.app.core.AppConfig
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.local.dao.OutboxOp
import com.flowexa.app.data.local.entity.SyncOperationEntity
import com.flowexa.app.sync.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID

/** Client profile edits (web: authService.updateUserProfile). Offline-first via the outbox. */
class ProfileRepository(
    private val database: FlowexaDatabase,
    private val context: Context
) {
    data class ClientProfileForm(
        val storeName: String,
        val phone: String,
        val addressCountry: String,
        val addressGov: String,
        val addressCity: String,
        val addressNeighborhood: String,
        val activityType: String,
        val activityTypeOther: String,
        val notes: String,
        val email: String
    ) {
        val fullAddress: String
            get() = listOf(addressCountry, addressGov, addressCity, addressNeighborhood)
                .map { it.trim() }.filter { it.isNotEmpty() }.joinToString(" - ")
    }

    suspend fun updateClientProfile(uid: String, form: ClientProfileForm) = withContext(Dispatchers.IO) {
        val dao = database.userProfileDao()
        val profile = dao.getProfile(uid) ?: return@withContext
        val nowMs = System.currentTimeMillis()
        val other = if (form.activityType == "other") form.activityTypeOther.trim() else ""
        val payload = JSONObject().apply {
            put("storeName", form.storeName.trim())
            put("phone", form.phone.trim())
            put("address", form.fullAddress)
            put("addressCountry", form.addressCountry.trim())
            put("addressGov", form.addressGov.trim())
            put("addressCity", form.addressCity.trim())
            put("addressNeighborhood", form.addressNeighborhood.trim())
            put("activityType", form.activityType)
            put("activityTypeOther", other)
            put("notes", form.notes.trim())
            put("email", form.email.trim())
            put("updatedBy", uid)
        }
        database.withTransaction {
            dao.insert(
                profile.copy(
                    storeName = form.storeName.trim(),
                    phone = form.phone.trim(),
                    address = form.fullAddress,
                    addressCountry = form.addressCountry.trim(),
                    addressGov = form.addressGov.trim(),
                    addressCity = form.addressCity.trim(),
                    addressNeighborhood = form.addressNeighborhood.trim(),
                    activityType = form.activityType,
                    activityTypeOther = other,
                    notes = form.notes.trim(),
                    email = form.email.trim().ifEmpty { profile.email },
                    syncState = AppConfig.SYNC_STATE_PENDING,
                    updatedAtMs = nowMs
                )
            )
            database.syncOperationDao().enqueueWithCoalescing(
                SyncOperationEntity(
                    id = UUID.randomUUID().toString(),
                    collectionName = AppConfig.COL_USER_PROFILES,
                    documentId = uid,
                    operation = OutboxOp.UPDATE,
                    payloadJson = payload.toString()
                )
            )
        }
        SyncScheduler.scheduleImmediateSync(context)
    }
}
