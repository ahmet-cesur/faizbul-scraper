const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

async function main() {
    console.log('Testing Scraper Logic with DenizBank...');

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
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
        ]
    });

    const bank = require('./banks/denizbank');
    console.log(`--- Scraping ${bank.name} ---`);
    const page = await browser.newPage();

    try {
        await page.goto(bank.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Page loaded.');

        // Just checking if we can evaluate something
        const title = await page.title();
        console.log('Page title:', title);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

main().catch(err => console.error(err));
