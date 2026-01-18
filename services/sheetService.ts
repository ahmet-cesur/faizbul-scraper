import { BankRate } from '../types';

const SHEET_ID = '1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

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

function parseDuration(txt: string): { min: number, max: number } {
  const lower = txt.toLowerCase();
  const nums = (txt.match(/\d+/g) || []).map(Number);
  let multiplier = 1;

  if (lower.includes('yıl') || lower.includes('yil')) multiplier = 365;
  else if (lower.includes('ay') && !lower.includes('gün')) multiplier = 30;

  if (nums.length >= 2) return { min: nums[0] * multiplier, max: nums[1] * multiplier };
  if (nums.length === 1) {
    const day = nums[0] * multiplier;
    if (lower.includes('üzeri') || txt.includes('+')) return { min: day, max: 99999 };
    return { min: day, max: day };
  }
  return { min: 0, max: 0 };
}

function parseAmountRange(txt: string): { min: number, max: number } {
  try {
    const content = txt.includes('(') ? txt.split('(').pop()?.split(')')[0] || '' : '';
    if (content && content.includes('-')) {
      const parts = content.split('-');
      const min = parseFloat(parts[0].trim()) || 0;
      const max = parseFloat(parts[1].trim()) || 999999999;
      return { min, max };
    }
  } catch (e) { }
  return { min: 0, max: 999999999 };
}

export const fetchSheetData = async (): Promise<BankRate[]> => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const text = await response.text();
    const grid = text.split('\n').map(line => parseCSVLine(line));
    const rates: BankRate[] = [];

    const MATRIX_BLOCK_SIZE = 50;
    const RIGHT_ZONE_START_COL = 50;

    let rowIdx = 0;
    while (rowIdx < grid.length) {
      if (grid.length > rowIdx && grid[rowIdx].length > RIGHT_ZONE_START_COL) {
        const labelCell = grid[rowIdx][RIGHT_ZONE_START_COL] || '';

        if (labelCell.toLowerCase().includes('bank')) {
          const bankName = (grid[rowIdx][RIGHT_ZONE_START_COL + 1] || 'Unknown').replace(/^"|"$/g, '');

          // Headers are at rowIdx + 3
          const headerRowIdx = rowIdx + 3;
          const headerRow = grid[headerRowIdx];

          if (headerRow) {
            const amountRanges: { [key: number]: { min: number, max: number } } = {};

            for (let c = RIGHT_ZONE_START_COL + 1; c < headerRow.length; c++) {
              amountRanges[c] = parseAmountRange(headerRow[c]);
            }

            // Data Rows: rowIdx + 4 to rowIdx + 49
            for (let r = 1; r < MATRIX_BLOCK_SIZE - 3; r++) {
              const currRowIdx = headerRowIdx + r;
              if (currRowIdx >= grid.length) break;

              const rowData = grid[currRowIdx];
              if (!rowData || rowData.length <= RIGHT_ZONE_START_COL) continue;

              const vadeLabel = rowData[RIGHT_ZONE_START_COL];
              if (!vadeLabel) continue;

              const { min: minDays } = parseDuration(vadeLabel);

              for (let c = RIGHT_ZONE_START_COL + 1; c < rowData.length; c++) {
                const valStr = (rowData[c] || '').replace(',', '.').replace(/"/g, '');
                const val = parseFloat(valStr);

                if (!isNaN(val) && val > 0) {
                  const range = amountRanges[c] || { min: 0, max: 999999999 };

                  rates.push({
                    id: `rate-${rowIdx}-${currRowIdx}-${c}`,
                    bankName: bankName,
                    interestRate: val,
                    minAmount: range.min,
                    maturityDays: minDays,
                    lastUpdated: new Date().toISOString(),
                    benefits: [],
                    logoUrl: undefined
                  });
                }
              }
            }
          }
        }
      }
      rowIdx += MATRIX_BLOCK_SIZE;
    }

    return rates;
  } catch (error) {
    console.warn("Error fetching live sheet data (likely CORS or private sheet). Using fallback.", error);
    return [];
  }
};