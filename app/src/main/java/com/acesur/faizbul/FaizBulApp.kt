package com.acesur.faizbul

import android.app.Application
import androidx.room.Room
import com.acesur.faizbul.background.BackgroundUpdateWorker
import com.acesur.faizbul.data.local.AppDatabase
import com.acesur.faizbul.util.NotificationHelper

class FaizBulApp : Application() {
    companion object {
        lateinit var database: AppDatabase
            private set
    }

    override fun onCreate() {
        super.onCreate()
        database = Room.databaseBuilder(
            applicationContext,
            AppDatabase::class.java, "faizbul-db"
        ).fallbackToDestructiveMigration().build()
        
        NotificationHelper.createNotificationChannel(this)
        
        // Schedule background updates (runs hourly when WiFi is ON)
        BackgroundUpdateWorker.schedule(this)
        
        com.acesur.faizbul.ui.theme.ThemeManager.init(this)
    }
}

