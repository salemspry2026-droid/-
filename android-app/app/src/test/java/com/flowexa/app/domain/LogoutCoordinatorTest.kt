package com.flowexa.app.domain

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import com.flowexa.app.sync.SyncActivity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class LogoutCoordinatorTest {

    private class FakeDeps : LogoutDependencies {
        var counts = OutboxCounts()
        var countsSequence = ArrayDeque<OutboxCounts>()
        var countsError: Exception? = null
        var countsGate: CompletableDeferred<Unit>? = null
        var countsStarted = CompletableDeferred<Unit>()

        var syncResult: Result<Unit> = Result.success(Unit)
        var syncCalls = 0

        var stopResults = ArrayDeque<Boolean>()
        var stopCalls = 0

        var clearCalls = 0
        var clearError: Exception? = null
        var signOutCalls = 0
        var signOutError: Exception? = null
        var allowCalls = 0
        var resumeCalls = 0
        val events = mutableListOf<String>()

        override suspend fun outboxCounts(): OutboxCounts {
            countsStarted.complete(Unit)
            countsGate?.await()
            countsError?.let { throw it }
            return if (countsSequence.isEmpty()) counts else countsSequence.removeFirst()
        }

        override suspend fun syncOutbox(): Result<Unit> {
            syncCalls++
            return syncResult
        }

        override suspend fun stopBackgroundSync(): Boolean {
            stopCalls++
            return if (stopResults.isEmpty()) true else stopResults.removeFirst()
        }

        override suspend fun clearLocalData() {
            clearCalls++
            events += "clear"
            clearError?.let { throw it }
        }

        override suspend fun signOut() {
            signOutCalls++
            events += "signout"
            signOutError?.let { throw it }
        }

        override fun allowSync() {
            allowCalls++
        }

        override fun resumeSync() {
            resumeCalls++
        }
    }

    @Test
    fun emptyOutboxIsReadyWithoutSync() = runBlocking {
        val deps = FakeDeps()
        val coordinator = LogoutCoordinator(deps)

        val result = coordinator.prepare()

        assertEquals(LogoutPreparation.Ready, result)
        assertEquals(1, deps.stopCalls)
        assertEquals(0, deps.syncCalls)
        assertEquals(0, deps.allowCalls)
        assertEquals(0, deps.clearCalls)
        assertEquals(0, deps.signOutCalls)
    }

    @Test
    fun pendingOperationsAreAcknowledgedBeforeCleanup() = runBlocking {
        val deps = FakeDeps().apply {
            countsSequence = ArrayDeque(listOf(OutboxCounts(pending = 2), OutboxCounts()))
            stopResults = ArrayDeque(listOf(true, true))
        }
        val coordinator = LogoutCoordinator(deps)

        val result = coordinator.prepare()

        assertEquals(LogoutPreparation.Ready, result)
        assertEquals(1, deps.syncCalls)
        assertEquals(1, deps.allowCalls)
        assertEquals(0, deps.resumeCalls)
        assertEquals(2, deps.stopCalls)
        assertEquals(0, deps.clearCalls)
    }

    @Test
    fun remainingOperationsRequireExplicitConfirmation() = runBlocking {
        val deps = FakeDeps().apply {
            countsSequence = ArrayDeque(listOf(OutboxCounts(pending = 1), OutboxCounts(pending = 1)))
            stopResults = ArrayDeque(listOf(true, true))
        }
        val coordinator = LogoutCoordinator(deps)

        val result = coordinator.prepare()

        assertTrue(result is LogoutPreparation.NeedsConfirmation)
        val confirmation = result as LogoutPreparation.NeedsConfirmation
        assertEquals(1, confirmation.counts?.total)
        assertEquals(LogoutPreparation.Reason.REMAINING_AFTER_SYNC, confirmation.reason)
        assertEquals(0, deps.clearCalls)
        assertEquals(0, deps.signOutCalls)
    }

    @Test
    fun syncFailureIsNotTreatedAsAnEmptyOutbox() = runBlocking {
        val deps = FakeDeps().apply {
            countsSequence = ArrayDeque(listOf(OutboxCounts(failed = 1), OutboxCounts(failed = 1)))
            stopResults = ArrayDeque(listOf(true, true))
            syncResult = Result.failure(IOException("offline"))
        }
        val coordinator = LogoutCoordinator(deps)

        val result = coordinator.prepare()

        assertTrue(result is LogoutPreparation.NeedsConfirmation)
        assertEquals(
            LogoutPreparation.Reason.SYNC_FAILED,
            (result as LogoutPreparation.NeedsConfirmation).reason
        )
        assertEquals(0, deps.clearCalls)
    }

    @Test
    fun inspectionFailureDoesNotAssumeTheOutboxIsEmpty() = runBlocking {
        val deps = FakeDeps().apply {
            countsError = IOException("database unavailable")
        }
        val coordinator = LogoutCoordinator(deps)

        val result = coordinator.prepare()

        assertTrue(result is LogoutPreparation.NeedsConfirmation)
        val confirmation = result as LogoutPreparation.NeedsConfirmation
        assertEquals(null, confirmation.counts)
        assertEquals(LogoutPreparation.Reason.INSPECTION_FAILED, confirmation.reason)
        assertEquals(0, deps.clearCalls)
    }

    @Test
    fun runningWorkerBlocksCleanup() = runBlocking {
        val deps = FakeDeps().apply {
            stopResults = ArrayDeque(listOf(false))
        }
        val coordinator = LogoutCoordinator(deps)

        val result = coordinator.prepare()

        assertTrue(result is LogoutPreparation.Blocked)
        assertEquals(0, deps.clearCalls)
        assertEquals(0, deps.signOutCalls)
    }

    @Test
    fun syncActivityWaitsUntilActiveWorkStops() = runBlocking {
        SyncActivity.begin()
        try {
            assertFalse(SyncActivity.awaitIdle(50L))
        } finally {
            SyncActivity.end()
        }
        assertTrue(SyncActivity.awaitIdle(1_000L))
    }

    @Test
    fun explicitDiscardClearsLocalDataBeforeSigningOut() = runBlocking {
        val deps = FakeDeps().apply {
            countsSequence = ArrayDeque(listOf(OutboxCounts(pending = 1), OutboxCounts(pending = 1)))
            stopResults = ArrayDeque(listOf(true, true))
        }
        val coordinator = LogoutCoordinator(deps)
        assertTrue(coordinator.prepare() is LogoutPreparation.NeedsConfirmation)

        val result = coordinator.finalize()

        assertEquals(LogoutResult.Success, result)
        assertEquals(listOf("clear", "signout"), deps.events)
        assertEquals(1, deps.clearCalls)
        assertEquals(1, deps.signOutCalls)
        assertEquals(1, deps.allowCalls)
        // Only finalize's cleanup guard; preparation must not schedule new work.
        assertEquals(1, deps.resumeCalls)
    }

    @Test
    fun cleanupFailureDoesNotSignOutOrExposeAnotherTenant() = runBlocking {
        val deps = FakeDeps().apply {
            clearError = IOException("clear failed")
        }
        val coordinator = LogoutCoordinator(deps)

        val result = coordinator.finalize()

        assertTrue(result is LogoutResult.CleanupFailed)
        assertEquals(1, deps.clearCalls)
        assertEquals(0, deps.signOutCalls)
        assertEquals(1, deps.resumeCalls)
    }

    @Test
    fun signOutFailureIsReportedAfterLocalCleanup() = runBlocking {
        val deps = FakeDeps().apply {
            signOutError = IOException("sign out failed")
        }
        val coordinator = LogoutCoordinator(deps)

        val result = coordinator.finalize()

        assertTrue(result is LogoutResult.SignOutFailed)
        assertEquals(1, deps.clearCalls)
        assertEquals(1, deps.signOutCalls)
        assertEquals(1, deps.resumeCalls)
    }

    @Test
    fun repeatedLogoutRequestsCannotStartOverlappingSequences() {
        val coordinator = LogoutCoordinator(FakeDeps())

        assertTrue(coordinator.tryBegin())
        assertFalse(coordinator.tryBegin())
        coordinator.finish()
        assertTrue(coordinator.tryBegin())
    }

    @Test
    fun cancelledPreparationNeverClearsLocalData() = runBlocking {
        val deps = FakeDeps().apply {
            countsGate = CompletableDeferred()
        }
        val coordinator = LogoutCoordinator(deps)
        val job = launch(Dispatchers.Default) {
            coordinator.prepare()
        }
        deps.countsStarted.await()
        job.cancelAndJoin()

        assertEquals(0, deps.clearCalls)
        assertEquals(0, deps.signOutCalls)
        assertEquals(0, deps.syncCalls)
    }
}
