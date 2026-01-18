const puppeteer = require('puppeteer');
require('dotenv').config();

async function diagnose(bankName, bankUrl, script) {
    console.log(`--- Diagnosing ${bankName} (${bankUrl}) ---`);
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Inject commonJs-like mocks
    await page.evaluateOnNewDocument(() => {
        window.smartParseNumber = (str) => {
            if (!str) return NaN;
            let s = str.toString().replace(/[^\d,.-]/g, '');
            if (s.includes(',') && s.includes('.')) {
                if (s.lastIndexOf('.') < s.lastIndexOf(',')) s = s.replace(/\./g, '').replace(',', '.');
                else s = s.replace(/,/g, '');
            } else if (s.includes(',')) {
                s = s.replace(',', '.');
            }
            return parseFloat(s);
        };
        window.parseDuration = (txt) => {
            let nums = txt.match(/\d+/g);
            if (!nums) return null;
            return { min: parseInt(nums[0]), max: nums[1] ? parseInt(nums[1]) : parseInt(nums[0]) };
        };
        window.isBotDetected = () => false;
        window.Android = {
            log: (msg) => console.log('INTERN:', msg),
            sendRateWithTable: (rate, desc, name, json) => console.log('SUCCESS:', name, desc, json.substring(0, 100) + '...'),
            sendError: (err) => console.log('ERROR:', err)
        };
    });

    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

    try {
        await page.goto(bankUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.evaluate(script);
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for script to finish/attempts
    } catch (e) {
        console.error('Fatal:', e.message);
    } finally {
        await browser.close();
    }
}

async function run() {
    const banks = [
        require('./banks/garanti-hosgeldin'),
        require('./banks/halkbank'),
        require('./banks/fibabanka')
    ];

    for (const bank of banks) {
        await diagnose(bank.name, bank.url, bank.script);
    }
}

run();
