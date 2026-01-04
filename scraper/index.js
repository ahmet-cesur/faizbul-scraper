const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

async function main() {
    console.log('Starting Scraper...');

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error('Missing Google Service Account credentials');
    }

    const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`Connected to Sheet: ${doc.title}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const commonJs = `
        window.smartParseNumber = function(str) {
            if (!str) return NaN;
            var cleaned = str.replace(/%/g, '').replace(/TL/gi, '').replace(/ve üzeri/gi, '')
                             .replace(/ÜZERİ/gi, '').replace(/[\\u200B-\\u200D\\uFEFF]/g, '')
                             .replace(/\\s/g, '').trim();
            if (!cleaned) return NaN;
            
            var lastDot = cleaned.lastIndexOf('.');
            var lastComma = cleaned.lastIndexOf(',');
            var decimalSep = null, thousandSep = null;
            
            if (lastDot > lastComma) {
                var afterDot = cleaned.substring(lastDot + 1);
                if (afterDot.length === 2 || afterDot.length === 1) { decimalSep = '.'; thousandSep = ','; }
                else { thousandSep = '.'; decimalSep = ','; }
            } else if (lastComma > lastDot) {
                var afterComma = cleaned.substring(lastComma + 1);
                if (afterComma.length === 2 || afterComma.length === 1) { decimalSep = ','; thousandSep = '.'; }
                else { thousandSep = ','; decimalSep = '.'; }
            } else if (lastDot > -1) {
                var afterDot = cleaned.substring(lastDot + 1);
                if (afterDot.length === 2 || afterDot.length === 1) decimalSep = '.'; else thousandSep = '.';
            } else if (lastComma > -1) {
                var afterComma = cleaned.substring(lastComma + 1);
                if (afterComma.length === 2 || afterComma.length === 1) decimalSep = ','; else thousandSep = ',';
            }
            
            var normalized = cleaned;
            if (thousandSep) normalized = normalized.split(thousandSep).join('');
            if (decimalSep && decimalSep !== '.') normalized = normalized.replace(decimalSep, '.');
            
            return parseFloat(normalized);
        };

        window.parseDuration = function(txt) {
            var lower = txt.toLowerCase();
            var nums = txt.match(/\\d+/g);
            if (!nums) return null;
            
            var multiplier = 1;
            if (lower.indexOf('yıl') > -1 || lower.indexOf('yil') > -1) multiplier = 365;
            else if (lower.indexOf('ay') > -1 && lower.indexOf('gün') === -1) multiplier = 30;
            
            if (nums.length >= 2) {
                return { min: parseInt(nums[0]) * multiplier, max: parseInt(nums[1]) * multiplier };
            } else if (nums.length === 1) {
                var day = parseInt(nums[0]) * multiplier;
                if (lower.indexOf('üzeri') > -1 || txt.indexOf('+') > -1) {
                    return { min: day, max: 99999 };
                }
                return { min: day, max: day };
            }
            return null;
        };

        window.isBotDetected = function() {
            var text = document.body.innerText.toLowerCase();
            var title = document.title.toLowerCase();
            var indicators = [
                'bot detection', 'access denied', 'permission denied', 
                'site protection', 'cloudflare', 'distil networks',
                'güvenlik kontrolü', 'robot değilim', 'captcha'
            ];
            for (var i = 0; i < indicators.length; i++) {
                if (text.indexOf(indicators[i]) > -1 || title.indexOf(indicators[i]) > -1) return true;
            }
            return false;
        };
    `;

    const banks = [
        require('./banks/ziraat'),
        require('./banks/garanti-hosgeldin'),
        require('./banks/garanti-standart'),
        require('./banks/akbank-tanisma'),
        require('./banks/akbank-standart'),
        require('./banks/yapikredi-standart'),
        require('./banks/yapikredi-yeniparam'),
        require('./banks/halkbank'),
        require('./banks/vakifbank-tanisma'),
        require('./banks/vakifbank-standart'),
        require('./banks/odeabank'),
        require('./banks/denizbank'),
        require('./banks/fibabanka')
    ];

    const allFlattenedRows = [];
    const executionLogs = [];
    const executionDate = new Date().toISOString();
    const startTime = Date.now();

    for (const bank of banks) {
        console.log(`--- Scraping ${bank.name} ---`);
        const bankStartTime = Date.now();
        let bankStatus = 'PENDING';
        let rowCount = 0;
        let errorMessage = '';

        try {
            await page.goto(bank.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            const result = await page.evaluate((commonJs, bankScript, bankDesc, bankName) => {
                return new Promise((resolve) => {
                    window.Android = {
                        sendRateWithTable: (rate, desc, name, json) => {
                            resolve({ status: 'SUCCESS', rate, desc, bank: name, json });
                        },
                        sendError: (err) => {
                            resolve({ status: 'ERROR', error: err, bank: bankName });
                        },
                        log: (msg) => { console.log('INTERN:', msg); }
                    };

                    var s = document.createElement('script');
                    s.innerHTML = commonJs;
                    document.head.appendChild(s);

                    try {
                        eval(bankScript);
                    } catch (e) {
                        resolve({ status: 'ERROR', error: e.toString() });
                    }
                    setTimeout(() => resolve({ status: 'TIMEOUT' }), 45000);
                });
            }, commonJs, bank.script, bank.desc, bank.name);

            console.log(`Result: ${result.status} ${result.error || ''}`);
            bankStatus = result.status;
            errorMessage = result.error || '';

            if (result.status === 'SUCCESS' && result.json) {
                const table = JSON.parse(result.json);
                const bankRowsBefore = allFlattenedRows.length;

                let hasInvalidRate = (result.rate > 100);
                let invalidRateValue = result.rate > 100 ? result.rate : null;

                if (!hasInvalidRate) {
                    for (const row of table.rows) {
                        for (const rate of row.rates) {
                            if (rate !== null && rate > 100) {
                                hasInvalidRate = true;
                                invalidRateValue = rate;
                                break;
                            }
                        }
                        if (hasInvalidRate) break;
                    }
                }

                if (hasInvalidRate) {
                    bankStatus = 'ERROR';
                    errorMessage = `Back-end validation failed: Found abnormal rate (${invalidRateValue})`;
                    console.warn(`Validation Error for ${bank.name}: Found rate ${invalidRateValue} > 100. Discarding all results.`);
                } else {
                    table.rows.forEach(row => {
                        row.rates.forEach((rate, colIdx) => {
                            if (rate !== null && rate > 0) {
                                const header = table.headers[colIdx];
                                allFlattenedRows.push([
                                    executionDate,
                                    result.bank,
                                    result.desc,
                                    rate,
                                    header.minAmount || 0,
                                    header.maxAmount || 999999999,
                                    row.minDays || 0,
                                    row.maxDays || 99999,
                                    bank.url,
                                    result.json // Last column: Full table JSON
                                ]);
                            }
                        });
                    });
                    rowCount = allFlattenedRows.length - bankRowsBefore;
                    console.log(`Extracted table for ${result.bank}: ${rowCount} entries found.`);
                }
            } else {
                // If status is not SUCCESS, or if SUCCESS but no JSON data was provided
                if (result.status === 'SUCCESS' && !result.json) {
                    bankStatus = 'ERROR';
                    errorMessage = 'Scraper reported SUCCESS but returned no table data';
                }
                console.warn(`No data extracted for ${bank.name}. Status: ${bankStatus} ${errorMessage}`);
            }
        } catch (e) {
            bankStatus = 'FATAL';
            errorMessage = e.message;
            console.error(`Fatal Error for ${bank.name}:`, e.message);
        } finally {
            const duration = ((Date.now() - bankStartTime) / 1000).toFixed(1);
            executionLogs.push([
                executionDate,
                bank.name,
                bankStatus,
                rowCount,
                `${duration}s`,
                errorMessage
            ]);
        }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nScraping Finished. Total entries: ${allFlattenedRows.length}. Total time: ${totalDuration}s`);

    try {
        // Update Sheet 1 (Raw Data)
        if (allFlattenedRows.length > 0) {
            console.log('Updating Data Sheet (Sheet 1)...');
            const dataSheet = doc.sheetsByIndex[0];

            // Clear existing rows to keep only 1 line per amount-days combo (latest results).
            // If some banks fail this run, they will be removed from Sheet 1 until they succeed again.
            // This ensures the app always shows fresh data and prevents duplicates.
            await dataSheet.clearRows();

            await dataSheet.addRows(allFlattenedRows);
            console.log('Successfully updated Sheet 1 with latest data!');
        }

        // Update Sheet 2 (Logs)
        console.log('Updating Log Sheet (Sheet 2)...');
        let logSheet = doc.sheetsByTitle['Logs'];
        if (!logSheet) {
            logSheet = await doc.addSheet({ title: 'Logs', headerValues: ['Date', 'Bank', 'Status', 'Rows', 'Duration', 'Error'] });
        }
        await logSheet.addRows(executionLogs);

        // Add a summary row for this run
        const successCount = executionLogs.filter(l => l[2] === 'SUCCESS').length;
        await logSheet.addRow([
            executionDate,
            '--- RUN SUMMARY ---',
            `${successCount}/${banks.length} Success`,
            allFlattenedRows.length,
            `${totalDuration}s`,
            `Build: FaizBul Scraper Engine v2.0`
        ]);

        console.log('Successfully updated Sheet 2 logs!');

        if (successCount < banks.length) {
            const failedBanks = executionLogs.filter(l => l[2] !== 'SUCCESS' && l[1] !== '--- RUN SUMMARY ---').map(l => l[1]);
            const errorMsg = `Scraper failed for: ${failedBanks.join(', ')}`;

            if (process.env.GITHUB_ACTIONS) {
                console.log(`::error::${errorMsg}`);
            }
            throw new Error(errorMsg);
        }
    } catch (e) {
        console.error('Scraper Error:', e.message);
        throw e; // Re-throw to ensure the process exits with code 1
    }

    await browser.close();
}

main().catch(err => {
    console.error('Fatal Scraper Error:', err);
    process.exit(1);
});
