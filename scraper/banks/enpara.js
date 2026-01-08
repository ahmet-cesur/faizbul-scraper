module.exports = {
    name: "Enpara",
    url: "https://www.enpara.com/hesaplar/vadeli-mevduat-hesabi",
    desc: "Vadeli Mevduat",
    script: `(function() {
        try {
            var step = 0; var attempts = 0;
            
            function extractEnparaTable() {
                // The table is a flex-table.
                // Container: .enpara-deposit-interest-rates__flex-table--active (for the visible table)
                // or search for the header 'Mevduat büyüklüğü'
                
                var container = document.querySelector('.enpara-deposit-interest-rates');
                if (!container) return false;
                
                // Find all flex tables (there are usually 3 for TL, USD, EUR)
                var tables = container.querySelectorAll('.enpara-deposit-interest-rates__flex-table');
                var activeTable = null;
                
                // Find the visible/active table or the one containing TL rates
                for(var i=0; i<tables.length; i++) {
                   if(tables[i].offsetParent !== null) { // Visible
                       activeTable = tables[i];
                       break;
                   }
                }
                
                if (!activeTable) return false;
                
                var headerRow = activeTable.querySelector('.enpara-deposit-interest-rates__flex-table-header');
                if (!headerRow) return false;
                
                var headerCells = headerRow.querySelectorAll('div');
                var headers = []; 
                // Header 0 is "Mevduat büyüklüğü", others are durations "32 gün", "46 gün" etc.
                if (headerCells.length < 2 || !headerCells[0].innerText.includes('Mevduat')) return false;

                // Parse headers
                // Example: ["Mevduat büyüklüğü", "32 gün", "46 gün", "92 gün", "181 gün"]
                // We need to map them to duration columns
                // We will store just the raw text for the result json
                // But for us to match, we need to know what they are.
                
                // Headers for our JSON
                var jsonHeaders = [];
                for(var h=1; h<headerCells.length; h++) {
                    var txt = headerCells[h].innerText.trim();
                    // We don't have min/max amount in headers here, logic is swapped vs other banks
                    // Headers here are DURATIONS. Rows are AMOUNTS.
                    // This is "Transposed" compared to Standard layout where Rows=Durations, Cols=Amounts
                    // We will parse it as is, and let the backend/app handle if needed, 
                    // OR we can normalize it to standard format (Row=Duration). 
                    // Let's normalize it to our Scraper Standard: 
                    // Rows = Durations ("32 gün")
                    // Columns = Amounts
                    
                    // But wait, the Android app expects:
                    // headers: [{label: "1000 - 5000 TL", minAmount: 1000, maxAmount: 5000}, ...]
                    // rows: [{label: "32 Gün", minDays: 32, maxDays: 32, rates: [rate1, rate2...]}]
                    
                    // So we must TRANSPOSE this table.
                    // Enpara Cols: [32 days, 46 days...]
                    // Enpara Rows: [0-150k, 150k-750k...]
                    
                    // Standard Scraper expect:
                    // Cols: [0-150k, 150k-750k...]  <-- We build headers from Enpara Rows
                    // Rows: [32 days, 46 days...]   <-- We build rows from Enpara Cols
                }

                // 1. Extract Enpara Rows (which will become our Headers)
                var enparaRows = activeTable.querySelectorAll('.enpara-deposit-interest-rates__flex-table-row');
                var outputHeaders = [];
                
                for(var r=0; r<enparaRows.length; r++) {
                    var cells = enparaRows[r].querySelectorAll('div');
                    var amountTxt = cells[0].innerText.trim(); // "0 - 150.000 TL"
                    var min = smartParseNumber(amountTxt.split('-')[0]);
                    var max = 999999999;
                    if (amountTxt.includes('-')) {
                        max = smartParseNumber(amountTxt.split('-')[1]);
                    }
                    outputHeaders.push({ label: amountTxt, minAmount: min, maxAmount: max });
                }

                // 2. Extract Enpara Cols (which will become our "Rows" - Durations)
                var outputRows = [];
                // We loop through the headers (starting from index 1)
                for(var c=1; c<headerCells.length; c++) {
                    var durTxt = headerCells[c].innerText.trim(); // "32 gün"
                    var durParsed = parseDuration(durTxt); // {min:32, max:32}
                    
                    var rowRates = [];
                    // For this duration, get rate from each Enpara Row
                    for(var r=0; r<enparaRows.length; r++) {
                        var cells = enparaRows[r].querySelectorAll('div');
                        if (cells.length > c) {
                            var rateTxt = cells[c].innerText.trim().replace('%', '');
                            var rate = smartParseNumber(rateTxt);
                            rowRates.push(isNaN(rate) ? null : rate);
                        } else {
                            rowRates.push(null);
                        }
                    }
                    
                    outputRows.push({
                        label: durTxt,
                        minDays: durParsed ? durParsed.min : null,
                        maxDays: durParsed ? durParsed.max : null,
                        rates: rowRates
                    });
                }
                
                if (outputRows.length > 0) {
                     // Prefer the 32 day rate for the first amount bracket as the "headline" rate
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
