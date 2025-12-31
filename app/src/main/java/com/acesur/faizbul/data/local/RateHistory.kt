package com.acesur.faizbul.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "rate_history")
data class RateHistory(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val bankName: String,
    val description: String,
    val rate: Double,
    val amount: Double,
    val duration: Int,
    val timestamp: Long = System.currentTimeMillis()
)

// New entity for storing full rate tables
@Entity(tableName = "rate_tables")
data class RateTable(
    @PrimaryKey val scraperName: String,
    val bankName: String,
    val tableJson: String, // JSON representation of the full table
    val timestamp: Long = System.currentTimeMillis()
)

// Entity for tracking scraper failures per day
@Entity(
    tableName = "scraper_failures",
    primaryKeys = ["scraperName", "dateKey"]
)
data class ScraperFailure(
    val scraperName: String,
    val dateKey: String, // Format: "yyyy-MM-dd"
    val failureCount: Int = 0,
    val lastFailureTimestamp: Long = System.currentTimeMillis()
)

// Data class for table structure (not a Room entity, just for serialization)
data class RateTableData(
    val headers: List<String>, // Amount brackets: e.g., ["100.000 - 249.999", "250.000+"]
    val rows: List<RateTableRow>
)

data class RateTableRow(
    val durationLabel: String, // e.g., "32 - 91 gün"
    val minDays: Int,
    val maxDays: Int,
    val rates: List<Double> // Rates corresponding to each header/amount bracket
)

data class AmountBracket(
    val label: String,
    val minAmount: Double,
    val maxAmount: Double
)

@Dao
interface RateHistoryDao {
    @Query("SELECT * FROM rate_history ORDER BY timestamp DESC")
    fun getAllHistory(): Flow<List<RateHistory>>

    @Insert
    suspend fun insert(history: RateHistory)

    @Query("SELECT * FROM rate_history WHERE bankName = :bankName AND description = :description ORDER BY timestamp DESC LIMIT 1")
    suspend fun getLastRate(bankName: String, description: String): RateHistory?

    @Query("DELETE FROM rate_history")
    suspend fun clearAll()
}

@Dao
interface RateTableDao {
    @Query("SELECT * FROM rate_tables WHERE scraperName = :scraperName")
    suspend fun getTable(scraperName: String): RateTable?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(table: RateTable)

    @Query("SELECT * FROM rate_tables")
    fun getAllTables(): Flow<List<RateTable>>
    
    @Query("SELECT * FROM rate_tables")
    suspend fun getAllTablesOnce(): List<RateTable>
    
    @Query("DELETE FROM rate_tables")
    suspend fun clearAllTables()
    
    // Get scraper names that haven't been updated today
    @Query("SELECT scraperName FROM rate_tables WHERE timestamp < :todayStart")
    suspend fun getStaleTableScraperNames(todayStart: Long): List<String>
    
    // Get all scraper names in the database
    @Query("SELECT scraperName FROM rate_tables")
    suspend fun getAllScraperNames(): List<String>
}

@Dao
interface ScraperFailureDao {
    @Query("SELECT * FROM scraper_failures WHERE scraperName = :scraperName AND dateKey = :dateKey")
    suspend fun getFailure(scraperName: String, dateKey: String): ScraperFailure?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(failure: ScraperFailure)
    
    @Query("SELECT failureCount FROM scraper_failures WHERE scraperName = :scraperName AND dateKey = :dateKey")
    suspend fun getFailureCount(scraperName: String, dateKey: String): Int?
    
    // Clear old failure records (older than today)
    @Query("DELETE FROM scraper_failures WHERE dateKey < :todayKey")
    suspend fun clearOldFailures(todayKey: String)
    
    // Get all scrapers that have failed 5+ times today
    @Query("SELECT scraperName FROM scraper_failures WHERE dateKey = :dateKey AND failureCount >= 5")
    suspend fun getBlockedScrapers(dateKey: String): List<String>

    @Query("SELECT scraperName FROM scraper_failures WHERE dateKey = :dateKey AND failureCount >= :limit")
    suspend fun getBlockedScrapersWithLimit(dateKey: String, limit: Int): List<String>
}

@Database(
    entities = [RateHistory::class, RateTable::class, ScraperFailure::class], 
    version = 3, 
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun rateHistoryDao(): RateHistoryDao
    abstract fun rateTableDao(): RateTableDao
    abstract fun scraperFailureDao(): ScraperFailureDao
}

