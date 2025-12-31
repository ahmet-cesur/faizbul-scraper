const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

// Sheet ID from the user: https://docs.google.com/spreadsheets/d/1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY/edit
const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

async function main() {
    console.log('Starting Scraper...');

    // 1. Setup Google Sheets Auth
    const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

    try {
        await doc.loadInfo();
        console.log(`Loaded doc: ${doc.title}`);
    } catch (e) {
        console.error('Failed to load Google Sheet. Check permissions and ID.', e);
        // Continue for testing scraping even if sheets fail? 
        // No, usually we want to stop. But for dev let's try to proceed.
    }

    // 2. Setup Puppeteer
    const browser = await puppeteer.launch({
        headless: true, // Use new headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });

    const results = [];

    // --- SCRAPER DEFINITIONS ---
    // We will port the logic from ScraperSpec.kt here

    // Example: Garanti
    try {
        console.log('Scraping Garanti...');
        const garantiRate = await scrapeGaranti(page);
        if (garantiRate) results.push(garantiRate);
    } catch (e) {
        console.error('Error scraping Garanti:', e);
    }

    // --- SAVE TO SHEET ---
    if (results.length > 0) {
        const sheet = doc.sheetsByIndex[0]; // Assuming first sheet
        // Define headers if new sheet? Or just append?
        // Let's assume we append: Date, Bank, Description, Rate, URL

        await sheet.setHeaderRow(['Date', 'Bank', 'Description', 'Rate', 'Min Amount', 'Max Amount', 'Duration (Days)', 'URL']);

        const rows = results.map(r => ({
            Date: new Date().toISOString(),
            Bank: r.bankName,
            Description: r.description,
            Rate: r.rate,
            'Min Amount': r.minAmount,
            'Max Amount': r.maxAmount,
            'Duration (Days)': r.duration,
            URL: r.url
        }));

        await sheet.addRows(rows);
        console.log(`Added ${rows.length} rows to sheet.`);
    }

    await browser.close();
    console.log('Done.');
}


// --- BANKS SCAPING FUNCTIONS ---

async function scrapeGaranti(page) {
    const url = 'https://www.garantibbva.com.tr/mevduat/e-vadeli-hesap';
    await page.goto(url, { waitUntil: 'networkidle2' });

    return await page.evaluate(() => {
        // Shared Utilities (Ported from ScraperSpec.kt)
        function smartParseNumber(str) {
            if (!str) return NaN;
            var cleaned = str.replace(/%/g, '').replace(/TL/gi, '').replace(/ve üzeri/gi, '')
                .replace(/ÜZERİ/gi, '').replace(/[\u200B-\u200D\uFEFF]/g, '')
                .replace(/\s/g, '').trim();
            if (!cleaned) return NaN;

            var lastDot = cleaned.lastIndexOf('.');
            var lastComma = cleaned.lastIndexOf(',');

            var decimalSep = null;
            var thousandSep = null;

            if (lastDot > lastComma) {
                var afterDot = cleaned.substring(lastDot + 1);
                if (afterDot.length === 2 || afterDot.length === 1) {
                    decimalSep = '.'; thousandSep = ',';
                } else {
                    thousandSep = '.'; decimalSep = ',';
                }
            } else if (lastComma > lastDot) {
                var afterComma = cleaned.substring(lastComma + 1);
                if (afterComma.length === 2 || afterComma.length === 1) {
                    decimalSep = ','; thousandSep = '.';
                } else {
                    thousandSep = ','; decimalSep = '.';
                }
            } else if (lastDot > -1) {
                var afterDot = cleaned.substring(lastDot + 1);
                decimalSep = (afterDot.length === 2 || afterDot.length === 1) ? '.' : null;
                thousandSep = (decimalSep === '.') ? null : '.';
            } else if (lastComma > -1) {
                var afterComma = cleaned.substring(lastComma + 1);
                decimalSep = (afterComma.length === 2 || afterComma.length === 1) ? ',' : null;
                thousandSep = (decimalSep === ',') ? null : ',';
            }

            var normalized = cleaned;
            if (thousandSep) normalized = normalized.split(thousandSep).join('');
            if (decimalSep && decimalSep !== '.') normalized = normalized.replace(decimalSep, '.');

            return parseFloat(normalized);
        }

        function parseDuration(txt) {
            var lower = txt.toLowerCase();
            var nums = txt.match(/\d+/g);
            if (!nums) return null;

            var multiplier = 1;
            if (lower.indexOf('yıl') > -1 || lower.indexOf('yil') > -1) multiplier = 365;
            else if (lower.indexOf('ay') > -1 && lower.indexOf('gün') === -1) multiplier = 30;

            if (nums.length >= 2) return { min: parseInt(nums[0]) * multiplier, max: parseInt(nums[1]) * multiplier };
            else if (nums.length === 1) {
                var day = parseInt(nums[0]) * multiplier;
                if (lower.indexOf('üzeri') > -1 || txt.indexOf('+') > -1) return { min: day, max: 99999 };
                return { min: day, max: day };
            }
            return null;
        }

        // Logic specifically for Garanti
        var tables = document.querySelectorAll('table');
        var bestRate = 0;
        var details = {};

        for (var t = 0; t < tables.length; t++) {
            var table = tables[t];
            var rows = table.querySelectorAll('tr');
            if (rows.length < 2) continue;

            var headerRow = rows[0];
            var headerCells = headerRow.querySelectorAll('th, td');
            if (headerCells.length < 2) continue;

            // Assume Columns = Amount, Rows = Duration
            // To simplify, let's just grab the rate for a standard amount like 100.000 TL and 32 Days
            // Or better, let's grab the HIGHEST rate we find.

            var headers = [];
            for (var i = 1; i < headerCells.length; i++) {
                // Parse amount header (simplified)
                headers.push({ index: i, text: headerCells[i].innerText });
            }

            for (var r = 1; r < rows.length; r++) {
                var row = rows[r];
                var cells = row.querySelectorAll('td, th');
                if (cells.length < headerCells.length) continue;

                var durTxt = cells[0].innerText.trim();
                var durParsed = parseDuration(durTxt);
                if (!durParsed) continue;

                // Check 32 days specifically or roughly
                if (durParsed.min >= 30 && durParsed.min <= 45) {
                    for (var i = 0; i < headers.length; i++) {
                        var colIdx = headers[i].index;
                        if (colIdx < cells.length) {
                            var rate = smartParseNumber(cells[colIdx].innerText);
                            if (!isNaN(rate) && rate > bestRate) {
                                bestRate = rate;
                                details = {
                                    bankName: 'Garanti BBVA',
                                    description: 'Standart E-Vadeli', // Static for now, could be dynamic
                                    rate: rate,
                                    minAmount: 0, // Need to parse properly to fill this
                                    maxAmount: 0,
                                    duration: durParsed.min,
                                    url: document.URL
                                };
                            }
                        }
                    }
                }
            }
        }
        return bestRate > 0 ? details : null;
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
