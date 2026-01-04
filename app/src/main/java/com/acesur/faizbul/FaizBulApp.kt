package com.acesur.faizbul

import android.app.Application
import androidx.room.Room
import com.acesur.faizbul.data.local.AppDatabase

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
        
        com.acesur.faizbul.ui.theme.ThemeManager.init(this)
        com.acesur.faizbul.util.AdPrefs.init(this)
        com.acesur.faizbul.util.DevPrefs.init(this)
    }
}

