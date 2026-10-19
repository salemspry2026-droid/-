package com.flowexa.app

import android.app.Application
import android.util.Log
import com.flowexa.app.core.CrashReporter
import com.flowexa.app.domain.BonusCalculator
import com.flowexa.app.sync.SyncScheduler
import com.google.firebase.FirebaseApp

class FlowexaApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Persist the reason of any crash so the next launch can show it (see MainActivity).
        CrashReporter.install(this)

        // Ensure Firebase is initialized before any Firebase services are accessed
        try {
            if (FirebaseApp.getApps(this).isEmpty()) FirebaseApp.initializeApp(this)
        } catch (e: Exception) {
            Log.e("Flowexa", "Firebase init failed", e)
        }

        // Malformed bonus tiers must be observable, never silently swallowed.
        BonusCalculator.parseErrorReporter = { productId, reason, cause ->
            Log.e("BonusCalculator", "$reason (productId=$productId)", cause)
        }

        if (FirebaseApp.getApps(this).isNotEmpty()) {
            try { SyncScheduler.schedulePeriodicSync(this) } catch (e: Exception) { Log.e("Flowexa", "sync schedule failed", e) }
        }
    }
}
