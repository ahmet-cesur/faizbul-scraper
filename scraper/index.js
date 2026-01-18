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
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
        ]
    });

    const commonJs = `
        window.smartParseNumber = function(str) {
            if (str === null || str === undefined) return NaN;
            var txt = str.toString().trim();
            var s = txt.replace(/[^\d,.-]/g, '');
            if (!s) return NaN;
            
            var lastDot = s.lastIndexOf('.');
            var lastComma = s.lastIndexOf(',');
            var res = NaN;
            
            if (lastComma > lastDot) {
                var afterComma = s.substring(lastComma + 1);
                if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
                     res = parseFloat(s.replace(/\./g, '').replace(',', '.'));
                } else {
                     res = parseFloat(s.replace(/,/g, ''));
                }
            } else if (lastDot > lastComma) {
                var afterDot = s.substring(lastDot + 1);
                if (afterDot.length <= 2 && /^\d+$/.test(afterDot)) {
                     res = parseFloat(s.replace(/,/g, ''));
                } else {
                     res = parseFloat(s.replace(/\./g, '').replace(',', '.'));
                }
            } else {
                res = parseFloat(s.replace(',', '.'));
            }
            return res;
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
        { id: 1, ...require('./banks/ziraat') },
        { id: 2, ...require('./banks/garanti-hosgeldin') },
        { id: 3, ...require('./banks/garanti-standart') },
        { id: 4, ...require('./banks/akbank-tanisma') },
        { id: 5, ...require('./banks/akbank-standart') },
        { id: 6, ...require('./banks/yapikredi-standart') },
        { id: 7, ...require('./banks/yapikredi-yeniparam') },
        { id: 8, ...require('./banks/halkbank') },
        { id: 9, ...require('./banks/vakifbank-tanisma') },
        { id: 10, ...require('./banks/vakifbank-standart') },
        { id: 11, ...require('./banks/odeabank') },
        { id: 12, ...require('./banks/denizbank') },
        { id: 13, ...require('./banks/fibabanka') }
    ];

    const allFlattenedRows = [];
    const allStructuredResults = []; // NEW: Store structured JSON results for Matrix View
    const executionLogs = [];
    const executionDate = new Date().toISOString();
    const startTime = Date.now();
    const successfulBankNames = new Set();

    for (const bank of banks) {
        console.log(`--- Scraping ${bank.name} ---`);
        const bankStartTime = Date.now();
        let bankStatus = 'PENDING';
        let rowCount = 0;
        let errorMessage = '';

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error' || text.includes('SC_ERROR')) console.error(`[BROWSER ERROR] ${text}`);
            else if (text.includes('INTERN:')) console.log(`[BROWSER] ${text.replace('INTERN:', '').trim()}`);
        });

        try {
            await page.goto(bank.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            const result = await page.evaluate((commonJs, bankScript, bankDesc, bankName) => {
                return new Promise((resolve) => {
                    window.Android = {
                        sendRateWithTable: (rate, desc, name, json) => {
                            if (!window.Android.resolved) {
                                window.Android.resolved = true;
                                resolve({ status: 'SUCCESS', rate, desc, bank: name, json });
                            }
                        },
                        sendError: (err) => {
                            if (!window.Android.resolved) {
                                window.Android.resolved = true;
                                resolve({ status: 'ERROR', error: err, bank: bankName });
                            }
                        },
                        log: (msg) => { console.log('INTERN:', msg); }
                    };

                    var s = document.createElement('script');
                    s.textContent = commonJs;
                    document.head.appendChild(s);

                    try {
                        eval(bankScript);
                    } catch (e) {
                        resolve({ status: 'ERROR', error: e.toString() });
                    }
                    setTimeout(() => resolve({ status: 'TIMEOUT' }), 60000);
                });
            }, commonJs, bank.script, bank.desc, bank.name);

            console.log(`Result: ${result.status} ${result.error || ''}`);
            bankStatus = result.status;
            errorMessage = result.error || '';

            if (result.status === 'SUCCESS' && result.json) {
                if (result.json.length < 50) console.log(`DEBUG: Short JSON for ${bank.name}: ${result.json}`);
                const table = JSON.parse(result.json);
                console.log(`DEBUG ${bank.name}: headers=${table.headers?.length || 0}, rows=${table.rows?.length || 0}`);
                if (table.rows && table.rows.length > 0) {
                    console.log(`DEBUG ${bank.name}: First row has ${table.rows[0].rates?.length || 0} rates`);
                }
                const bankRowsBefore = allFlattenedRows.length;

                const formatForSheet = (val) => {
                    if (val === null || val === undefined || val === '') return 0;
                    if (typeof val === 'number') return val;

                    var s = val.toString().replace(/[^\d,.-]/g, '').trim();
                    if (!s) return 0;

                    if (s.indexOf('.') > -1 && s.indexOf(',') > -1) {
                        if (s.lastIndexOf('.') < s.lastIndexOf(',')) s = s.replace(/\./g, '').replace(',', '.');
                        else s = s.replace(/,/g, '');
                    } else if (s.indexOf(',') > -1) {
                        var parts = s.split(',');
                        if (parts[parts.length - 1].length <= 2) s = s.replace(',', '.');
                        else s = s.replace(/,/g, '');
                    } else if (s.indexOf('.') > -1) {
                        var parts = s.split('.');
                        if (parts[parts.length - 1].length > 2) s = s.replace(/\./g, '');
                    }
                    const num = parseFloat(s);
                    return isNaN(num) ? 0 : num;
                };

                let hasInvalidRate = (formatForSheet(result.rate) > 100);
                let invalidRateValue = result.rate > 100 ? result.rate : null;

                if (!hasInvalidRate && table.rows) {
                    for (const row of table.rows) {
                        for (const rate of row.rates) {
                            const pRate = formatForSheet(rate);
                            if (pRate > 100) {
                                hasInvalidRate = true;
                                invalidRateValue = pRate;
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
                } else if (table.rows) {
                    let nonZeroRatesCount = 0;
                    table.rows.forEach(row => {
                        row.rates.forEach((rate, colIdx) => {
                            const pRate = formatForSheet(rate);
                            if (pRate > 0) {
                                nonZeroRatesCount++;
                                const header = table.headers && table.headers[colIdx];
                                if (!header) return;

                                const minAmt = formatForSheet(header.minAmount);
                                const maxAmt = formatForSheet(header.maxAmount) || 999999999;
                                const minD = parseInt(row.minDays) || 0;
                                const maxD = parseInt(row.maxDays) || 99999;

                                allFlattenedRows.push([
                                    executionDate,
                                    bank.name,
                                    result.desc || bank.desc,
                                    pRate,
                                    minAmt,
                                    maxAmt,
                                    minD,
                                    maxD,
                                    bank.url,
                                    result.json
                                ]);
                            }
                        });
                    });
                    console.log(`DEBUG ${bank.name}: Found ${nonZeroRatesCount} non-zero rates`);

                    rowCount = allFlattenedRows.length - bankRowsBefore;

                    // Store structured data for Matrix View
                    if (rowCount > 0) {
                        allStructuredResults.push({
                            id: bank.id,
                            bank: bank.name,
                            desc: result.desc || bank.desc,
                            date: executionDate,
                            table: table,
                            url: bank.url
                        });
                    }

                    // ONLY add to successful names if we actually found data
                    if (rowCount > 0) {
                        const successKey = `${bank.name.trim().toLowerCase()}|${(result.desc || bank.desc).trim().toLowerCase()}`;
                        successfulBankNames.add(successKey);
                        console.log(`Extracted table for ${bank.name} (${result.desc || bank.desc}): ${rowCount} entries found.`);
                    } else {
                        console.warn(`No entries found for ${bank.name} (${result.desc || bank.desc}). Old data will be preserved.`);
                    }
                }
            } else {
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
            executionLogs.push([executionDate, bank.name, bankStatus, rowCount, `${duration}s`, errorMessage]);
            await page.close().catch(() => { });
        }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const successCount = executionLogs.filter(l => l[2] === 'SUCCESS').length;
    console.log(`\\nScraping Finished. Success: ${successCount}/${banks.length}. Total entries: ${allFlattenedRows.length}. Total time: ${totalDuration}s`);

    try {
        console.log('Updating Draft Sheet...');
        const MAIN_HEADERS = ['Date', 'Bank', 'Description', 'Rate', 'MinAmount', 'MaxAmount', 'MinDays', 'MaxDays', 'URL', 'TableJSON'];
        const DRAFT_HEADERS = [...MAIN_HEADERS, 'Status', 'Error'];

        let draftSheet = doc.sheetsByTitle['Draft'];
        if (!draftSheet) {
            draftSheet = await doc.addSheet({ title: 'Draft', headerValues: DRAFT_HEADERS });
        } else {
            await draftSheet.loadHeaderRow();
            if (JSON.stringify(draftSheet.headerValues) !== JSON.stringify(DRAFT_HEADERS)) {
                await draftSheet.setHeaderRow(DRAFT_HEADERS);
            }
            await draftSheet.clearRows();
        }
        if (executionLogs.length > 0) await draftSheet.addRows(executionLogs);

        // --- NEW: Update Matrix View Sheet (Comparison Matrix) ---
        console.log('Updating Comparison Matrix Sheet...');
        const METRICS_SHEET_TITLE = 'Comparison Matrix';
        let matrixSheet = doc.sheetsByTitle[METRICS_SHEET_TITLE];

        // Ensure Sheet Exists and is at Index 0 (for default CSV export)
        if (!matrixSheet) {
            matrixSheet = await doc.addSheet({ title: METRICS_SHEET_TITLE, index: 0 });
        } else if (matrixSheet.index !== 0) {
            // Move to index 0 if not already
            // Note: google-spreadsheet doesn't have a direct 'move' method easily exposed, 
            // but we can try to set index property if the library supports it, or just rely on it being found.
            // Actually, for CSV export, the first sheet is default. 
            // We will try updating the property.
            try {
                await matrixSheet.updateProperties({ index: 0 });
            } catch (e) { console.log('Could not move sheet to index 0, might already be there or permission issue'); }
        }

        const MATRIX_BLOCK_SIZE = 50;
        const TOTAL_ROWS = banks.length * MATRIX_BLOCK_SIZE;
        const TOTAL_COLS = 100; // 50 Left + 50 Right

        // Resize sheet to fit strict matrix
        await matrixSheet.resize({ rowCount: TOTAL_ROWS + 10, colCount: TOTAL_COLS });
        await matrixSheet.loadCells({ startRowIndex: 0, endRowIndex: TOTAL_ROWS, startColumnIndex: 0, endColumnIndex: TOTAL_COLS });

        for (const item of allStructuredResults) {
            if (!item.id) continue;

            // Calculate Offsets
            const startRow = (item.id - 1) * MATRIX_BLOCK_SIZE;
            const leftColStart = 0;
            // const rightColStart = 50; // We don't write to right side automatically to preserve user edits, or we check if empty.

            // Clear the Left Block Area (0-49 columns, 50 rows) for this bank
            // We do this by iterating cells in backing store and setting value to empty, then refilling.
            for (let r = 0; r < MATRIX_BLOCK_SIZE; r++) {
                for (let c = 0; c < 50; c++) {
                    const cell = matrixSheet.getCell(startRow + r, leftColStart + c);
                    cell.value = null;
                }
            }

            // Write Header Info
            const r0c0 = matrixSheet.getCell(startRow, 0); r0c0.value = "Bank:";
            const r0c1 = matrixSheet.getCell(startRow, 1); r0c1.value = item.bank;
            const r0c2 = matrixSheet.getCell(startRow, 2); r0c2.value = item.desc;

            const r1c0 = matrixSheet.getCell(startRow + 1, 0); r1c0.value = "Updated:";
            const r1c1 = matrixSheet.getCell(startRow + 1, 1); r1c1.value = item.date;

            const r2c0 = matrixSheet.getCell(startRow + 2, 0); r2c0.value = "URL:";
            const r2c1 = matrixSheet.getCell(startRow + 2, 1); r2c1.value = item.url;

            // Write Table Headers (Row 3 relative)
            const headerRowIdx = startRow + 3;
            const headers = ['Vade', 'Min Day', 'Max Day', 'Min Amt', 'Max Amt']; // Standardize basic cols
            // Actually, the app needs dynamic headers or fixed?
            // Let's dump the JSON table structure.
            // Table Headers usually correspond to Rates.

            const cellVade = matrixSheet.getCell(headerRowIdx, 0); cellVade.value = "Vade";

            let colOffset = 1;
            // Write Rate Range Headers
            if (item.table.headers) {
                item.table.headers.forEach(h => {
                    const cell = matrixSheet.getCell(headerRowIdx, colOffset);
                    cell.value = `${h.label} (${h.minAmount}-${h.maxAmount})`;
                    colOffset++;
                });
            }

            // Write Rows
            if (item.table.rows) {
                item.table.rows.forEach((r, idx) => {
                    const rowAbs = headerRowIdx + 1 + idx;
                    if (rowAbs >= startRow + MATRIX_BLOCK_SIZE) return; // Boundary check

                    const c0 = matrixSheet.getCell(rowAbs, 0); c0.value = r.label; // Vade Label (e.g. 32 Gün)

                    // We should verify we are writing rates to correct columns matching headers
                    r.rates.forEach((rate, rIdx) => {
                        if (rIdx + 1 < 50) {
                            const cRate = matrixSheet.getCell(rowAbs, rIdx + 1);
                            cRate.value = rate;
                        }
                    });

                    // Also write min/max days hidden or visible? 
                    // Let's put them in columns 20, 21 if needed, or just rely on row label.
                    // The app needs them. 
                    // Let's add them to the end of the content? 
                    // Or better, keep it simple. The app parser will need to be smart.
                });
            }

            // --- SEED RIGHT SIDE (MANUAL ZONE) IF EMPTY ---
            const rightStartCol = 50;
            const checkCell = matrixSheet.getCell(startRow, rightStartCol);

            if (!checkCell.value) {
                console.log(`Seeding Right Side (Manual Zone) for ${item.bank} (ID: ${item.id})...`);
                // Copy Header Info
                matrixSheet.getCell(startRow, rightStartCol).value = "Bank (Manual):";
                matrixSheet.getCell(startRow, rightStartCol + 1).value = item.bank;

                matrixSheet.getCell(startRow + 1, rightStartCol).value = "Last Sync:";
                matrixSheet.getCell(startRow + 1, rightStartCol + 1).value = executionDate;

                matrixSheet.getCell(startRow + 2, rightStartCol).value = "ID:";
                matrixSheet.getCell(startRow + 2, rightStartCol + 1).value = item.id;

                matrixSheet.getCell(startRow + 2, rightStartCol + 2).value = "URL:";
                matrixSheet.getCell(startRow + 2, rightStartCol + 3).value = item.url || "";

                // Copy Table Headers
                const hRow = startRow + 3;
                matrixSheet.getCell(hRow, rightStartCol).value = "Vade";
                let colOff = 1;
                if (item.table.headers) {
                    item.table.headers.forEach(h => {
                        matrixSheet.getCell(hRow, rightStartCol + colOff).value = `${h.label} (${h.minAmount}-${h.maxAmount})`;
                        colOff++;
                    });
                }

                // Copy Rows (Values only)
                if (item.table.rows) {
                    item.table.rows.forEach((r, idx) => {
                        const rowAbs = hRow + 1 + idx;
                        if (rowAbs >= startRow + MATRIX_BLOCK_SIZE) return;

                        matrixSheet.getCell(rowAbs, rightStartCol).value = r.label;
                        r.rates.forEach((rate, rIdx) => {
                            if (rIdx + 1 < 50) {
                                matrixSheet.getCell(rowAbs, rightStartCol + rIdx + 1).value = rate;
                            }
                        });
                    });
                }
            }
        }

        await matrixSheet.saveUpdatedCells();
        console.log('Comparison Matrix updated.');

        console.log('Performing selective update on Sheet 1...');
        let dataSheet = doc.sheetsByTitle['Sheet 1'] || doc.sheetsByTitle['Sheet1'] || doc.sheetsByTitle['mewduat'] || doc.sheetsByTitle['Mevduat'];
        if (!dataSheet && doc.sheetCount > 0) {
            dataSheet = doc.sheetsByIndex[0];
            console.log(`'Sheet 1' not found, defaulting to first sheet: '${dataSheet.title}'`);
        }
        if (!dataSheet) throw new Error('No data sheet found in the spreadsheet');

        let headersLoaded = false;
        try {
            await dataSheet.loadHeaderRow();
            headersLoaded = (dataSheet.headerValues && dataSheet.headerValues.length > 0);
        } catch (e) { }

        if (!headersLoaded || !dataSheet.headerValues.includes('Bank')) {
            await dataSheet.setHeaderRow(MAIN_HEADERS);
        }

        let existingRows = [];
        try { existingRows = await dataSheet.getRows(); } catch (e) { }

        const finalSheet1Rows = [];
        allFlattenedRows.forEach(r => finalSheet1Rows.push(r));

        if (existingRows.length > 0) {
            console.log(`Checking ${existingRows.length} existing rows for preservation...`);
            let preservedCount = 0;
            for (const row of existingRows) {
                const bName = (row.get('Bank') || row.get('bank') || row.get('Banka') || row.get('banka') || '').toString().trim();
                const bDesc = (row.get('Description') || row.get('Desc') || row.get('Açıklama') || row.get('description') || '').toString().trim();
                const key = `${bName.toLowerCase()}|${bDesc.toLowerCase()}`;

                if (bName && !successfulBankNames.has(key)) {
                    const preservedRow = MAIN_HEADERS.map(h => {
                        const val = row.get(h) || row.get(h.toLowerCase());
                        return val !== undefined && val !== null ? val : '';
                    });
                    finalSheet1Rows.push(preservedRow);
                    preservedCount++;
                }
            }
            console.log(`Preserved ${preservedCount} old entries.`);
        }

        await dataSheet.clearRows();
        if (finalSheet1Rows.length > 0) {
            await dataSheet.addRows(finalSheet1Rows);
            console.log('Sheet 1 updated.');
        }

    } catch (e) {
        console.error('Finalization Error:', e.message);
        throw e;
    }

    await browser.close();
    if (successCount < banks.length) {
        const failedArr = executionLogs.filter(l => l[2] !== 'SUCCESS').map(l => l[1]);
        throw new Error(`Scraper failed for: ${failedArr.join(', ')}`);
    }
}

main().catch(err => {
    console.error('Fatal Scraper Error:', err);
    process.exit(1);
});
