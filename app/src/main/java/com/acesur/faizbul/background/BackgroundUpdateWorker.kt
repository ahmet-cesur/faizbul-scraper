package com.acesur.faizbul.background

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import androidx.work.*
import com.acesur.faizbul.FaizBulApp
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

/**
 * WorkManager Worker that checks if background updates are needed and starts the service.
 * 
 * Runs every 1 hour and checks:
 * - If WiFi is connected
 * - If there are stale tables that need updating
 * - If scrapers haven't exceeded daily failure limit
 */
class BackgroundUpdateWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "BackgroundUpdateWorker"
        const val WORK_NAME = "background_rate_update"

        /**
         * Schedule periodic background updates.
         * Runs every 1 hour when device is connected.
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.UNMETERED) // WiFi only
                .setRequiresBatteryNotLow(true)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<BackgroundUpdateWorker>(
                1, TimeUnit.HOURS, // Repeat interval
                15, TimeUnit.MINUTES // Flex interval
            )
                .setConstraints(constraints)
                .setInitialDelay(15, TimeUnit.MINUTES) // Don't run immediately on app start
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP, // Keep existing if already scheduled
                workRequest
            )
            
            Log.d(TAG, "Background update work scheduled")
        }

        /**
         * Cancel scheduled background updates.
         */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Background update work cancelled")
        }
        
        /**
         * Trigger an immediate one-time update check.
         */
        fun triggerNow(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.UNMETERED)
                .build()
                
            val workRequest = OneTimeWorkRequestBuilder<BackgroundUpdateWorker>()
                .setConstraints(constraints)
                .build()
                
            WorkManager.getInstance(context).enqueue(workRequest)
            Log.d(TAG, "One-time background update triggered")
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "Background update worker started")
        
        // Holiday and Weekend check: Only run on workdays
        if (com.acesur.faizbul.util.HolidayUtils.isHoliday(Calendar.getInstance())) {
            Log.d(TAG, "Today is a holiday or weekend, skipping background update")
            return Result.success()
        }

        // Time window check: Only run between 1 PM (13:00) and 10 PM (22:xx)
        val currentHour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        if (currentHour < 13 || currentHour > 22) {
            Log.d(TAG, "Outside operating window (13:00-22:59), skipping update. Current hour: $currentHour")
            return Result.success()
        }
        
        // Double-check WiFi (WorkManager constraints should handle this, but verify)
        if (!isWifiConnected()) {
            Log.d(TAG, "WiFi not connected, skipping update")
            return Result.success()
        }
        
        // Check if there are stale tables that need updating
        if (!hasStaleScrapers()) {
            Log.d(TAG, "No stale scrapers or reached failure limit, skipping update")
            return Result.success()
        }
        
        // BackgroundUpdateService is disabled to prioritize Server-Side scraping
        // try {
        //     BackgroundUpdateService.startService(context)
        //     Log.d(TAG, "Started BackgroundUpdateService")
        // } catch (e: Exception) {
        //     Log.e(TAG, "Failed to start BackgroundUpdateService", e)
        //     return Result.failure()
        // }
        
        Log.d(TAG, "Background local scraping is disabled. Use GitHub Actions for updates.")
        
        return Result.success()
    }

    private fun isWifiConnected(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }

    private suspend fun hasStaleScrapers(): Boolean {
        val db = FaizBulApp.database
        val tableDao = db.rateTableDao()
        val failureDao = db.scraperFailureDao()
        
        val todayKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val todayStart = getTodayStartMillis()
        
        // Get stale scrapers
        val staleScraperNames = tableDao.getStaleTableScraperNames(todayStart).toMutableSet()
        
        // Check for scrapers that don't exist in the database
        val existingScraperNames = tableDao.getAllScraperNames()
        val allScraperNames = listOf(
            "garanti_e_mevduat", "garanti_tanisma", "enpara", "akbank",
            "yapikredi_standard", "yapikredi_welcome", "isbank", "ziraat"
        )
        allScraperNames.forEach { name ->
            if (!existingScraperNames.contains(name)) {
                staleScraperNames.add(name)
            }
        }
        
        // Remove blocked scrapers (failed 10+ times today - upped from 5 for 1pm-10pm hourly retries)
        val blockedScrapers = failureDao.getBlockedScrapersWithLimit(todayKey, 10).toSet()
        staleScraperNames.removeAll(blockedScrapers)
        
        return staleScraperNames.isNotEmpty()
    }

    private fun getTodayStartMillis(): Long {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        return calendar.timeInMillis
    }
}
