package com.flowexa.app

import android.app.Application
import com.flowexa.app.sync.SyncScheduler

class FlowexaApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        SyncScheduler.schedulePeriodicSync(this)
    }
}
