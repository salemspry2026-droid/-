package com.flowexa.app.sync

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Process-wide tracker for sync work that may still be touching Room.
 *
 * WorkManager cancellation is cooperative: a cancelled worker is not proof that its
 * coroutine has stopped. Logout must wait for managed syncs to become idle (bounded)
 * before clearing the database. If this cannot be proven, the database must not be cleared.
 */
object SyncActivity {
    private val active = MutableStateFlow(0)

    fun begin() {
        active.update { it + 1 }
    }

    fun end() {
        active.update { if (it > 0) it - 1 else 0 }
    }

    suspend fun awaitIdle(timeoutMs: Long): Boolean =
        withTimeoutOrNull(timeoutMs) {
            active.first { it == 0 }
            true
        } ?: false
}
