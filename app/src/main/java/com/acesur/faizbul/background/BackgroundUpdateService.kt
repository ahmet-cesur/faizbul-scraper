package com.acesur.faizbul.background

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.NotificationCompat
import com.acesur.faizbul.FaizBulApp
import com.acesur.faizbul.MainActivity
import com.acesur.faizbul.R
import com.acesur.faizbul.data.ScraperScripts
import com.acesur.faizbul.data.ScraperSpec
import com.acesur.faizbul.data.local.RateTable
import com.acesur.faizbul.data.local.ScraperFailure
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

/**
 * Foreground Service for background table updates.
 * Uses WebView to scrape interest rate tables when app is not in use.
 * 
 * Key features:
 * - Only runs when WiFi is available (checked by WorkManager before starting)
 * - Updates stale tables (not updated today) or empty tables
 * - Stops retrying a scraper after 10 failures per day (upped for 1pm-10pm hourly retries)
 * - Each update cycle tries each stale scraper once (no infinite loops)
 */
class BackgroundUpdateService : Service() {

    companion object {
        private const val TAG = "BackgroundUpdateService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "background_update_channel"
        
        // Default amount and duration for background scraping
        // (tables are amount/duration agnostic, they contain all brackets)
        private const val DEFAULT_AMOUNT = 100000.0
        private const val DEFAULT_DAYS = 32
        
        fun startService(context: Context) {
            val intent = Intent(context, BackgroundUpdateService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val mainHandler = Handler(Looper.getMainLooper())
    private var currentWebView: WebView? = null
    private var updateQueue = mutableListOf<ScraperSpec>()
    private var isProcessing = false

    // All available scrapers
    private val allScrapers = listOf(
        ScraperSpec(
            name = "garanti_e_mevduat",
            url = "https://www.garantibbva.com.tr/tr/faiz-oranlari/mevduat-faiz-oranlari",
            description = "e-Mevduat",
            bankName = "Garanti BBVA"
        ),
        ScraperSpec(
            name = "garanti_tanisma",
            url = "https://www.garantibbva.com.tr/tr/faiz-oranlari/mevduat-faiz-oranlari",
            description = "Tanışma Mevduat",
            bankName = "Garanti BBVA"
        ),
        ScraperSpec(
            name = "enpara",
            url = "https://www.enpara.com/vadeli-faiz-oranlari.aspx",
            description = "Vadeli Mevduat",
            bankName = "Enpara.com",
            customJs = ScraperScripts::getEnparaJs
        ),
        ScraperSpec(
            name = "akbank",
            url = "https://www.akbank.com/tr-tr/genel/Sayfalar/faiz-oranlari.aspx",
            description = "Tanışma Faizi",
            bankName = "Akbank",
            customJs = ScraperScripts::getAkbankJs
        ),
        ScraperSpec(
            name = "yapikredi_standard",
            url = "https://www.yapikredi.com.tr/yardim-destek/faiz-oranlari/Mevduat-faiz-orani",
            description = "e-Mevduat",
            bankName = "Yapı Kredi",
            customJs = ScraperScripts::getYapiKrediStandardJs
        ),
        ScraperSpec(
            name = "yapikredi_welcome",
            url = "https://www.yapikredi.com.tr/yardim-destek/faiz-oranlari/hosgeldin-faiz-orani",
            description = "Yeni Param (Hoş Geldin)",
            bankName = "Yapı Kredi",
            customJs = ScraperScripts::getYapiKrediWelcomeJs
        ),
        ScraperSpec(
            name = "isbank",
            url = "https://www.isbank.com.tr/vadeli-tl",
            description = "İşCep Vadeli TL",
            bankName = "İş Bankası",
            customJs = ScraperScripts::getIsBankasiJs
        ),
        ScraperSpec(
            name = "ziraat",
            url = "https://www.ziraatbank.com.tr/tr/bireysel/mevduat/vadeli-hesaplar/vadeli-tl-mevduat-hesaplari/vadeli-tl-mevduat-hesabi",
            description = "İnternet Şubesi Vadeli TL",
            bankName = "Ziraat Bankası",
            customJs = ScraperScripts::getZiraatJs
        )
    )

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification("Faiz oranları güncelleniyor..."))
        
        serviceScope.launch {
            try {
                performBackgroundUpdate()
            } catch (e: Exception) {
                Log.e(TAG, "Error during background update", e)
            } finally {
                stopSelf()
            }
        }
        
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        serviceScope.cancel()
        mainHandler.post {
            currentWebView?.stopLoading()
            currentWebView?.destroy()
            currentWebView = null
        }
        super.onDestroy()
    }

    private suspend fun performBackgroundUpdate() {
        val db = FaizBulApp.database
        val tableDao = db.rateTableDao()
        val failureDao = db.scraperFailureDao()
        
        val todayKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val todayStart = getTodayStartMillis()
        
        // Clean up old failure records
        failureDao.clearOldFailures(todayKey)
        
        // Get scrapers that need updating
        val staleScraperNames = tableDao.getStaleTableScraperNames(todayStart).toMutableSet()
        val existingScraperNames = tableDao.getAllScraperNames()
        
        // Add scrapers that don't exist in the database yet
        allScrapers.forEach { spec ->
            if (!existingScraperNames.contains(spec.name)) {
                staleScraperNames.add(spec.name)
            }
        }
        
        // Remove scrapers that have failed 10+ times today
        val blockedScrapers = failureDao.getBlockedScrapersWithLimit(todayKey, 10).toSet()
        staleScraperNames.removeAll(blockedScrapers)
        
        if (staleScraperNames.isEmpty()) {
            Log.d(TAG, "No scrapers need updating")
            return
        }
        
        Log.d(TAG, "Scrapers to update: $staleScraperNames")
        
        // Build queue of scrapers to update
        updateQueue = allScrapers.filter { it.name in staleScraperNames }.toMutableList()
        
        // Process scrapers one by one
        processNextScraper()
        
        // Wait for all scrapers to complete
        while (updateQueue.isNotEmpty() || isProcessing) {
            delay(1000)
        }
        
        Log.d(TAG, "Background update completed")
    }

    private fun processNextScraper() {
        if (updateQueue.isEmpty()) {
            isProcessing = false
            return
        }
        
        isProcessing = true
        val scraper = updateQueue.removeAt(0)
        
        Log.d(TAG, "Processing scraper: ${scraper.name}")
        updateNotification("Güncelleniyor: ${scraper.bankName}")
        
        mainHandler.post {
            runScraper(scraper)
        }
    }

    private fun runScraper(scraper: ScraperSpec) {
        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
        }
        currentWebView = webView
        
        val timeoutRunnable = Runnable {
            Log.w(TAG, "Timeout for ${scraper.name}")
            handleScraperResult(scraper, null, null)
        }
        mainHandler.postDelayed(timeoutRunnable, scraper.timeoutMs)
        
        webView.addJavascriptInterface(
            BackgroundJsInterface(scraper.name) { tableJson ->
                mainHandler.removeCallbacks(timeoutRunnable)
                handleScraperResult(scraper, tableJson, null)
            },
            "Android"
        )
        
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val jsCode = scraper.customJs?.invoke(DEFAULT_AMOUNT, DEFAULT_DAYS) 
                    ?: getDefaultJs(scraper)
                view?.evaluateJavascript(jsCode, null)
            }
            
            override fun onReceivedError(
                view: WebView?,
                request: android.webkit.WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    mainHandler.removeCallbacks(timeoutRunnable)
                    handleScraperResult(scraper, null, "Network error")
                }
            }
        }
        
        webView.loadUrl(scraper.url)
    }

    private fun handleScraperResult(scraper: ScraperSpec, tableJson: String?, error: String?) {
        serviceScope.launch {
            val db = FaizBulApp.database
            val todayKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            
            if (tableJson != null) {
                // Success - save the table
                Log.d(TAG, "Success for ${scraper.name}")
                db.rateTableDao().insertOrUpdate(
                    RateTable(
                        scraperName = scraper.name,
                        bankName = scraper.bankName,
                        tableJson = tableJson,
                        timestamp = System.currentTimeMillis()
                    )
                )
            } else {
                // Failure - increment failure count
                Log.w(TAG, "Failure for ${scraper.name}: $error")
                val currentFailure = db.scraperFailureDao().getFailure(scraper.name, todayKey)
                val newCount = (currentFailure?.failureCount ?: 0) + 1
                db.scraperFailureDao().insertOrUpdate(
                    ScraperFailure(
                        scraperName = scraper.name,
                        dateKey = todayKey,
                        failureCount = newCount,
                        lastFailureTimestamp = System.currentTimeMillis()
                    )
                )
            }
            
            // Clean up WebView
            mainHandler.post {
                currentWebView?.stopLoading()
                currentWebView?.destroy()
                currentWebView = null
                
                // Process next scraper
                processNextScraper()
            }
        }
    }

    private fun getDefaultJs(scraper: ScraperSpec): String {
        // Default Garanti-style scraper
        return """
            (function() {
                try {
                    var amount = $DEFAULT_AMOUNT;
                    var duration = $DEFAULT_DAYS;
                    
                    function parseAmount(txt) {
                        var val = txt.toLowerCase().replace(/\./g, '').replace(/,/g, '.').replace('tl', '').replace(' ', '').trim();
                        if (val.indexOf('milyon') > -1) return parseFloat(val.replace('milyon', '')) * 1000000;
                        if (val.indexOf('bin') > -1) return parseFloat(val.replace('bin', '')) * 1000;
                        return parseFloat(val);
                    }
                    
                    function parseDurationText(durTxt) {
                        var txt = durTxt.toLowerCase();
                        if (txt.indexOf('ay') > -1 && txt.indexOf('gün') === -1) {
                            var monthMatch = txt.match(/(\d+)\s*ay/);
                            if (monthMatch) {
                                var months = parseInt(monthMatch[1]);
                                return { min: months * 30 - 2, max: months * 30 + 2 };
                            }
                        }
                        var nums = txt.match(/\d+/g);
                        if (nums && nums.length >= 2) {
                            return { min: parseInt(nums[0]), max: parseInt(nums[1]) };
                        } else if (nums && nums.length === 1) {
                            var singleDay = parseInt(nums[0]);
                            if (txt.indexOf('ve üzeri') > -1 || txt.indexOf('+') > -1) {
                                return { min: singleDay, max: 99999 };
                            }
                            return { min: singleDay, max: singleDay };
                        }
                        return null;
                    }

                    function extractTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t];
                            var rows = table.rows;
                            if (!rows || rows.length < 2) continue;
                            
                            var headerRow = rows[0];
                            if (headerRow.innerText.indexOf('Vade') === -1 && headerRow.innerText.indexOf('Gün') === -1) continue;
                            
                            var headers = [];
                            for (var i = 1; i < headerRow.cells.length; i++) {
                                var txt = headerRow.cells[i].innerText.trim();
                                var headerObj = { label: txt, minAmount: null, maxAmount: null };
                                if (txt.indexOf('-') > -1) {
                                    var parts = txt.split('-');
                                    headerObj.minAmount = parseAmount(parts[0]);
                                    headerObj.maxAmount = parseAmount(parts[1]);
                                } else if (txt.indexOf('+') > -1 || txt.toLowerCase().indexOf('üzeri') > -1) {
                                    headerObj.minAmount = parseAmount(txt.replace('+', '').replace(/üzeri/gi, ''));
                                    headerObj.maxAmount = 999999999;
                                }
                                headers.push(headerObj);
                            }
                            
                            var tableRows = [];
                            for (var r = 1; r < rows.length; r++) {
                                var row = rows[r];
                                var cells = row.cells;
                                if (cells.length < 2) continue;
                                
                                var durTxt = cells[0].innerText.trim();
                                var parsed = parseDurationText(durTxt);
                                
                                var rowRates = [];
                                for (var c = 1; c < cells.length; c++) {
                                    var rateStr = cells[c].innerText.replace('%', '').replace(',', '.').trim();
                                    var rate = parseFloat(rateStr);
                                    rowRates.push(isNaN(rate) ? null : rate);
                                }
                                
                                tableRows.push({
                                    label: durTxt,
                                    minDays: parsed ? parsed.min : null,
                                    maxDays: parsed ? parsed.max : null,
                                    rates: rowRates
                                });
                            }
                            
                            if (tableRows.length > 0) {
                                var tableJson = JSON.stringify({ headers: headers, rows: tableRows });
                                Android.sendTable(tableJson);
                                return true;
                            }
                        }
                        return false;
                    }
                    
                    var attempts = 0;
                    var interval = setInterval(function() {
                        if (extractTable()) { 
                            clearInterval(interval); 
                        } else if (++attempts > 40) { 
                            clearInterval(interval);
                            Android.sendTable(null);
                        }
                    }, 500);
                } catch(e) { Android.log("Error: " + e.message); }
            })();
        """.trimIndent()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Arka Plan Güncellemeleri",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Faiz oranları arka planda güncelleniyor"
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(text: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Faiz Bul")
            .setContentText(text)
            .setSmallIcon(R.drawable.app_logo)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, createNotification(text))
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

/**
 * JavaScript interface for background WebView scraping
 */
class BackgroundJsInterface(
    private val scraperName: String,
    private val onResult: (String?) -> Unit
) {
    private var hasResponded = false
    
    // Check if this is a calculator-based bank (returns single rates, not tables)
    // Validate table size - must be at least 3x3 for all banks
    private fun isValidTableSize(tableJson: String?): Boolean {
        if (tableJson == null) return false
        return try {
            val json = org.json.JSONObject(tableJson)
            val headers = json.getJSONArray("headers")
            val rows = json.getJSONArray("rows")
            headers.length() >= 3 && rows.length() >= 3
        } catch (e: Exception) {
            false
        }
    }
    
    @android.webkit.JavascriptInterface
    fun sendTable(tableJson: String?) {
        if (!hasResponded) {
            hasResponded = true
            if (isValidTableSize(tableJson)) {
                onResult(tableJson)
            } else {
                Log.w("BackgroundScraper", "[$scraperName] Table rejected: invalid size")
                onResult(null)
            }
        }
    }
    
    @android.webkit.JavascriptInterface
    fun sendRateWithTable(rate: Double, description: String, bankName: String, tableJson: String) {
        if (!hasResponded) {
            hasResponded = true
            if (isValidTableSize(tableJson)) {
                onResult(tableJson)
            } else {
                Log.w("BackgroundScraper", "[$scraperName] Table rejected: invalid size")
                onResult(null)
            }
        }
    }
    
    @android.webkit.JavascriptInterface
    fun sendRate(rate: Double, description: String, bankName: String) {
        // No table data, treat as failure
        if (!hasResponded) {
            hasResponded = true
            onResult(null)
        }
    }
    
    @android.webkit.JavascriptInterface
    fun log(message: String) {
        Log.d("BackgroundScraper", "[$scraperName] $message")
    }
}

