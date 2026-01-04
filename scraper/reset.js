const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

async function reset() {
    console.log('--- Resetting Google Sheets ---');

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

    // 1. Reset Data Sheet (Sheet 1)
    console.log('Resetting Data Sheet (Sheet 1)...');
    const dataSheet = doc.sheetsByIndex[0];
    await dataSheet.clearRows();
    console.log('Data Sheet cleared.');

    // 2. Reset Log Sheet
    console.log('Resetting Log Sheet...');
    const logSheet = doc.sheetsByTitle['Logs'];
    if (logSheet) {
        await logSheet.clearRows();
        console.log('Log Sheet cleared.');
    } else {
        console.log('Log Sheet not found, skipping.');
    }

    console.log('--- Reset Completed Successfully ---');
}

reset().catch(err => {
    console.error('Reset Error:', err);
    process.exit(1);
});
