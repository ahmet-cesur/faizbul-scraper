package com.acesur.faizbul.util

import java.util.Calendar

object HolidayUtils {
    /**
     * List of Turkish public holidays for 2025 and 2026 (Month is 0-indexed in Calendar)
     */
    private val holidays = mapOf(
        2025 to setOf(
            "01-00", // Jan 1: Yılbaşı
            "29-02", // Mar 29: Ramazan Bayramı Arifesi (Half)
            "30-02", // Mar 30: Ramazan Bayramı 1. Gün
            "31-02", // Mar 31: Ramazan Bayramı 2. Gün
            "01-03", // Apr 1: Ramazan Bayramı 3. Gün
            "23-03", // Apr 23: Ulusal Egemenlik ve Çocuk Bayramı
            "01-04", // May 1: Emek ve Dayanışma Günü
            "19-04", // May 19: Atatürk'ü Anma, Gençlik ve Spor Bayramı
            "05-05", // Jun 5: Kurban Bayramı Arifesi (Half)
            "06-05", // Jun 6: Kurban Bayramı 1. Gün
            "07-05", // Jun 7: Kurban Bayramı 2. Gün
            "08-05", // Jun 8: Kurban Bayramı 3. Gün
            "09-05", // Jun 9: Kurban Bayramı 4. Gün
            "15-06", // Jul 15: Demokrasi ve Milli Birlik Günü
            "30-07", // Aug 30: Zafer Bayramı
            "28-09", // Oct 28: Cumhuriyet Bayramı Arifesi (Half)
            "29-09"  // Oct 29: Cumhuriyet Bayramı
        ),
        2026 to setOf(
            "01-00", // Jan 1: Yılbaşı
            "19-02", // Mar 19: Ramazan Bayramı Arifesi (Half)
            "20-02", // Mar 20: Ramazan Bayramı 1. Gün
            "21-02", // Mar 21: Ramazan Bayramı 2. Gün
            "22-02", // Mar 22: Ramazan Bayramı 3. Gün
            "23-03", // Apr 23: Ulusal Egemenlik ve Çocuk Bayramı
            "01-04", // May 1: Emek ve Dayanışma Günü
            "19-04", // May 19: Atatürk'ü Anma, Gençlik ve Spor Bayramı
            "26-04", // May 26: Kurban Bayramı Arifesi (Half)
            "27-04", // May 27: Kurban Bayramı 1. Gün
            "28-04", // May 28: Kurban Bayramı 2. Gün
            "29-04", // May 29: Kurban Bayramı 3. Gün
            "30-04", // May 30: Kurban Bayramı 4. Gün
            "15-06", // Jul 15: Demokrasi ve Milli Birlik Günü
            "30-07", // Aug 30: Zafer Bayramı
            "28-09", // Oct 28: Cumhuriyet Bayramı Arifesi (Half)
            "29-09"  // Oct 29: Cumhuriyet Bayramı
        )
    )

    fun isHoliday(calendar: Calendar): Boolean {
        val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
        if (dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY) return true

        val day = calendar.get(Calendar.DAY_OF_MONTH)
        val month = calendar.get(Calendar.MONTH)
        val year = calendar.get(Calendar.YEAR)

        val yearHolidays = holidays[year] ?: return false
        val key = String.format(java.util.Locale.US, "%02d-%02d", day, month)
        return yearHolidays.contains(key)
    }
    
    fun getHolidayName(calendar: Calendar): String? {
        val day = calendar.get(Calendar.DAY_OF_MONTH)
        val month = calendar.get(Calendar.MONTH)
        val year = calendar.get(Calendar.YEAR)
        
        val key = String.format(java.util.Locale.US, "%02d-%02d", day, month)
        
        return when (year) {
            2025 -> when (key) {
                "01-00" -> "Yılbaşı"
                "29-02" -> "Ramazan Bayramı Arifesi"
                "30-02" -> "Ramazan Bayramı"
                "31-02" -> "Ramazan Bayramı"
                "01-03" -> "Ramazan Bayramı"
                "23-03" -> "Ulusal Egemenlik ve Çocuk Bayramı"
                "01-04" -> "Emek ve Dayanışma Günü"
                "19-04" -> "Atatürk'ü Anma, Gençlik ve Spor Bayramı"
                "05-05" -> "Kurban Bayramı Arifesi"
                "06-05" -> "Kurban Bayramı"
                "07-05" -> "Kurban Bayramı"
                "08-05" -> "Kurban Bayramı"
                "09-05" -> "Kurban Bayramı"
                "15-06" -> "Demokrasi ve Milli Birlik Günü"
                "30-07" -> "Zafer Bayramı"
                "28-09" -> "Cumhuriyet Bayramı Arifesi"
                "29-09" -> "Cumhuriyet Bayramı"
                else -> null
            }
            2026 -> when (key) {
                "01-00" -> "Yılbaşı"
                "19-02" -> "Ramazan Bayramı Arifesi"
                "20-02" -> "Ramazan Bayramı"
                "21-02" -> "Ramazan Bayramı"
                "22-02" -> "Ramazan Bayramı"
                "23-03" -> "Ulusal Egemenlik ve Çocuk Bayramı"
                "01-04" -> "Emek ve Dayanışma Günü"
                "19-04" -> "Atatürk'ü Anma, Gençlik ve Spor Bayramı"
                "26-04" -> "Kurban Bayramı Arifesi"
                "27-04" -> "Kurban Bayramı"
                "28-04" -> "Kurban Bayramı"
                "29-04" -> "Kurban Bayramı"
                "30-04" -> "Kurban Bayramı"
                "15-06" -> "Demokrasi ve Milli Birlik Günü"
                "30-07" -> "Zafer Bayramı"
                "28-09" -> "Cumhuriyet Bayramı Arifesi"
                "29-09" -> "Cumhuriyet Bayramı"
                else -> null
            }
            else -> null
        }
    }
}
