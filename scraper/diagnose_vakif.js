const puppeteer = require('puppeteer');
require('dotenv').config();

async function diagnose(bankName, bankUrl, script) {
    console.log(`--- Diagnosing ${bankName} (${bankUrl}) ---`);
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const commonJs = `
        window.smartParseNumber = function(str) {
            if (str === null || str === undefined) return NaN;
            var txt = str.toString().trim();
            var s = txt.replace(/[^\\d,.-]/g, '');
            if (!s) return NaN;
            var lastDot = s.lastIndexOf('.');
            var lastComma = s.lastIndexOf(',');
            var res = NaN;
            if (lastComma > lastDot) {
                var afterComma = s.substring(lastComma + 1);
                if (afterComma.length <= 2 && /^\\d+$/.test(afterComma)) {
                     res = parseFloat(s.replace(/\\./g, '').replace(',', '.'));
                } else {
                     res = parseFloat(s.replace(/,/g, ''));
                }
            } else if (lastDot > lastComma) {
                var afterDot = s.substring(lastDot + 1);
                if (afterDot.length <= 2 && /^\\d+$/.test(afterDot)) {
                     res = parseFloat(s.replace(/,/g, ''));
                } else {
                     res = parseFloat(s.replace(/\\./g, '').replace(',', '.'));
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
                if (lower.indexOf('üzeri') > -1 || txt.indexOf('+') > -1) return { min: day, max: 99999 };
                return { min: day, max: day };
            }
            return null;
        };
        window.isBotDetected = () => false;
    `;

    await page.evaluateOnNewDocument((commonJs) => {
        var s = document.createElement('script');
        s.textContent = commonJs;
        document.head.appendChild(s);

        window.Android = {
            log: (msg) => console.log('INTERN:', msg),
            sendRateWithTable: (rate, desc, name, json) => console.log('SUCCESS:', name, desc, 'JSON Length:', json.length),
            sendError: (err) => console.log('ERROR:', err)
        };
    }, commonJs);

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('INTERN:')) console.log(`[BROWSER] ${text}`);
        else if (text.includes('SUCCESS:')) console.log(`[BROWSER] ${text}`);
        else if (text.includes('ERROR:')) console.log(`[BROWSER] ${text}`);
    });

    try {
        await page.goto(bankUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.evaluate((script) => {
            eval(script);
        }, script);
        await new Promise(resolve => setTimeout(resolve, 15000));
    } catch (e) {
        console.error('Fatal:', e.message);
    } finally {
        await browser.close();
    }
}

async function run() {
    const banks = [
        require('./banks/vakifbank-tanisma'),
        require('./banks/odeabank')
    ];

    for (const bank of banks) {
        await diagnose(bank.name, bank.url, bank.script);
    }
}

run();
