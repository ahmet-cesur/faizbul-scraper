import { BankRate } from '../types';

const SHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Helper to parse CSV line correctly handling quotes
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const fetchSheetData = async (): Promise<BankRate[]> => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Assume first row is header. We'll try to map columns dynamically or use fixed indices
    // This is a robust approach that looks for keywords in the header row
    const headers = parseCSVLine(lines[0].toLowerCase());
    
    const bankIdx = headers.findIndex(h => h.includes('bank') || h.includes('name'));
    const rateIdx = headers.findIndex(h => h.includes('rate') || h.includes('interest') || h.includes('faiz'));
    const maturityIdx = headers.findIndex(h => h.includes('maturity') || h.includes('day') || h.includes('vade'));
    const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('min') || h.includes('tutar'));
    
    // If we can't find critical columns, throw error to trigger fallback
    if (bankIdx === -1 || rateIdx === -1) {
      console.warn("Could not identify columns in CSV headers:", headers);
      return [];
    }

    const rates: BankRate[] = lines.slice(1).map((line, index): BankRate | null => {
      const cols = parseCSVLine(line);
      
      // Safety check for row length
      if (cols.length < 2) return null;

      const bankName = cols[bankIdx]?.replace(/^"|"$/g, '') || 'Unknown Bank';
      const rateStr = cols[rateIdx]?.replace(/[^0-9.,]/g, '').replace(',', '.') || '0';
      const maturityStr = maturityIdx !== -1 ? cols[maturityIdx]?.replace(/[^0-9]/g, '') : '32';
      const amountStr = amountIdx !== -1 ? cols[amountIdx]?.replace(/[^0-9]/g, '') : '0';

      return {
        id: `sheet-${index}`,
        bankName: bankName,
        interestRate: parseFloat(rateStr),
        minAmount: parseFloat(amountStr) || 0,
        maturityDays: parseInt(maturityStr) || 32,
        lastUpdated: new Date().toISOString(), // Sheet doesn't strictly have this, usually
        benefits: [], // Sheet might not have this, leave empty
        logoUrl: undefined
      };
    }).filter((r): r is BankRate => r !== null && !isNaN(r.interestRate) && r.interestRate > 0);

    return rates;
  } catch (error) {
    console.warn("Error fetching live sheet data (likely CORS or private sheet). Using fallback.", error);
    return [];
  }
};