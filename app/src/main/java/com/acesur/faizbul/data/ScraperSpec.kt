package com.acesur.faizbul.data

data class InterestRate(
    val bankName: String,
    val description: String,
    val rate: Double,
    val earnings: Double, // Net
    val grossEarnings: Double = 0.0,
    val taxRate: Double = 0.0,
    val url: String = "",
    val minAmount: Double = 0.0,
    val maxAmount: Double = 999999999.0,
    val minDays: Int = 0,
    val maxDays: Int = 99999,
    val timestamp: Long = 0L,
    val tableJson: String? = null
)

data class BestOffer(
    val bankName: String,
    val rate: Double,
    val minAmount: Double,
    val dayRanges: List<Pair<Int, Int>>,
    val timestamp: Long = 0L,
    val url: String = "",
    val tableJson: String? = null
)

enum class ScraperStatus { WAITING, WORKING, SUCCESS, FAILED }

enum class ScraperError { TIMEOUT, BLOCKED, PARSING_ERROR, NETWORK_ERROR, NO_MATCH }

data class ScraperResultState(
    val spec: ScraperSpec,
    val status: ScraperStatus = ScraperStatus.WAITING,
    val rate: InterestRate? = null,
    val errorMessage: String? = null,
    val errorCode: ScraperError? = null,
    val lastSuccessfulRate: Double? = null,
    val lastSuccessfulTimestamp: Long? = null,
    val cachedTableJson: String? = null,  // Full table JSON for display
    val tableTimestamp: Long? = null,      // When the table was last updated
    val isUsingCachedRate: Boolean = false // True if showing rate from cached table
)

data class ScraperSpec(
    val name: String,
    val url: String,
    val description: String,
    val bankName: String,
    val timeoutMs: Long = 40000L
) {
    companion object {
        val allScrapers = listOf(
            ScraperSpec("Ziraat Bankası", "https://www.ziraatbank.com.tr/tr/bireysel/mevduat/vadeli-hesaplar/vadeli-tl-mevduat-hesapi", "İnternet Şubesi Vadeli TL", "Ziraat Bankası"),
            ScraperSpec("Garanti - Hoş Geldin", "https://www.garantibbva.com.tr/mevduat/hos-geldin-faizi", "Hoş Geldin Faizi", "Garanti BBVA"),
            ScraperSpec("Garanti - Standart", "https://www.garantibbva.com.tr/mevduat/e-vadeli-hesap", "Standart E-Vadeli", "Garanti BBVA"),
            ScraperSpec("Akbank - Tanışma", "https://www.akbank.com/kampanyalar/vadeli-mevduat-tanisma-kampanyasi", "Tanışma Faizi", "Akbank"),
            ScraperSpec("Akbank - Standart", "https://www.akbank.com/mevduat-yatirim/mevduat/vadeli-mevduat-hesaplari/vadeli-mevduat-hesabi", "Standart Vadeli", "Akbank"),
            ScraperSpec("Yapı Kredi - Standart", "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama", "e-Mevduat", "Yapı Kredi"),
            ScraperSpec("Yapı Kredi - Yeni Param", "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama", "Yeni Param (Hoş Geldin)", "Yapı Kredi"),
            ScraperSpec("Halkbank", "https://www.halkbank.com.tr/tr/bireysel/mevduat/mevduat-faiz-oranlari/vadeli-tl-mevduat-faiz-oranlari", "İnternet Vadeli TL", "Halkbank"),
            ScraperSpec("VakıfBank - Tanışma", "https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari", "Tanışma Kampanyası", "VakıfBank"),
            ScraperSpec("VakıfBank - Standart", "https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari", "E-Vadeli Hesabı", "VakıfBank"),
            ScraperSpec("Odeabank", "https://www.odeabank.com.tr/bireysel/mevduat/vadeli-mevduat", "İnternet/Mobil Vadeli", "Odeabank"),
            ScraperSpec("Denizbank", "https://www.denizbank.com/hesap/e-mevduat", "E-Mevduat", "DenizBank"),
            ScraperSpec("Fibabanka", "https://www.fibabanka.com.tr/faiz-ucret-ve-komisyonlar/bireysel-faiz-oranlari/mevduat-faiz-oranlari", "e-Mevduat", "Fibabanka"),
            ScraperSpec("Enpara", "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi", "Vadeli Mevduat", "Enpara"),
            ScraperSpec("İş Bankası", "https://www.isbank.com.tr/vadeli-tl", "İşCep Vadeli TL", "İş Bankası")
        )
    }
}
