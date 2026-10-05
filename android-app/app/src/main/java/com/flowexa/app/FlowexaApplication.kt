package com.flowexa.app

import android.app.Application
import android.util.Log
import com.flowexa.app.domain.BonusCalculator
import com.flowexa.app.sync.SyncScheduler

class FlowexaApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Malformed bonus tiers must be observable, never silently swallowed.
        BonusCalculator.parseErrorReporter = { productId, reason, cause ->
            Log.e("BonusCalculator", "$reason (productId=$productId)", cause)
        }

        SyncScheduler.schedulePeriodicSync(this)
    }
}
