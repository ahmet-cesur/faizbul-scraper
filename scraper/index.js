const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

// Sheet ID from the user: https://docs.google.com/spreadsheets/d/1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY/edit
const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

async function main() {
    console.log('Starting Scraper...');

    // 0. Validate Env Vars
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL env var');
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error('Missing GOOGLE_PRIVATE_KEY env var');
    }
    console.log('Environment variables check passed.');

    // 1. Setup Google Sheets Auth
    console.log('Setting up Google Sheets Auth...');
    const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

    try {
        console.log('Loading Sheet Info...');
        await doc.loadInfo();
        console.log(`Loaded doc: ${doc.title}`);
    } catch (e) {
        console.error('FAILED to connect to Google Sheet. Check permissions and ID.');
        console.error(e.message);
        throw e;
    }

    // 2. Setup Puppeteer
    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    console.log('Browser launched successfully.');

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // --- Helper Functions to Inject ---
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

    // --- Banks Definition ---
    // script: The JS code to run in the page. It MUST emit success/error via window.Android.
    const banks = [
        {
            name: "Ziraat Bankası",
            url: "https://www.ziraatbank.com.tr/tr/bireysel/mevduat/vadeli-hesaplar/vadeli-tl-mevduat-hesapi",
            desc: "İnternet Şubesi Vadeli TL",
            script: `
                var step = 0;
                var attempts = 0;
                var interval = setInterval(function() {
                    try {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        
                        if (step === 0) {
                            var accordion = document.querySelector('button#accordion1');
                            if (!accordion) { 
                                var btns = document.querySelectorAll('button');
                                for(var i=0; i<btns.length; i++) if(btns[i].innerText.indexOf('Vadeli Türk Lirası Mevduat')>-1) accordion=btns[i];
                            }
                            if (accordion && accordion.getAttribute('aria-expanded') !== 'true') accordion.click();
                            step = 1;
                        } else if (step === 1) {
                            var lbl = document.querySelector('label[for="rdIntBranchVadeliTL"]');
                            if(!lbl) { 
                                var labels = document.querySelectorAll('label');
                                for(var i=0; i<labels.length; i++) if(labels[i].innerText.indexOf('İnternet Şube')>-1) lbl=labels[i];
                            }
                            if(lbl) lbl.click();
                            step = 2;
                        } else if (step === 2) {
                            // Extract Rate - simplified for PoC: Find a 32-day rate
                            var tables = document.querySelectorAll('table');
                            for(var t=0; t<tables.length; t++) {
                                var tbl = tables[t];
                                if(tbl.innerText.toLowerCase().indexOf('vade') === -1) continue;
                                var rows = tbl.querySelectorAll('tr');
                                for(var r=0; r<rows.length; r++) {
                                    var txt = rows[r].innerText;
                                    if(txt.indexOf('32') > -1 && txt.indexOf('45') > -1) { 
                                        // Found a typical row (e.g. 32-45 days)
                                        // Extract exact rate by parsing cells
                                        var cells = rows[r].cells;
                                        for(var c=1; c<cells.length; c++) {
                                            var val = smartParseNumber(cells[c].innerText);
                                            if(val > 0 && val < 100) {
                                                Android.sendRateWithTable(val, 'İnternet Şubesi Vadeli TL', 'Ziraat Bankası', '{}');
                                                clearInterval(interval);
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch(e) { /* ignore */ }
                    if(++attempts > 30) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                }, 800);
            `
        },
        {
            name: "Garanti BBVA",
            url: "https://www.garantibbva.com.tr/mevduat/e-vadeli-hesap",
            desc: "Standart E-Vadeli",
            script: `
                var attempts = 0;
                var interval = setInterval(function() {
                     if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                     var tables = document.querySelectorAll('table');
                     for (var t=0; t<tables.length; t++) {
                         var rows = tables[t].querySelectorAll('tr');
                         for(var r=0; r<rows.length; r++) {
                             if(rows[r].innerText.indexOf('32') > -1) {
                                  var best = 0;
                                  var cells = rows[r].cells;
                                  for(var c=1; c<cells.length; c++) {
                                      var val = smartParseNumber(cells[c].innerText);
                                      if(!isNaN(val) && val > best && val < 100) best = val;
                                  }
                                  if(best > 0) {
                                      Android.sendRateWithTable(best, 'Standart E-Vadeli', 'Garanti BBVA', '{}');
                                      clearInterval(interval);
                                      return;
                                  }
                             }
                         }
                     }
                     if(++attempts > 20) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                 }, 500);
            `
        },
        {
            name: "Akbank",
            url: "https://www.akbank.com/kampanyalar/vadeli-mevduat-tanisma-kampanyasi",
            desc: "Tanışma Faizi",
            script: `
                var attempts = 0;
                var interval = setInterval(function() {
                    if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                    var table = document.querySelector('table.faizTablo');
                    if(!table) {
                        var all = document.querySelectorAll('table');
                        for(var i=0; i<all.length; i++) if(all[i].innerText.indexOf('Akbank İnternet')>-1) table=all[i];
                    }
                    if(table) {
                        var rows = table.rows;
                        for(var r=1; r<rows.length; r++) {
                            if(rows[r].innerText.indexOf('32') > -1) {
                                 var items = rows[r].cells;
                                 var best=0;
                                 for(var c=1; c<items.length; c++) {
                                     var v = smartParseNumber(items[c].innerText);
                                     if(v > best && v < 100) best=v;
                                 }
                                 if(best>0) {
                                     Android.sendRateWithTable(best, 'Tanışma Faizi', 'Akbank', '{}');
                                     clearInterval(interval);
                                     return;
                                 }
                            }
                        }
                    }
                    if(++attempts>20) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                }, 500);
            `
        },
        {
            name: "Enpara",
            url: "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi",
            desc: "Vadeli Mevduat",
            script: `
                var attempts = 0;
                var interval = setInterval(function() {
                    if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                    
                    var table = document.querySelector('.enpara-deposit-interest-rates__flex-table.TRY');
                    if (!table) table = document.querySelector('.enpara-deposit-interest-rates__flex-table');
                    
                    if (table) {
                        var items = table.querySelectorAll('.enpara-deposit-interest-rates__flex-table-item');
                        // Enpara table is div-based. Item 1-4 are headers.
                        // We check simple text match for 32 Days
                        for(var i=0; i<items.length; i++) {
                             if(items[i].innerText.indexOf('32 Gün') > -1) {
                                 // The rate is usually in the same column index in subsequent rows
                                 // Simplified: Just grab the max number found in the rate cells
                                 // Real implementation needs robust column mapping (skipped for brevity)
                                 
                                 // Fallback: look for "enpara-deposit-interest-rates__flex-table-value" with "%"
                                 var values = table.querySelectorAll('.enpara-deposit-interest-rates__flex-table-value');
                                 var best = 0;
                                 for(var v=0; v<values.length; v++) {
                                     var txt = values[v].innerText;
                                     if(txt.indexOf('%') > -1) {
                                         var n = smartParseNumber(txt);
                                         if(n > best && n < 100) best = n;
                                     }
                                 }
                                 if(best > 0) {
                                     Android.sendRateWithTable(best, 'Vadeli Mevduat', 'Enpara.com', '{}');
                                     clearInterval(interval);
                                     return;
                                 }
                             }
                        }
                    }
                    if(++attempts > 20) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                }, 500);
            `
        },
        {
            name: "İş Bankası",
            url: "https://www.isbank.com.tr/vadeli-tl",
            desc: "İşCep Vadeli TL",
            script: `
                var attempts = 0;
                var interval = setInterval(function() {
                    if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                    var tables = document.querySelectorAll('table');
                     for (var t=0; t<tables.length; t++) {
                         var rows = tables[t].querySelectorAll('tr');
                         for(var r=0; r<rows.length; r++) {
                            // IsBank uses specific spans
                            var txt = rows[r].innerText;
                             if(txt.indexOf('32') > -1) {
                                  var best = 0;
                                  var cells = rows[r].querySelectorAll('td');
                                  for(var c=1; c<cells.length; c++) {
                                      var val = smartParseNumber(cells[c].innerText);
                                      if(!isNaN(val) && val > best && val < 100) best = val;
                                  }
                                  if(best > 0) {
                                      Android.sendRateWithTable(best, 'İşCep Vadeli TL', 'İş Bankası', '{}');
                                      clearInterval(interval);
                                      return;
                                  }
                             }
                         }
                     }
                    if(++attempts > 20) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                }, 500);
            `
        }
    ];

    const results = [];

    // --- Execution Loop ---
    for (const bank of banks) {
        console.log(`--- Processing ${bank.name} ---`);
        try {
            await page.goto(bank.url, { waitUntil: 'domcontentloaded', timeout: 45000 });

            const result = await page.evaluate((commonJs, bankScript, bankDesc, bankName) => {
                return new Promise((resolve) => {
                    // Set up Mock Android Interface to capture the call from the script
                    window.Android = {
                        sendRateWithTable: (rate, desc, name, json) => {
                            resolve({ status: 'SUCCESS', rate, desc, bank: name, json });
                        },
                        sendError: (err) => {
                            resolve({ status: 'ERROR', error: err, bank: bankName });
                        },
                        log: (msg) => { }
                    };

                    // Inject Utils
                    var s = document.createElement('script');
                    s.innerHTML = commonJs;
                    document.head.appendChild(s);

                    // Run Bank Script
                    try {
                        // eslint-disable-next-line no-eval
                        eval(bankScript);
                    } catch (e) {
                        resolve({ status: 'ERROR', error: e.toString() });
                    }

                    // Timeout
                    setTimeout(() => resolve({ status: 'TIMEOUT' }), 20000);
                });
            }, commonJs, bank.script, bank.desc, bank.name);

            console.log(`Result: ${result.status} ${result.rate || ''} ${result.error || ''}`);

            if (result.status === 'SUCCESS') {
                results.push({
                    date: new Date().toISOString(),
                    bank: result.bank,
                    desc: result.desc,
                    rate: result.rate,
                    min: 0, max: 0, duration: 32,
                    url: bank.url
                });
            }

        } catch (e) {
            console.error(`Error processing ${bank.name}:`, e.message);
        }
    }

    console.log(`\nCollected ${results.length} rates.`);

    // --- Write to Sheet ---
    if (results.length > 0) {
        console.log('Writing to sheet...');
        const sheet = doc.sheetsByIndex[0];
        const rowsToAdd = results.map(r => [
            r.date, r.bank, r.desc, r.rate, r.min, r.max, r.duration, r.url
        ]);
        await sheet.addRows(rowsToAdd);
        console.log('Success!');
    }

    await browser.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
