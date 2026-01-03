module.exports = {
    name: "Akbank - Tanışma",
    url: "https://www.akbank.com/kampanyalar/vadeli-mevduat-tanisma-kampanyasi",
    desc: "Tanışma Faizi",
    script: `(function() {
        try {
            var amount = 100000; var duration = 32; var attempts = 0;
            \n            function extractAkbankTable() {
                var table = document.querySelector('table.faizTablo') || Array.from(document.querySelectorAll('table')).find(t => t.innerText.includes('Akbank İnternet') || t.innerText.includes('Tanışma'));
                if (!table) return false;
                var rows = table.rows; if (!rows || rows.length < 3) return false;
                var headers = []; 
                var hasValidHeader = false;
                for (var i = 1; i < rows[0].cells.length; i++) {
                    var cellTxt = rows[0].cells[i].innerText.trim();
                    var minAmt = 0, maxAmt = 999999999;
                    if (cellTxt.indexOf('-') > -1) { var p = cellTxt.split('-'); minAmt = smartParseNumber(p[0]); maxAmt = smartParseNumber(p[1]); }
                    else if (cellTxt.match(/[\\d+]/)) { minAmt = smartParseNumber(cellTxt); }
                    
                    if (minAmt > 0) hasValidHeader = true;
                    headers.push({ label: cellTxt, minAmount: minAmt, maxAmount: maxAmt });
                }
                if (!hasValidHeader) return false;

                var tableRows = [];
                for (var r = 1; r < rows.length; r++) {
                    var cells = rows[r].cells; if (cells.length < 2) continue;
                    var durTxt = cells[0].innerText.trim(); var durParsed = parseDuration(durTxt);
                    if (!durParsed) continue;
                    
                    var rowRates = [];
                    for (var c = 1; c < cells.length; c++) {
                        var rate = smartParseNumber(cells[c].innerText);
                        rowRates.push(isNaN(rate) ? null : rate);
                    }
                    tableRows.push({ label: durTxt, minDays: durParsed ? durParsed.min : null, maxDays: durParsed ? durParsed.max : null, rates: rowRates });
                }
                if(tableRows.length === 0) return false;
                
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
};
