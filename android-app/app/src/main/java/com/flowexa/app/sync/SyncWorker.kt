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
        val db = FlowexaDatabase.getInstance(applicationContext)
        val syncEngine = SyncEngine(db)

        val upload = syncEngine.syncOutbox()
        if (upload.isFailure) return Result.retry()

        val currentUserId = FirebaseProvider.auth.currentUser?.uid ?: return Result.success()
        val companyId = db.userProfileDao().getProfile(currentUserId)?.companyId
        if (companyId.isNullOrEmpty()) return Result.success()

        val pull = syncEngine.syncCompanyData(companyId, currentUserId)
        return pull.fold(
            onSuccess = { Result.success() },
            onFailure = { error ->
                if (isTransientSyncError(error)) Result.retry() else Result.failure()
            }
        )
    }
}
