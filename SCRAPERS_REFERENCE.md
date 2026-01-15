# FaizBul Scrapers Reference

This document contains all bank scraper configurations for quick reference and recovery.

---

## Active Scrapers Table

| Bank Name | Scraper Name | Color | Scraper File |
|-----------|--------------|-------|--------|
| Ziraat Bankası | Ziraat Bankası | Red (#D32F2F) | `ziraat.js` |
| Garanti BBVA | Garanti - Hoş Geldin | Green (#00B140) | `garanti-hosgeldin.js` |
| Garanti BBVA | Garanti - Standart | Green (#00B140) | `garanti-standart.js` |
| Akbank | Akbank - Tanışma | Red (#DC1D1D) | `akbank-tanisma.js` |
| Akbank | Akbank - Standart | Red (#DC1D1D) | `akbank-standart.js` |
| Yapı Kredi | Yapı Kredi - Standart | Blue (#0050A0) | `yapikredi-standart.js` |
| Yapı Kredi | Yapı Kredi - Yeni Param | Blue (#0050A0) | `yapikredi-yeniparam.js` |
| Halkbank | Halkbank | Blue (#1976D2) | `halkbank.js` |
| VakıfBank | VakıfBank - Tanışma | Gold (#D4AF37) | `vakifbank-tanisma.js` |
| VakıfBank | VakıfBank - Standart | Gold (#D4AF37) | `vakifbank-standart.js` |
| Odeabank | Odeabank | Black (#1A1A1A) | `odeabank.js` |
| DenizBank | Denizbank | Blue (#0033A0) | `denizbank.js` |
| Fibabanka | Fibabanka | Navy (#003D7C) | `fibabanka.js` |

---

## Detailed Scraper Configurations

### 1. Ziraat Bankası
- **URL**: `https://www.ziraatbank.com.tr/tr/bireysel/mevduat/vadeli-hesaplar/vadeli-tl-mevduat-hesaplari/vadeli-tl-mevduat-hesabi`
- **Description**: İnternet Şubesi Vadeli TL
- **Bank Name**: Ziraat Bankası
- **File**: `scraper/banks/ziraat.js`
- **Notes**:
  - Click accordion button `#accordion1` to expand
  - Select "İnternet Şube Oranları" radio button (`rdIntBranchVadeliTL`)
  - Table uses tbody only - first row is header
  - Skip tables with < 4 columns (small amounts table)
  - Standard table: Vade (rows) x Amount tiers (columns)

### 2. Garanti BBVA - Hoş Geldin
- **URL**: `https://www.garantibbva.com.tr/mevduat/hos-geldin-faizi`
- **Description**: Hoş Geldin Faizi
- **Bank Name**: Garanti BBVA
- **File**: `scraper/banks/garanti-hosgeldin.js`
- **Notes**:
  - Standard table: Vade (rows) x Amount tiers (columns)

### 3. Garanti BBVA - Standart
- **URL**: `https://www.garantibbva.com.tr/mevduat/e-vadeli-hesap`
- **Description**: Standart E-Vadeli
- **Bank Name**: Garanti BBVA
- **File**: `scraper/banks/garanti-standart.js`
- **Notes**:
  - Standard table: Vade (rows) x Amount tiers (columns)

### 4. Akbank - Tanışma
- **URL**: `https://www.akbank.com/kampanyalar/vadeli-mevduat-tanisma-kampanyasi`
- **Description**: Tanışma Faizi
- **Bank Name**: Akbank
- **File**: `scraper/banks/akbank-tanisma.js`
- **Notes**:
  - Promotional welcome rates
  - Standard table: Vade (rows) x Amount tiers (columns)

### 5. Akbank - Standart
- **URL**: `https://www.akbank.com/mevduat-yatirim/mevduat/vadeli-mevduat-hesaplari/vadeli-mevduat-hesabi`
- **Description**: Standart Vadeli
- **Bank Name**: Akbank
- **File**: `scraper/banks/akbank-standart.js`
- **Notes**:
  - Regular deposit rates
  - Standard table: Vade (rows) x Amount tiers (columns)

### 6. Yapı Kredi - Standart
- **URL**: `https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama`
- **Description**: e-Mevduat
- **Bank Name**: Yapı Kredi
- **File**: `scraper/banks/yapikredi-standart.js`
- **Notes**:
  - Click "e-Mevduat Faiz Oranları" label
  - Click "tıklayınız" link to reveal modal/table
  - Extract from `mevduatTable` or FooTable structure

### 7. Yapı Kredi - Yeni Param
- **URL**: `https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama`
- **Description**: Yeni Param (Hoş Geldin)
- **Bank Name**: Yapı Kredi
- **File**: `scraper/banks/yapikredi-yeniparam.js`
- **Notes**:
  - Click "Yeni Param" label
  - Click "tıklayınız" link to reveal modal
  - Extract welcome/promotional rates

### 8. Halkbank
- **URL**: `https://www.halkbank.com.tr/tr/bireysel/mevduat/mevduat-faiz-oranlari/vadeli-tl-mevduat-faiz-oranlari`
- **Description**: İnternet Vadeli TL
- **Bank Name**: Halkbank
- **File**: `scraper/banks/halkbank.js`
- **Notes**:
  - Uses select2 jQuery dropdown
  - Select "İnternet/Mobil Şube" rates: `$('#type').val('1').trigger('change')`
  - 7 columns with amount tiers
  - Standard table: Vade (rows) x Amount tiers (columns)

### 9. VakıfBank - Tanışma
- **URL**: `https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari`
- **Description**: Tanışma Kampanyası
- **Bank Name**: VakıfBank
- **File**: `scraper/banks/vakifbank-tanisma.js`
- **Notes**:
  - Click "Tanışma Kampanyası" button
  - **TRANSPOSED TABLE**: Internal logic flips it to standard format (Amount tiers in headers, Duration in rows).

### 10. VakıfBank - Standart
- **URL**: `https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari`
- **Description**: E-Vadeli Hesabı
- **Bank Name**: VakıfBank
- **File**: `scraper/banks/vakifbank-standart.js`
- **Notes**:
  - Click "E-Vadeli Hesabı" button
  - **TRANSPOSED TABLE**: Same logic as Tanışma

### 11. Odeabank
- **URL**: `https://www.odeabank.com.tr/bireysel/mevduat/vadeli-mevduat`
- **Description**: İnternet/Mobil Vadeli
- **Bank Name**: Odeabank
- **File**: `scraper/banks/odeabank.js`
- **Notes**:
  - Click "İnternet/Mobil Şube Vadeli" accordion
  - Standard table: Vade (rows) x Amount tiers (columns)

### 12. DenizBank
- **URL**: `https://www.denizbank.com/hesap/e-mevduat`
- **Description**: E-Mevduat
- **Bank Name**: DenizBank
- **File**: `scraper/banks/denizbank.js`
- **Notes**:
  - Uses dual-header structure.
  - Standard table: Vade (rows) x Amount tiers (columns).

### 13. Fibabanka
- **URL**: `https://www.fibabanka.com.tr/faiz-ucret-ve-komisyonlar/bireysel-faiz-oranlari/mevduat-faiz-oranlari`
- **Description**: e-Mevduat
- **Bank Name**: Fibabanka
- **File**: `scraper/banks/fibabanka.js`
- **Notes**:
  - Click accordion header containing "e-Mevduat"
  - Extracts from `.fiba-long-table`

---

## Disabled / Skipped Scrapers

These scrapers were previously active but are currently disabled or removed from the workflow:

| Bank Name | Scraper Name | Reason |
|-----------|--------------|--------|
| Enpara.com | Enpara | Request by user to skip |
| İş Bankası | İş Bankası | Request by user to skip |
| Alternatif Bank | Alternatif Bank | Request by user to skip |

---

## Common Scraper Patterns

### Standard Table (Most Banks)
| Vade (Days)  | Amount Tier 1 | Amount Tier 2 | Amount Tier 3 |
|--------------|---------------|---------------|---------------|
| 32-45 gün    | 35.00%        | 36.00%        | 37.00%        |
| 46-91 gün    | 34.00%        | 35.00%        | 36.00%        |
- Rows: Duration ranges
- Columns: Amount tiers
- Logic: Find column by amount, find row by duration

### Transposed Table (VakıfBank)
- Rows: Amount ranges
- Columns: Duration tiers
- Logic: Scraper internally reshapes this into Standard format for the Spreadsheet.

---

## Technical Rules & Best Practices

### Number Parsing (smartParseNumber)
- **ALWAYS** use `window.smartParseNumber` available in the common JS.
- **REASON**: Handles Turkish (5.000,00) and English (5,000.00) formats automatically.

### Duration Parsing (parseDuration)
- Parses "32-45 gün", "3 ay", "1 yıl" into `{ min, max }` days.

### Bot Detection
- Checks for "Cloudflare", "Robot değilim", etc.
- Scraper returns `BLOCKED` if detected.

---

## File Locations

- **Main Scraper Engine**: `scraper/index.js` (Standalone Node.js app)
- **Individual Scrapers**: `scraper/banks/*.js`
- **Spreadsheet Sync**: `scraper/index.js` (Updates "Draft" and "Sheet 1")
- **Web App UI**: `web/app/mevduat/page.js`
- **Android Scraper Specs**: `app/src/main/java/com/acesur/faizbul/data/ScraperSpec.kt`
- **Color Definitions**: `app/src/main/java/com/acesur/faizbul/ui/theme/Color.kt`

---

*Last Updated: 2026-01-15*
