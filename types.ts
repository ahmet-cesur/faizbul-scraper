export interface BankRate {
  id: string;
  bankName: string;
  interestRate: number; // Percentage
  minAmount: number;
  maturityDays: number;
  lastUpdated: string;
  logoUrl?: string;
  benefits: string[];
}

export enum SortOption {
  RATE_DESC = 'RATE_DESC',
  RATE_ASC = 'RATE_ASC',
  BANK_NAME = 'BANK_NAME'
}

export interface ScraperLog {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  message: string;
}

export interface AIAnalysisResult {
  recommendation: string;
  bestBank: string;
  reasoning: string;
}