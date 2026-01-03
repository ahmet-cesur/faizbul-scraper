module.exports = {
    name: "Yapı Kredi - Yeni Param",
    url: "https://www.yapikredi.com.tr/bireysel-bankacilik/hesaplama-araclari/e-mevduat-faizi-hesaplama",
    desc: "Yeni Param (Hoş Geldin)",
    script: `(function() {
        try {
            var amt = 100000; var dur = 32; var step = 0; var attempts = 0;
            \n            function runApi(isStandard, desc) {
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
};
