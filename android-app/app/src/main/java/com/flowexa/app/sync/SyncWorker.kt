package com.flowexa.app.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.flowexa.app.data.local.FlowexaDatabase
import com.flowexa.app.data.remote.FirebaseProvider

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val db = FlowexaDatabase.getInstance(applicationContext)
            val syncEngine = SyncEngine(db)

            // 1. Upload local changes to Firestore
            syncEngine.syncOutbox()

            // 2. Refresh local cache if user is signed in
            val currentUserId = FirebaseProvider.auth.currentUser?.uid
            if (currentUserId != null) {
                val profile = db.userProfileDao().getProfile(currentUserId)
                val companyId = profile?.companyId
                if (!companyId.isNullOrEmpty()) {
                    syncEngine.syncCompanyData(companyId, currentUserId)
                }
            }

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
