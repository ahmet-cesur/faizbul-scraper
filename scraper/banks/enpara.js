module.exports = {
    name: "Enpara",
    url: "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi",
    desc: "Vadeli Mevduat",
    script: `(function() {
        try {
            var step = 0; var attempts = 0;
            
            function extractEnparaTable() {
                // Robust Finder: Find the table headers by text because class names are dynamic/complex
                var allDivs = document.querySelectorAll('div');
                var headerDiv = Array.from(allDivs).find(function(el) {
                    return el.innerText.trim() === 'Mevduat büyüklüğü' && el.classList.contains('enpara-deposit-interest-rates__flex-table-head');
                });

                if (!headerDiv) return false;

                // Go up to find the container .enpara-deposit-interest-rates__flex-table
                var activeTable = headerDiv.closest('.enpara-deposit-interest-rates__flex-table');
                if (!activeTable) return false;

                // Enpara structure:
                // The table is a ROW of Columns (flex-items).
                // Column 0 is "Mevduat büyüklüğü" + Amount Rows.
                // Column 1 is "32 Gün" + Rate Rows.
                // etc.
                
                var columns = activeTable.querySelectorAll('.enpara-deposit-interest-rates__flex-table-item');
                if (columns.length < 2) return false;

                // 1. Extract Headers (Amounts) from Column 0
                // Column 0 contains the "Mevduat büyüklüğü" header and then rows of amounts
                var amountCol = columns[0];
                var amountRows = amountCol.querySelectorAll('.enpara-deposit-interest-rates__flex-table-value'); // or value-text
                
                var outputHeaders = [];
                for(var r=0; r<amountRows.length; r++) {
                    var amountTxt = amountRows[r].innerText.trim();
                    var min = smartParseNumber(amountTxt.split('-')[0]);
                    var max = 999999999;
                    if (amountTxt.includes('-')) {
                        max = smartParseNumber(amountTxt.split('-')[1]);
                    }
                    outputHeaders.push({ label: amountTxt, minAmount: min, maxAmount: max });
                }

                // 2. Extract Data (Durations and Rates) from other Columns
                var outputRows = [];
                
                for(var c=1; c<columns.length; c++) {
                    var col = columns[c];
                    var headerDiv = col.querySelector('.enpara-deposit-interest-rates__flex-table-head');
                    if (!headerDiv) continue;
                    
                    var durTxt = headerDiv.innerText.trim(); // "32 gün"
                    var durParsed = parseDuration(durTxt);
                    
                    var rateRows = col.querySelectorAll('.enpara-deposit-interest-rates__flex-table-value');
                    var rowRates = [];
                    
                    for(var r=0; r<rateRows.length; r++) {
                        // Rate might be in inner text or span
                        var rateTxt = rateRows[r].innerText.trim().replace('%', '');
                        var rate = smartParseNumber(rateTxt);
                        rowRates.push(isNaN(rate) ? null : rate);
                    }
                    
                    outputRows.push({
                        label: durTxt,
                        minDays: durParsed ? durParsed.min : null,
                        maxDays: durParsed ? durParsed.max : null,
                        rates: rowRates
                    });
                }
                
                if (outputRows.length > 0) {
                    var headlineRate = outputRows[0].rates[0];
                    if (!headlineRate) headlineRate = 0;
                    
                    Android.sendRateWithTable(headlineRate, 'İnternet Vadeli TL', 'Enpara', JSON.stringify({headers: outputHeaders, rows: outputRows}));
                    return true;
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                // Enpara loads dynamically. We just wait for the table.
                if (extractEnparaTable()) {
                    clearInterval(interval);
                }
                
                if (++attempts > 40) { // 32 seconds max
                    clearInterval(interval); 
                    Android.sendError('NO_MATCH'); 
                }
            }, 800);
        } catch(e) { Android.sendError('PARSING_ERROR ' + e.message); }
    })()`
};
