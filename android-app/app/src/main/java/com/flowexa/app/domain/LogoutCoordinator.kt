package com.flowexa.app.domain

import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean

data class OutboxCounts(
    val pending: Int = 0,
    val processing: Int = 0,
    val failed: Int = 0
) {
    val total: Int get() = pending + processing + failed
}

sealed interface LogoutPreparation {
    data object Ready : LogoutPreparation

    data class NeedsConfirmation(
        val counts: OutboxCounts?,
        val reason: Reason
    ) : LogoutPreparation

    data class Blocked(val reason: Reason) : LogoutPreparation

    enum class Reason {
        REMAINING_AFTER_SYNC,
        INSPECTION_FAILED,
        SYNC_FAILED,
        WORKER_BUSY
    }
}

sealed interface LogoutResult {
    data object Success : LogoutResult
    data class CleanupFailed(val cause: Throwable) : LogoutResult
    data class SignOutFailed(val cause: Throwable) : LogoutResult
}

interface LogoutDependencies {
    suspend fun outboxCounts(): OutboxCounts
    suspend fun syncOutbox(): Result<Unit>
    suspend fun stopBackgroundSync(): Boolean
    suspend fun clearLocalData()
    suspend fun signOut()

    /** Releases the sync gate without enqueueing new background work. */
    fun allowSync()

    /** Releases the sync gate and restores normal background scheduling. */
    fun resumeSync()
}

/**
 * Coordinates a logout without silently discarding unsynchronized work.
 *
 * Sequence:
 *  1. stop new syncs and wait for running work (bounded),
 *  2. inspect the outbox and try to upload anything pending,
 *  3. re-inspect and require explicit confirmation if work remains,
 *  4. clear local data before signing out so a cleanup failure cannot leave a
 *     different tenant able to see stale local rows.
 */
class LogoutCoordinator(
    private val deps: LogoutDependencies
) {
    private val active = AtomicBoolean(false)

    fun tryBegin(): Boolean = active.compareAndSet(false, true)

    fun finish() {
        active.set(false)
    }

    /** Resume background sync after an aborted logout attempt. */
    fun abort() {
        runCatching { deps.resumeSync() }
        finish()
    }

    suspend fun prepare(): LogoutPreparation {
        if (!deps.stopBackgroundSync()) {
            return LogoutPreparation.Blocked(LogoutPreparation.Reason.WORKER_BUSY)
        }

        val before = try {
            deps.outboxCounts()
        } catch (_: Exception) {
            // Inspection failure is NOT proof that the outbox is empty.
            return LogoutPreparation.NeedsConfirmation(
                counts = null,
                reason = LogoutPreparation.Reason.INSPECTION_FAILED
            )
        }

        if (before.total == 0) return LogoutPreparation.Ready

        // Temporarily allow the existing single-flight sync to upload while the
        // authenticated tenant context is still available. Do not enqueue new
        // WorkManager work during logout preparation.
        deps.allowSync()
        val syncFailed = try {
            deps.syncOutbox().isFailure
        } catch (_: Exception) {
            true
        }

        if (!deps.stopBackgroundSync()) {
            return LogoutPreparation.Blocked(LogoutPreparation.Reason.WORKER_BUSY)
        }

        val after = try {
            deps.outboxCounts()
        } catch (_: Exception) {
            return LogoutPreparation.NeedsConfirmation(
                counts = null,
                reason = LogoutPreparation.Reason.INSPECTION_FAILED
            )
        }

        return if (after.total > 0) {
            LogoutPreparation.NeedsConfirmation(
                counts = after,
                reason = if (syncFailed) {
                    LogoutPreparation.Reason.SYNC_FAILED
                } else {
                    LogoutPreparation.Reason.REMAINING_AFTER_SYNC
                }
            )
        } else {
            LogoutPreparation.Ready
        }
    }

    /**
     * Clears local data first, then signs out. The caller must only invoke this after
     * [prepare] returned [LogoutPreparation.Ready] or the user explicitly confirmed discard.
     */
    suspend fun finalize(): LogoutResult = try {
        withContext(NonCancellable) {
            try {
                deps.clearLocalData()
            } catch (e: Exception) {
                return@withContext LogoutResult.CleanupFailed(e)
            }
            try {
                deps.signOut()
            } catch (e: Exception) {
                return@withContext LogoutResult.SignOutFailed(e)
            }
            LogoutResult.Success
        }
    } finally {
        // If sign-out succeeded there is no user to reschedule; the implementation checks that.
        runCatching { deps.resumeSync() }
    }
}
