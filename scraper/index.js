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
        {
            name: "Ziraat Bankası",
            url: "https://www.ziraatbank.com.tr/tr/bireysel/mevduat/vadeli-hesaplar/vadeli-tl-mevduat-hesaplari/vadeli-tl-mevduat-hesabi",
            desc: "İnternet Şubesi Vadeli TL",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
                    \n                    function parseAmountRange(txt) {
                        var val = txt.replace('TL', '').replace('ve üzeri', '').trim();
                        if (val.indexOf('-') > -1) {
                            var parts = val.split('-');
                            return { min: smartParseNumber(parts[0]), max: smartParseNumber(parts[1]) };
                        }
                        return { min: smartParseNumber(val), max: 999999999 };
                    }
                    function extractZiraatTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t];
                            var tbody = table.querySelector('tbody');
                            var allRows = tbody ? tbody.querySelectorAll('tr') : table.rows;
                            if (!allRows || allRows.length < 3) continue;
                            var headerRow = allRows[0];
                            var headerCells = headerRow.querySelectorAll('td, th');
                            if (headerCells.length < 4) continue;
                            var headerText = headerRow.innerText.toLowerCase();
                            if (headerText.indexOf('vade') === -1) continue;
                            var headers = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var cellTxt = headerCells[i].innerText.trim();
                                var amtRange = parseAmountRange(cellTxt);
                                headers.push({ label: cellTxt, minAmount: amtRange.min, maxAmount: amtRange.max });
                            }
                            var tableRows = [];
                            for (var r = 1; r < allRows.length; r++) {
                                var row = allRows[r];
                                var cells = row.querySelectorAll('td, th');
                                if (cells.length < 2) continue;
                                var durTxt = cells[0].innerText.trim();
                                var durParsed = parseDuration(durTxt);
                                var rowRates = [];
                                for (var c = 1; c < cells.length; c++) {
                                    var rate = smartParseNumber(cells[c].innerText);
                                    rowRates.push(isNaN(rate) ? null : rate);
                                }
                                tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                            }
                            Android.sendRateWithTable(tableRows[0].rates[0], 'İnternet Şubesi Vadeli TL', 'Ziraat Bankası', JSON.stringify({headers: headers, rows: tableRows}));
                            return true;
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (step === 0) {
                            var accordion = document.querySelector('button#accordion1') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Vadeli Türk Lirası'));
                            if (accordion && accordion.getAttribute('aria-expanded') !== 'true') accordion.click();
                            step = 1;
                        } else if (step === 1) {
                            var radioLabel = document.querySelector('label[for="rdIntBranchVadeliTL"]') || Array.from(document.querySelectorAll('label')).find(l => l.innerText.includes('İnternet Şube'));
                            if (radioLabel) radioLabel.click();
                            step = 2;
                        } else if (step === 2) {
                            if (extractZiraatTable()) clearInterval(interval);
                        }
                        if (++attempts > 60) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Garanti BBVA - Hoş Geldin",
            url: "https://www.garantibbva.com.tr/mevduat/hos-geldin-faizi",
            desc: "Hoş Geldin Faizi",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var attempts = 0;
                    \n                    function extractGarantiTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t];
                            var rows = table.querySelectorAll('tr');
                            if (rows.length < 2) continue;
                            var headerCells = rows[0].querySelectorAll('th, td');
                            if (headerCells.length < 2) continue;
                            var headers = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var txt = headerCells[i].innerText.trim();
                                var minAmt = 0, maxAmt = 999999999;
                                if (txt.indexOf('-') > -1) {
                                    var parts = txt.split('-');
                                    minAmt = smartParseNumber(parts[0]);
                                    maxAmt = smartParseNumber(parts[1]);
                                } else if (txt.match(/[\\d+]/)) { minAmt = smartParseNumber(txt); }
                                headers.push({ label: txt, minAmount: minAmt, maxAmount: maxAmt });
                            }
                            var tableRows = [];
                            for (var r = 1; r < rows.length; r++) {
                                var cells = rows[r].querySelectorAll('td, th');
                                if (cells.length < headerCells.length) continue;
                                var durTxt = cells[0].innerText.trim();
                                var durParsed = parseDuration(durTxt);
                                var rowRates = [];
                                for (var c = 1; c < cells.length; c++) {
                                    var rate = smartParseNumber(cells[c].innerText);
                                    rowRates.push(isNaN(rate) ? null : rate);
                                }
                                tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                            }
                            if (tableRows.length > 1) {
                                Android.sendRateWithTable(tableRows[0].rates[0], 'Hoş Geldin Faizi', 'Garanti BBVA', JSON.stringify({headers: headers, rows: tableRows}));
                                return true;
                            }
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (extractGarantiTable()) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Garanti BBVA - Standart",
            url: "https://www.garantibbva.com.tr/mevduat/e-vadeli-hesap",
            desc: "Standart E-Vadeli",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var attempts = 0;
                    \n                    function extractGarantiTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t];
                            var rows = table.querySelectorAll('tr');
                            if (rows.length < 2) continue;
                            var headerCells = rows[0].querySelectorAll('th, td');
                            if (headerCells.length < 2) continue;
                            var headers = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var txt = headerCells[i].innerText.trim();
                                var minAmt = 0, maxAmt = 999999999;
                                if (txt.indexOf('-') > -1) {
                                    var parts = txt.split('-');
                                    minAmt = smartParseNumber(parts[0]);
                                    maxAmt = smartParseNumber(parts[1]);
                                } else if (txt.match(/[\\d+]/)) { minAmt = smartParseNumber(txt); }
                                headers.push({ label: txt, minAmount: minAmt, maxAmount: maxAmt });
                            }
                            var tableRows = [];
                            for (var r = 1; r < rows.length; r++) {
                                var cells = rows[r].querySelectorAll('td, th');
                                if (cells.length < headerCells.length) continue;
                                var durTxt = cells[0].innerText.trim();
                                var durParsed = parseDuration(durTxt);
                                var rowRates = [];
                                for (var c = 1; c < cells.length; c++) {
                                    var rate = smartParseNumber(cells[c].innerText);
                                    rowRates.push(isNaN(rate) ? null : rate);
                                }
                                tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                            }
                            if (tableRows.length > 1) {
                                Android.sendRateWithTable(tableRows[0].rates[0], 'Standart E-Vadeli', 'Garanti BBVA', JSON.stringify({headers: headers, rows: tableRows}));
                                return true;
                            }
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (extractGarantiTable()) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Enpara",
            url: "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi",
            desc: "Vadeli Mevduat",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var attempts = 0;
                    \n                    function extractEnparaTable() {
                        var table = document.querySelector('.enpara-deposit-interest-rates__flex-table--active') || document.querySelector('.enpara-deposit-interest-rates__flex-table.TRY') || document.querySelector('.enpara-deposit-interest-rates__flex-table');
                        if (!table) return false;
                        var allItems = Array.from(table.querySelectorAll('.enpara-deposit-interest-rates__flex-table-item'));
                        if (allItems.length < 5) return false;
                        var durationHeaders = [];
                        for (var i = 1; i <= 4 && i < allItems.length; i++) {
                            var headEl = allItems[i].querySelector('.enpara-deposit-interest-rates__flex-table-head');
                            if (headEl) {
                                var daysTxt = headEl.innerText.trim();
                                var daysNum = parseInt(daysTxt.replace(/[^0-9]/g, ''));
                                durationHeaders.push({ label: daysTxt, minDays: daysNum, maxDays: daysNum });
                            }
                        }
                        var tableRows = []; var headers = [];
                        for (var rowStart = 5; rowStart < allItems.length; rowStart += 5) {
                            var amountItem = allItems[rowStart]; if (!amountItem) continue;
                            var valEl = amountItem.querySelector('.enpara-deposit-interest-rates__flex-table-value'); if (!valEl) continue;
                            var amountTxt = valEl.innerText.trim();
                            var minAmt = 0, maxAmt = 999999999;
                            if (amountTxt.indexOf('-') > -1) {
                                var parts = amountTxt.split('-');
                                minAmt = smartParseNumber(parts[0]);
                                maxAmt = smartParseNumber(parts[1]);
                            } else if (amountTxt.match(/[\\d+]/)) { minAmt = smartParseNumber(amountTxt); }
                            headers.push({ label: amountTxt, minAmount: minAmt, maxAmount: maxAmt });
                            var rowRates = [];
                            for (var c = 1; c <= 4 && (rowStart + c) < allItems.length; c++) {
                                var rateValEl = allItems[rowStart + c].querySelector('.enpara-deposit-interest-rates__flex-table-value');
                                rowRates.push(rateValEl ? smartParseNumber(rateValEl.innerText) : null);
                            }
                            tableRows.push({ label: amountTxt, rates: rowRates });
                        }
                        var outputHeaders = headers;
                        var outputRows = durationHeaders.map(function(d, dIdx) {
                            return { label: d.label, minDays: d.minDays, maxDays: d.maxDays, rates: tableRows.map(function(r) { return r.rates[dIdx]; }) };
                        });
                        Android.sendRateWithTable(outputRows[0].rates[0], 'Vadeli Mevduat', 'Enpara.com', JSON.stringify({headers: outputHeaders, rows: outputRows}));
                        return true;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (extractEnparaTable()) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Akbank - Tanışma",
            url: "https://www.akbank.com/kampanyalar/vadeli-mevduat-tanisma-kampanyasi",
            desc: "Tanışma Faizi",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var attempts = 0;
                    \n                    function extractAkbankTable() {
                        var table = document.querySelector('table.faizTablo') || Array.from(document.querySelectorAll('table')).find(t => t.innerText.includes('Akbank İnternet'));
                        if (!table) return false;
                        var rows = table.rows; if (!rows || rows.length < 3) return false;
                        var headers = [];
                        for (var i = 1; i < rows[0].cells.length; i++) {
                            var cellTxt = rows[0].cells[i].innerText.trim();
                            var minAmt = 0, maxAmt = 999999999;
                            if (cellTxt.indexOf('-') > -1) { var p = cellTxt.split('-'); minAmt = smartParseNumber(p[0]); maxAmt = smartParseNumber(p[1]); }
                            else if (cellTxt.match(/[\\d+]/)) { minAmt = smartParseNumber(cellTxt); }
                            headers.push({ label: cellTxt, minAmount: minAmt, maxAmount: maxAmt });
                        }
                        var tableRows = [];
                        for (var r = 1; r < rows.length; r++) {
                            var cells = rows[r].cells; if (cells.length < 2) continue;
                            var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                        }
                        Android.sendRateWithTable(tableRows[0].rates[0], 'Tanışma Faizi', 'Akbank', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (extractAkbankTable()) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Akbank - Standart",
            url: "https://www.akbank.com/mevduat-yatirim/mevduat/vadeli-mevduat-hesaplari/vadeli-mevduat-hesabi",
            desc: "Standart Vadeli",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var attempts = 0;
                    \n                    function extractAkbankTable() {
                        var table = document.querySelector('table.faizTablo') || Array.from(document.querySelectorAll('table')).find(t => t.innerText.includes('Akbank İnternet'));
                        if (!table) return false;
                        var rows = table.rows; if (!rows || rows.length < 3) return false;
                        var headers = [];
                        for (var i = 1; i < rows[0].cells.length; i++) {
                            var cellTxt = rows[0].cells[i].innerText.trim();
                            var minAmt = 0, maxAmt = 999999999;
                            if (cellTxt.indexOf('-') > -1) { var p = cellTxt.split('-'); minAmt = smartParseNumber(p[0]); maxAmt = smartParseNumber(p[1]); }
                            else if (cellTxt.match(/[\\d+]/)) { minAmt = smartParseNumber(cellTxt); }
                            headers.push({ label: cellTxt, minAmount: minAmt, maxAmount: maxAmt });
                        }
                        var tableRows = [];
                        for (var r = 1; r < rows.length; r++) {
                            var cells = rows[r].cells; if (cells.length < 2) continue;
                            var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                        }
                        Android.sendRateWithTable(tableRows[0].rates[0], 'Standart Vadeli', 'Akbank', JSON.stringify({headers: headers, rows: tableRows}));
                        return true;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (extractAkbankTable()) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Yapı Kredi - Standart",
            url: "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama",
            desc: "e-Mevduat",
            script: `(function() {
                try {
                    var amt = 100000; var dur = 32; var step = 0; var attempts = 0;
                    \n                    function runApi(isStandard, desc) {
                        if (typeof $ === 'undefined' || typeof $.Page === 'undefined' || typeof $.Page.GetCalculationTool === 'undefined') return false;
                        $.Page.GetCalculationTool(isStandard, "YTL").done(function(response) {
                            try {
                                if (!response || !response.Data || !response.Data.RateList) return;
                                var rateData = response.Data.RateList[0];
                                var headers = rateData.RateLevelList.map(v => ({ label: v.Description, minAmount: v.MinAmount, maxAmount: v.MaxAmount }));
                                var tableRows = rateData.GroupedRateList.map(g => ({ label: g.StartTenor + "-" + g.EndTenor + " Gün", minDays: g.StartTenor, maxDays: g.EndTenor, rates: g.Rates }));
                                Android.sendRateWithTable(tableRows[0].rates[0], desc, 'Yapı Kredi', JSON.stringify({headers: headers, rows: tableRows}));
                            } catch(e) { Android.sendError('PARSING_ERROR'); }
                        });
                        return true;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (runApi(true, 'e-Mevduat')) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Yapı Kredi - Yeni Param",
            url: "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama",
            desc: "Yeni Param (Hoş Geldin)",
            script: `(function() {
                try {
                    var amt = 100000; var dur = 32; var step = 0; var attempts = 0;
                    \n                    function runApi(isStandard, desc) {
                        if (typeof $ === 'undefined' || typeof $.Page === 'undefined' || typeof $.Page.GetCalculationTool === 'undefined') return false;
                        $.Page.GetCalculationTool(isStandard, "YTL").done(function(response) {
                            try {
                                if (!response || !response.Data || !response.Data.RateList) return;
                                var rateData = response.Data.RateList[0];
                                var headers = rateData.RateLevelList.map(v => ({ label: v.Description, minAmount: v.MinAmount, maxAmount: v.MaxAmount }));
                                var tableRows = rateData.GroupedRateList.map(g => ({ label: g.StartTenor + "-" + g.EndTenor + " Gün", minDays: g.StartTenor, maxDays: g.EndTenor, rates: g.Rates }));
                                Android.sendRateWithTable(tableRows[0].rates[0], desc, 'Yapı Kredi', JSON.stringify({headers: headers, rows: tableRows}));
                            } catch(e) { Android.sendError('PARSING_ERROR'); }
                        });
                        return true;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (runApi(false, 'Yeni Param (Hoş Geldin)')) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "İş Bankası",
            url: "https://www.isbank.com.tr/vadeli-tl",
            desc: "İşCep Vadeli TL",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var attempts = 0;
                    \n                    function getCellValue(cell) {
                        var contentSpan = cell.querySelector('span.content');
                        if (contentSpan) return contentSpan.innerText.trim();
                        var headerSpan = cell.querySelector('span.headres');
                        if (headerSpan) return cell.innerText.replace(headerSpan.innerText, '').trim();
                        return cell.innerText.trim();
                    }
                    function findIsBankasiRate() {
                        var tables = Array.from(document.querySelectorAll('table.ISB_table_basic')).concat(Array.from(document.querySelectorAll('table')));
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t];
                            var headerRow = table.querySelector('thead tr') || table.rows[0];
                            if (!headerRow || !headerRow.innerText.toLowerCase().includes('vade')) continue;
                            var headerCells = headerRow.querySelectorAll('th, td');
                            var headers = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var txt = headerCells[i].innerText.trim();
                                var min = smartParseNumber(txt);
                                headers.push({ label: txt, minAmount: min, maxAmount: 999999999 });
                            }
                            var dataRows = table.querySelectorAll('tbody tr'); if (dataRows.length === 0) dataRows = Array.from(table.rows).slice(1);
                            var tableRows = [];
                            for (var r = 0; r < dataRows.length; r++) {
                                var cells = dataRows[r].querySelectorAll('td'); if (cells.length < 2) continue;
                                var durTxt = getCellValue(cells[0]); var durParsed = parseDuration(durTxt);
                                var rowRates = [];
                                for (var c = 1; c < cells.length; c++) {
                                    var rate = smartParseNumber(getCellValue(cells[c]));
                                    rowRates.push(isNaN(rate) ? null : rate);
                                }
                                tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                            }
                            if (tableRows.length > 0) {
                                Android.sendRateWithTable(tableRows[0].rates[0], 'İşCep Vadeli TL', 'İş Bankası', JSON.stringify({headers: headers, rows: tableRows}));
                                return true;
                            }
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (findIsBankasiRate()) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Halkbank",
            url: "https://www.halkbank.com.tr/tr/bireysel/mevduat/mevduat-faiz-oranlari/vadeli-tl-mevduat-faiz-oranlari",
            desc: "İnternet Vadeli TL",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
                    \n                    function extractHalkbankTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t]; var rows = table.querySelectorAll('tr'); if (rows.length < 3) continue;
                            var headerCells = rows[0].querySelectorAll('td, th'); if (headerCells.length < 4 || !rows[0].innerText.toLowerCase().includes('vade')) continue;
                            var headers = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var txt = headerCells[i].innerText.trim();
                                var min = smartParseNumber(txt);
                                headers.push({ label: txt, minAmount: min, maxAmount: 999999999 });
                            }
                            var tableRows = [];
                            for (var r = 1; r < rows.length; r++) {
                                var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                                var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                                var rowRates = [];
                                for (var c = 1; c < cells.length; c++) {
                                    var rate = smartParseNumber(cells[c].innerText);
                                    rowRates.push(isNaN(rate) ? null : rate);
                                }
                                tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                            }
                            Android.sendRateWithTable(tableRows[0].rates[0], 'İnternet Vadeli TL', 'Halkbank', JSON.stringify({headers: headers, rows: tableRows}));
                            return true;
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (step === 0) {
                            if (typeof $ !== 'undefined' && $('#type').length) { $('#type').val('1').trigger('change'); }
                            else { var b = document.querySelector('#type'); if(b) { b.value='1'; b.dispatchEvent(new Event('change',{bubbles:true})); } }
                            step = 1;
                        } else {
                            if (extractHalkbankTable()) clearInterval(interval);
                        }
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "VakıfBank - Tanışma",
            url: "https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari",
            desc: "Tanışma Kampanyası",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
                    \n                    function extractVakifbankTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t]; var rows = table.querySelectorAll('tr');
                            if (rows.length < 3 || !rows[0].innerText.toLowerCase().includes('tutar')) continue;
                            var headerCells = rows[0].querySelectorAll('td, th');
                            var durationHeaders = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var durParsed = parseDuration(headerCells[i].innerText);
                                durationHeaders.push({ label: headerCells[i].innerText.trim(), minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null });
                            }
                            var tableRows = [];
                            for (var r = 1; r < rows.length; r++) {
                                var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                                var amt = smartParseNumber(cells[0].innerText);
                                var rates = []; for (var c = 1; c < cells.length; c++) rates.push(smartParseNumber(cells[c].innerText));
                                tableRows.push({ label: cells[0].innerText.trim(), minAmount: amt, maxAmount: 999999999, rates: rates });
                            }
                            var tableJson = JSON.stringify({
                                headers: tableRows.map(r => ({ label: r.label, minAmount: r.minAmount, maxAmount: r.maxAmount })),
                                rows: durationHeaders.map((h, idx) => ({ label: h.label, minDays: h.minDays, maxDays: h.maxDays, rates: tableRows.map(r => r.rates[idx]) }))
                            });
                            Android.sendRateWithTable(0, 'Tanışma Kampanyası', 'VakıfBank', tableJson);
                            return true;
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (step === 0) {
                            var btn = document.querySelector('.btn.btn-outline-gray.mobileHoverFix') || Array.from(document.querySelectorAll('a.btn, button')).find(b => b.innerText.includes('Tanışma'));
                            if (btn) btn.click();
                            step = 1;
                        } else {
                            if (extractVakifbankTable()) clearInterval(interval);
                        }
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "VakıfBank - Standart",
            url: "https://www.vakifbank.com.tr/tr/hesaplama-araclari/mevduat-faiz-oranlari",
            desc: "E-Vadeli Hesabı",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
                    \n                    function extractVakifbankTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t]; var rows = table.querySelectorAll('tr');
                            if (rows.length < 3 || !rows[0].innerText.toLowerCase().includes('tutar')) continue;
                            var headerCells = rows[0].querySelectorAll('td, th');
                            var durationHeaders = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var durParsed = parseDuration(headerCells[i].innerText);
                                durationHeaders.push({ label: headerCells[i].innerText.trim(), minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null });
                            }
                            var tableRows = [];
                            for (var r = 1; r < rows.length; r++) {
                                var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                                var amt = smartParseNumber(cells[0].innerText);
                                var rates = []; for (var c = 1; c < cells.length; c++) rates.push(smartParseNumber(cells[c].innerText));
                                tableRows.push({ label: cells[0].innerText.trim(), minAmount: amt, maxAmount: 999999999, rates: rates });
                            }
                            var tableJson = JSON.stringify({
                                headers: tableRows.map(r => ({ label: r.label, minAmount: r.minAmount, maxAmount: r.maxAmount })),
                                rows: durationHeaders.map((h, idx) => ({ label: h.label, minDays: h.minDays, maxDays: h.maxDays, rates: tableRows.map(r => r.rates[idx]) }))
                            });
                            Android.sendRateWithTable(0, 'E-Vadeli Hesabı', 'VakıfBank', tableJson);
                            return true;
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (step === 0) {
                            var btn = Array.from(document.querySelectorAll('a.btn')).find(b => b.innerText.includes('E-Vadeli'));
                            if (btn) btn.click();
                            step = 1;
                        } else {
                            if (extractVakifbankTable()) clearInterval(interval);
                        }
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Alternatif Bank",
            url: "https://www.alternatifbank.com.tr/bilgi-merkezi/faiz-oranlari#mevduat",
            desc: "E-Mevduat TRY",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var attempts = 0;
                    \n                    function extractAlternatifTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t]; var rect = table.getBoundingClientRect(); if (rect.width === 0 || rect.height === 0) continue;
                            var rows = table.querySelectorAll('tr'); if (rows.length < 3 || !rows[0].innerText.toUpperCase().includes('VADE')) continue;
                            if (table.innerText.toUpperCase().indexOf('MEVDUAT') === -1) continue;
                            var headerCells = rows[0].querySelectorAll('td, th');
                            var headers = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var txt = headerCells[i].innerText.trim();
                                headers.push({ label: txt, minAmount: smartParseNumber(txt), maxAmount: 999999999 });
                            }
                            var tableRows = [];
                            for (var r = 1; r < rows.length; r++) {
                                var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                                var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                                var rowRates = []; for (var c = 1; c < cells.length; c++) rowRates.push(smartParseNumber(cells[c].innerText));
                                tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                            }
                            Android.sendRateWithTable(0, 'E-Mevduat TRY', 'Alternatif Bank', JSON.stringify({headers: headers, rows: tableRows}));
                            return true;
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (extractAlternatifTable()) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Odeabank",
            url: "https://www.odeabank.com.tr/bireysel/mevduat/vadeli-mevduat",
            desc: "İnternet/Mobil Vadeli",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
                    \n                    function extractOdeabankTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t]; if (table.getBoundingClientRect().height < 10) continue;
                            var rows = table.querySelectorAll('tr'); if (rows.length < 3 || !rows[0].innerText.toUpperCase().includes('VADE')) continue;
                            var headerCells = rows[0].querySelectorAll('td, th');
                            var headers = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var txt = headerCells[i].innerText.trim();
                                headers.push({ label: txt, minAmount: smartParseNumber(txt), maxAmount: 999999999 });
                            }
                            var tableRows = [];
                            for (var r = 1; r < rows.length; r++) {
                                var cells = rows[r].querySelectorAll('td, th'); if (cells.length < 2) continue;
                                var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                                var rowRates = []; for (var c = 1; c < cells.length; c++) rowRates.push(smartParseNumber(cells[c].innerText));
                                tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                            }
                            Android.sendRateWithTable(0, 'İnternet/Mobil Vadeli', 'Odeabank', JSON.stringify({headers: headers, rows: tableRows}));
                            return true;
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (step === 0) {
                            var btn = document.getElementById('accordion-2') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('İnternet/Mobil'));
                            if (btn) btn.click();
                            step = 1;
                        } else {
                            if (extractOdeabankTable()) clearInterval(interval);
                        }
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "DenizBank",
            url: "https://www.denizbank.com/hesap/e-mevduat",
            desc: "E-Mevduat",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var attempts = 0;
                    \n                    function extractDenizbankTable() {
                        var tables = document.querySelectorAll('table');
                        for (var t = 0; t < tables.length; t++) {
                            var table = tables[t]; var rows = table.querySelectorAll('tr'); if (rows.length < 3) continue;
                            var headerRow = Array.from(rows).find(r => r.innerText.includes('-') && r.innerText.match(/\\d/));
                            if (!headerRow || !headerRow.cells[0].innerText.toUpperCase().includes('GÜN')) continue;
                            var headerCells = headerRow.cells; var headers = [];
                            for (var i = 1; i < headerCells.length; i++) {
                                var txt = headerCells[i].innerText.trim();
                                headers.push({ label: txt, minAmount: smartParseNumber(txt), maxAmount: 999999999 });
                            }
                            var tableRows = []; var startIdx = Array.from(rows).indexOf(headerRow) + 1;
                            for (var r = startIdx; r < rows.length; r++) {
                                var cells = rows[r].cells; if (cells.length < 2) continue;
                                var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                                var rowRates = []; for (var c = 1; c < cells.length; c++) rowRates.push(smartParseNumber(cells[c].innerText));
                                tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                            }
                            Android.sendRateWithTable(0, 'E-Mevduat', 'DenizBank', JSON.stringify({headers: headers, rows: tableRows}));
                            return true;
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (extractDenizbankTable()) clearInterval(interval);
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 800);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        },
        {
            name: "Fibabanka",
            url: "https://www.fibabanka.com.tr/faiz-ucret-ve-komisyonlar/bireysel-faiz-oranlari/mevduat-faiz-oranlari",
            desc: "e-Mevduat",
            script: `(function() {
                try {
                    var amount = 100000; var duration = 32; var step = 0; var attempts = 0;
                    function extractFibabankaTable() {
                        var container = document.querySelector('.fiba-long-table');
                        if (!container) return false;
                        var table = container.querySelector('table');
                        if (!table) return false;
                        var rows = Array.from(table.querySelectorAll('tr'));
                        if (rows.length < 2) return false;
                        var headerCells = Array.from(rows[0].querySelectorAll('th, td'));
                        var headers = [];
                        for (var i = 1; i < headerCells.length; i++) {
                            var txt = headerCells[i].innerText.trim();
                            var parts = txt.replace(/TL/gi, '').split('-');
                            var min = smartParseNumber(parts[0]);
                            var max = parts.length > 1 ? smartParseNumber(parts[1]) : 999999999;
                            headers.push({ label: txt, minAmount: min, maxAmount: max });
                        }
                        var tableRows = [];
                        for (var r = 1; r < rows.length; r++) {
                            var cells = Array.from(rows[r].querySelectorAll('td, th'));
                            if (cells.length < 2) continue;
                            var durTxt = cells[0].innerText.trim();
                            var durParsed = parseDuration(durTxt);
                            var rowRates = [];
                            for (var c = 1; c < cells.length; c++) {
                                var rate = smartParseNumber(cells[c].innerText);
                                rowRates.push(isNaN(rate) ? null : rate);
                            }
                            tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                        }
                        if (tableRows.length > 0) {
                            Android.sendRateWithTable(tableRows[0].rates[0], 'e-Mevduat', 'Fibabanka', JSON.stringify({headers: headers, rows: tableRows}));
                            return true;
                        }
                        return false;
                    }
                    var interval = setInterval(function() {
                        if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                        if (step === 0) {
                            var btn = Array.from(document.querySelectorAll('h2.accordion__title')).find(h => h.innerText.includes('e-Mevduat'));
                            if (btn) { btn.click(); step = 1; }
                        } else {
                            if (extractFibabankaTable()) clearInterval(interval);
                        }
                        if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
                    }, 1000);
                } catch(e) { Android.sendError('PARSING_ERROR'); }
            })()`
        }
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
                                bank.url
                            ]);
                        }
                    });
                });
                rowCount = allFlattenedRows.length - bankRowsBefore;
                console.log(`Extracted table for ${result.bank}: ${rowCount} entries found.`);
            } else if (result.status === 'ERROR' || result.status === 'TIMEOUT') {
                console.warn(`No data extracted for ${bank.name}. Status: ${result.status} ${errorMessage}`);
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
            await dataSheet.addRows(allFlattenedRows);
            console.log('Successfully updated Sheet 1!');
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
    } catch (e) {
        console.error('Error writing to Google Sheets:', e.message);
    }

    await browser.close();
}

main().catch(err => {
    console.error('Fatal Scraper Error:', err);
    process.exit(1);
});
