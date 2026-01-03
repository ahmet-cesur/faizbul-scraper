# FaizBul Scrapers Reference

This document contains all bank scraper configurations for quick reference and recovery.

---

## Quick Reference Table

| Bank Name | Scraper Name | Color | Method |
|-----------|--------------|-------|--------|
| Ziraat Bankası | Ziraat Bankası | Red (#D32F2F) | `getZiraatJs` |
| Garanti BBVA | Garanti - Hoş Geldin | Green (#00B140) | Default (Garanti style) |
| Garanti BBVA | Garanti - Standart | Green (#00B140) | Default (Garanti style) |
| Enpara.com | Enpara | Purple (#86278D) | `getEnparaJs` |
| Akbank | Akbank - Tanışma | Red (#DC1D1D) | `getAkbankJs` |
| Akbank | Akbank - Standart | Red (#DC1D1D) | `getAkbankJs` |
| Yapı Kredi | Yapı Kredi - Standart | Blue (#0050A0) | `getYapiKrediStandardJs` |
| Yapı Kredi | Yapı Kredi - Yeni Param | Blue (#0050A0) | `getYapiKrediWelcomeJs` |
| İş Bankası | İş Bankası | Blue (#1C4587) | `getIsBankasiJs` |
| Halkbank | Halkbank | Blue (#1976D2) | `getHalkbankJs` |
| VakıfBank | VakıfBank - Tanışma | Gold (#D4AF37) | `getVakifbankJs` |
| VakıfBank | VakıfBank - Standart | Gold (#D4AF37) | `getVakifbankEVadeliJs` |
| Alternatif Bank | Alternatif Bank | Maroon (#9E0D49) | `getAlternatifBankJs` |
| Odeabank | Odeabank | Black (#1A1A1A) | `getOdeabankJs` |
| DenizBank | Denizbank | Blue (#0033A0) | `getDenizbankJs` |
| Fibabanka | Fibabanka | Navy (#003D7C) | `getFibabankaJs` |

---

## Detailed Scraper Configurations

### 1. Ziraat Bankası
- **URL**: `https://www.ziraatbank.com.tr/tr/bireysel/mevduat/vadeli-hesaplar/vadeli-tl-mevduat-hesaplari/vadeli-tl-mevduat-hesabi`
- **Description**: İnternet Şubesi Vadeli TL
- **Bank Name**: Ziraat Bankası
- **Method**: `ScraperScripts.getZiraatJs(amount, days, description)`
- **Color**: ZiraatRed (#D32F2F)
- **Notes**:
  - Click accordion button `#accordion1` to expand
  - Select "İnternet Şube Oranları" radio button (`rdIntBranchVadeliTL`)
  - Table uses tbody only, no thead - first row is header
  - Skip tables with < 4 columns (small amounts table)
  - Standard table: Vade (rows) x Amount tiers (columns)

### 2. Garanti BBVA - Hoş Geldin
- **URL**: `https://www.garantibbva.com.tr/mevduat/hos-geldin-faizi`
- **Description**: Hoş Geldin Faizi
- **Bank Name**: Garanti BBVA
- **Method**: Default scraper (no customJs)
- **Color**: GarantiGreen (#00B140)
- **Notes**:
  - Uses default Garanti-style table parser
  - Standard table: Vade (rows) x Amount tiers (columns)

### 3. Garanti BBVA - Standart
- **URL**: `https://www.garantibbva.com.tr/mevduat/e-vadeli-hesap`
- **Description**: Standart E-Vadeli
- **Bank Name**: Garanti BBVA
- **Method**: Default scraper (no customJs)
- **Color**: GarantiGreen (#00B140)
- **Notes**:
  - Uses default Garanti-style table parser
  - Standard table: Vade (rows) x Amount tiers (columns)

### 4. Enpara
- **URL**: `https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi`
- **Description**: Vadeli Mevduat
- **Bank Name**: Enpara.com
- **Method**: `ScraperScripts.getEnparaJs(amount, days, description)`
- **Color**: EnparaPurple (#86278D)
- **Notes**:
  - Wait for rate table to load dynamically
  - Standard table: Vade (rows) x Amount tiers (columns)

### 5. Akbank - Tanışma
- **URL**: `https://www.akbank.com/kampanyalar/vadeli-mevduat-tanisma-kampanyasi`
- **Description**: Tanışma Faizi
- **Bank Name**: Akbank
- **Method**: `ScraperScripts.getAkbankJs(amount, days, description)`
- **Color**: AkbankRed (#DC1D1D)
- **Notes**:
  - Promotional welcome rates
  - Standard table: Vade (rows) x Amount tiers (columns)

### 6. Akbank - Standart
- **URL**: `https://www.akbank.com/mevduat-yatirim/mevduat/vadeli-mevduat-hesaplari/vadeli-mevduat-hesabi`
- **Description**: Standart Vadeli
- **Bank Name**: Akbank
- **Method**: `ScraperScripts.getAkbankJs(amount, days, description)`
- **Color**: AkbankRed (#DC1D1D)
- **Notes**:
  - Regular deposit rates
  - Standard table: Vade (rows) x Amount tiers (columns)

### 7. Yapı Kredi - Standart
- **URL**: `https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama`
- **Description**: e-Mevduat
- **Bank Name**: Yapı Kredi
- **Method**: `ScraperScripts.getYapiKrediStandardJs`
- **Color**: YapiKrediBlue (#0050A0)
- **Notes**:
  - Click "tıklayınız" link to reveal modal with rates
  - Extract from modal table

### 8. Yapı Kredi - Yeni Param
- **URL**: `https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama`
- **Description**: Yeni Param (Hoş Geldin)
- **Bank Name**: Yapı Kredi
- **Method**: `ScraperScripts.getYapiKrediWelcomeJs`
- **Color**: YapiKrediBlue (#0050A0)
- **Notes**:
  - Click "tıklayınız" link to reveal modal with rates
  - Extract welcome/promotional rates from modal

### 9. İş Bankası
- **URL**: `https://www.isbank.com.tr/vadeli-tl`
- **Description**: İşCep Vadeli TL
- **Bank Name**: İş Bankası
- **Method**: `ScraperScripts.getIsBankasiJs(amount, days, description)`
- **Color**: IsBankasiBlue (#1C4587)
- **Notes**:
  - Uses thead for headers and tbody for data
  - Extract value from `span.content` elements (responsive table)
  - Standard table: Vade (rows) x Amount tiers (columns)

### 10. Halkbank
- **URL**: `https://www.halkbank.com.tr/tr/bireysel/mevduat/mevduat-faiz-oranlari/vadeli-tl-mevduat-faiz-oranlari`
- **Description**: İnternet Vadeli TL
- **Bank Name**: Halkbank
- **Method**: `ScraperScripts.getHalkbankJs(amount, days, description)`
- **Color**: HalkbankBlue (#1976D2)
- **Notes**:
  - Uses select2 jQuery dropdown
  - Select "İnternet/Mobil Şube" rates: `$('#type').val('1').trigger('change')`
  - 7 columns with amount tiers
  - Standard table: Vade (rows) x Amount tiers (columns)

### 11. VakıfBank - Tanışma
- **URL**: `https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari`
- **Description**: Tanışma Kampanyası
- **Bank Name**: VakıfBank
- **Method**: `ScraperScripts.getVakifbankJs(amount, days, description)`
- **Color**: VakifbankGold (#D4AF37)
- **Notes**:
  - Click "Tanışma Kampanyası" button (`a.btn` with matching text)
  - **TRANSPOSED TABLE**: Amounts in ROWS, Durations in COLUMNS
  - First column is "Tutar Aralığı" (amount ranges)
  - Header row contains duration ranges (32-35 gün, etc.)
  - Promotional/welcome rates

### 12. VakıfBank - Standart
- **URL**: `https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari`
- **Description**: E-Vadeli Hesabı
- **Bank Name**: VakıfBank
- **Method**: `ScraperScripts.getVakifbankEVadeliJs(amount, days, description)`
- **Color**: VakifbankGold (#D4AF37)
- **Notes**:
  - Click "E-Vadeli Hesabı" button (`a.btn` with matching text)
  - **TRANSPOSED TABLE**: Same structure as Tanışma
  - Regular non-promotional rates

### 13. Alternatif Bank
- **URL**: `https://www.alternatifbank.com.tr/bilgi-merkezi/faiz-oranlari#mevduat`
- **Description**: E-Mevduat TRY
- **Bank Name**: Alternatif Bank
- **Method**: `ScraperScripts.getAlternatifBankJs(amount, days, description)`
- **Color**: AlternatifMaroon (#9E0D49)
- **Notes**:
  - Page has 34 tables (many hidden), scraper finds visible one with "VADE" header
  - Standard table: Vade (rows) x Amount tiers (columns)
  - Amount headers: "999.99-10000", "10000-50000", etc.
  - No button click required, table is visible by default

### 14. Odeabank
- **URL**: `https://www.odeabank.com.tr/bireysel/mevduat/vadeli-mevduat`
- **Description**: İnternet/Mobil Vadeli
- **Bank Name**: Odeabank
- **Method**: `ScraperScripts.getOdeabankJs(amount, days, description)`
- **Color**: OdeabankBlack (#1A1A1A)
- **Notes**:
  - Click accordion `#accordion-2` or button with text "İnternet/Mobil Şube Vadeli"
  - 14 tables on page, finds visible one with "VADE" header
  - Standard table: Vade (rows) x Amount tiers (columns)
  - 7 amount tiers from 1,000 to 5,000,000 TL

### 15. DenizBank
- **URL**: `https://www.denizbank.com/hesap/e-mevduat`
- **Description**: E-Mevduat
- **Bank Name**: DenizBank
- **Method**: `ScraperScripts.getDenizbankJs(amount, days, description)`
- **Color**: DenizbankBlue (#0033A0)
- **Notes**:
  - TL interest rate table is active by default.
  - Page uses a dual-header structure; scraper searches for the row containing amount ranges.
  - Standard table: Vade (rows) x Amount tiers (columns).
  - Handles various duration labels like "32-45 gün".
  
### 16. Fibabanka
- **URL**: `https://www.fibabanka.com.tr/faiz-ucret-ve-komisyonlar/bireysel-faiz-oranlari/mevduat-faiz-oranlari`
- **Description**: e-Mevduat
- **Bank Name**: Fibabanka
- **Method**: `ScraperScripts.getFibabankaJs(amount, days, description)`
- **Color**: FibabankaNavy (#003D7C)
- **Notes**:
  - Click accordion header `h2.accordion__title` containing "e-Mevduat" to reveal data
  - Extracts from table within `.fiba-long-table` container
  - Standard table: Vade (rows) x Amount tiers (columns)
  - Result card uses `FibabankaNavy` (#003D7C) in light mode and `FibabankaNavyDark` (#818CF8) in dark mode

---

## Common Scraper Patterns

### Standard Table (Most Banks)
```
| Vade (Days)  | Amount Tier 1 | Amount Tier 2 | Amount Tier 3 |
|--------------|---------------|---------------|---------------|
| 32-45 gün    | 35.00%        | 36.00%        | 37.00%        |
| 46-91 gün    | 34.00%        | 35.00%        | 36.00%        |
```
- Rows: Duration ranges
- Columns: Amount tiers
- Find column by amount, find row by duration

### Transposed Table (VakıfBank)
```
| Tutar Aralığı    | 32-35 gün | 36-45 gün | 46-91 gün |
|------------------|-----------|-----------|-----------|
| 50,000-249,999   | 40.00%    | 39.00%    | 38.00%    |
| 250,000-999,999  | 41.00%    | 40.00%    | 39.00%    |
```
- Rows: Amount ranges
- Columns: Duration tiers
- Find row by amount, find column by duration

---

## Utility JavaScript Functions

### smartParseNumberJs
Handles locale-agnostic decimal parsing:
- "5.000,00" (Turkish) → 5000.00
- "5,000.00" (English) → 5000.00
- Uses last separator with 2 digits after as decimal point

### parseDurationJs
Parses various duration formats:
- "32 - 45 gün" → { min: 32, max: 45 }
- "3 ay" → { min: 90, max: 90 }
- "1 yıl" → { min: 365, max: 365 }

### checkBotDetectionJs
Detects bot protection:
- Cloudflare challenge
- CAPTCHA presence
- Block messages

---

## Technical Rules & Best Practices

### Number Parsing
- **ALWAYS** use the heuristic-based `smartParseNumberJs` for both amount ranges and interest rates.
- **REASON**: Bank websites often have inconsistent or "wrong" thousands/decimal separators. A simple regex like `.replace(/\./g, '')` is too dangerous as it might remove a decimal point if the site incorrectly uses dots for decimals in amounts.
- **RULE**: The `smartParseNumberJs` utility is designed to handle these inconsistencies by identifying the true decimal separator based on its position (last separator with 1-2 digits after it).
- **Previous Solution**: This complex logic was specifically implemented to solve parsing failures across multiple banks (Ziraat, Odeabank, etc.) and must not be simplified.

---

## Color Definitions (Color.kt)

```kotlin
val GarantiGreen = Color(0xFF00B140)
val EnparaPurple = Color(0xFF86278D)
val AkbankRed = Color(0xFFDC1D1D)
val YapiKrediBlue = Color(0xFF0050A0)
val IsBankasiBlue = Color(0xFF1C4587)
val ZiraatRed = Color(0xFFD32F2F)
val HalkbankBlue = Color(0xFF1976D2)
val VakifbankGold = Color(0xFFD4AF37)
val AlternatifMaroon = Color(0xFF9E0D49)
val OdeabankBlack = Color(0xFF1A1A1A)
val DenizbankBlue = Color(0xFF0033A0)
val FibabankaNavy = Color(0xFF003D7C)
```

---

## File Locations

- **Scraper Scripts**: `app/src/main/java/com/acesur/faizbul/data/ScraperSpec.kt`
- **Scraper List**: `app/src/main/java/com/acesur/faizbul/ui/viewmodels/ResultViewModel.kt`
- **Color Mappings**: `app/src/main/java/com/acesur/faizbul/ui/screens/ResultPage.kt` (ResultCard function)
- **Color Definitions**: `app/src/main/java/com/acesur/faizbul/ui/theme/Color.kt`

---

*Last Updated: 2026-01-03*
