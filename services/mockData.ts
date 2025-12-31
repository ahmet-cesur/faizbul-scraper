import { BankRate, ScraperLog } from '../types';

export const MOCK_RATES: BankRate[] = [
  {
    id: '1',
    bankName: 'Akbank',
    interestRate: 48.0,
    minAmount: 1000,
    maturityDays: 32,
    lastUpdated: new Date().toISOString(),
    benefits: ['Mobile exclusive rate', 'Free money transfer'],
    logoUrl: 'https://picsum.photos/40/40?random=1'
  },
  {
    id: '2',
    bankName: 'Garanti BBVA',
    interestRate: 45.0,
    minAmount: 5000,
    maturityDays: 32,
    lastUpdated: new Date().toISOString(),
    benefits: ['Welcome offer', 'Credit card bundle'],
    logoUrl: 'https://picsum.photos/40/40?random=2'
  },
  {
    id: '3',
    bankName: 'ING',
    interestRate: 51.0,
    minAmount: 0,
    maturityDays: 32,
    lastUpdated: new Date().toISOString(),
    benefits: ['Turuncu Extra bonus', 'No withdrawal fee'],
    logoUrl: 'https://picsum.photos/40/40?random=3'
  },
  {
    id: '4',
    bankName: 'Enpara.com',
    interestRate: 43.5,
    minAmount: 0,
    maturityDays: 32,
    lastUpdated: new Date().toISOString(),
    benefits: ['No EFT fees', 'Daily interest'],
    logoUrl: 'https://picsum.photos/40/40?random=4'
  },
  {
    id: '5',
    bankName: 'Yapı Kredi',
    interestRate: 44.0,
    minAmount: 10000,
    maturityDays: 32,
    lastUpdated: new Date().toISOString(),
    benefits: ['Digital onboarding'],
    logoUrl: 'https://picsum.photos/40/40?random=5'
  },
  {
    id: '6',
    bankName: 'ON Dijital',
    interestRate: 52.0,
    minAmount: 0,
    maturityDays: 32,
    lastUpdated: new Date().toISOString(),
    benefits: ['Highest market rate', 'Instant account'],
    logoUrl: 'https://picsum.photos/40/40?random=6'
  }
];

export const MOCK_LOGS: ScraperLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    status: 'SUCCESS',
    message: 'Successfully scraped 12 banks. Updated Sheet row 45-57.'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6.5).toISOString(), // 6.5 hours ago
    status: 'SUCCESS',
    message: 'Scheduled run completed. No major rate changes detected.'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12.5).toISOString(), // 12.5 hours ago
    status: 'FAILURE',
    message: 'Connection timeout while accessing Vakıfbank URL. Retrying in 5 mins.'
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12.6).toISOString(), // 12.6 hours ago
    status: 'SUCCESS',
    message: 'Retry successful.'
  }
];