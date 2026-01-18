const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const SPREADSHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';

async function main() {
    const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log('Sheet Titles:', Object.keys(doc.sheetsByTitle));

    const matrixSheet = doc.sheetsByTitle['Matrix View'];
    if (matrixSheet) {
        const rows = await matrixSheet.getRows();
        console.log('Matrix View Row Count:', rows.length + 1); // +1 because getRows doesn't include header or empty rows in a simple way
        // Actually, let's just use gridProperties
        await matrixSheet.loadCells('A1:B10');
        console.log('A1:', matrixSheet.getCell(0, 0).value);
    } else {
        console.log('Matrix View sheet NOT found');
    }
}

main().catch(console.error);
