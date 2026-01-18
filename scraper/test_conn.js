const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function testConn() {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    try {
        await doc.loadInfo();
        console.log('Successfully connected to spreadsheet:', doc.title);
    } catch (err) {
        console.error('Connection failed:', err.message);
        if (err.message.includes('403') || err.message.includes('401')) {
            console.log('This looks like a permission or authentication issue. The service account might be deleted or disabled.');
        }
    }
}

testConn();
