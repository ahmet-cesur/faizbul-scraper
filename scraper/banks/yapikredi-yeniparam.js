module.exports = {
    name: "Yapı Kredi",
    url: "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama",
    desc: "Yeni Param (Hoş Geldin)",
    script: `(function() {
        try {
            var attempts = 0;
            var step = 0;

            function extractYapikrediTable() {
                var table = document.querySelector('#tableModal #mevduatTable');
                if (!table || table.rows.length < 3) return false;
                
                var headers = []; var headerCells = table.rows[0].cells;
                for (var i = 1; i < headerCells.length; i++) {
                    headers.push({ label: headerCells[i].innerText.trim(), minAmount: 1000, maxAmount: 999999999 });
                }
                
                var tableRows = [];
                for (var r = 1; r < table.rows.length; r++) {
                    var cells = table.rows[r].cells; if (cells.length < 2) continue;
                    var durTxt = cells[0].innerText.trim(); 
                    var durParsed = parseDuration(durTxt);
                    if (!durParsed) continue;

                    var rowRates = [];
                    for (var c = 1; c < headerCells.length; c++) {
                        var cell = cells[c];
                        if (!cell) {
                            rowRates.push(null);
                            continue;
                        }
                        var rate = smartParseNumber(cell.innerText);
                        if (isNaN(rate) || rate > 100) {
                            rowRates.push(null);
                        } else {
                            rowRates.push(rate);
                        }
                    }
                    if (rowRates.some(r => r !== null)) {
                        tableRows.push({ label: durTxt, minDays: durParsed.min, maxDays: durParsed.max, rates: rowRates });
                    }
                }
                
                if (tableRows.length > 0) {
                    Android.sendRateWithTable(tableRows[0].rates.find(r => r > 0) || 0, 'Yeni Param (Hoş Geldin)', 'Yapı Kredi', JSON.stringify({headers: headers, rows: tableRows}));
                    return true;
                }
                return false;
            }

            var interval = setInterval(function() {
                if (isBotDetected()) { clearInterval(interval); Android.sendError('BLOCKED'); return; }
                
                if (step === 0) {
                   // Select Yeni Param radio
                   var labels = Array.from(document.querySelectorAll('label'));
                   var targetLabel = labels.find(l => l.innerText.includes('Yeni Param'));
                   if (targetLabel) {
                       var radio = document.getElementById(targetLabel.getAttribute('for'));
                       if (radio) {
                           radio.click();
                           step = 1;
                           attempts = 0;
                       }
                   } else {
                       // Try clicking the text directly if label pattern fails
                       var divs = Array.from(document.querySelectorAll('div, span, label'));
                       var yp = divs.find(d => d.innerText.includes('Yeni Param – Vade Dönüşüm Oranları'));
                       if (yp) {
                           yp.click();
                           step = 1;
                           attempts = 0;
                       }
                   }
                } else if (step === 1) {
                   // Click tıklayınız
                   var links = Array.from(document.querySelectorAll('a'));
                   var link = links.find(a => a.innerText.toLowerCase().includes('tıklayınız') && a.parentElement.innerText.includes('Yeni Param'));
                   if (link) {
                       link.click();
                       step = 2;
                       attempts = 0;
                   }
                } else {
                   if (extractYapikrediTable()) clearInterval(interval);
                }
                
                if (++attempts > 40) { clearInterval(interval); Android.sendError('NO_MATCH'); }
            }, 1000);
        } catch(e) { Android.sendError('PARSING_ERROR'); }
    })()`
};
