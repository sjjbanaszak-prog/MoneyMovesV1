import { generateInvestmentTransactions } from './demoDataGenerator';
import { buildDemoHousehold } from './demoHousehold';

/**
 * Comprehensive demo data for Money Moves
 * Profile: 40-year-old mid-career professional
 * Financial situation: Realistic average (mix of good management and missed opportunities)
 * History: 10 years of data
 */

// User profile
const userProfile = {
  age: 40,
  email: 'demo.user@moneymoves.co.uk',
  name: 'Demo User',
};

// Current financial snapshot
const currentFinances = {
  salary: 42000,
  pensionContributionRate: 0.10, // 10% total (7% employee + 3% employer)
  employerMatch: 0.03,
};

// ========================================
// PENSION BUILDER DATA
// ========================================
const pensionBuilderData = {
  salary: 42000,
  bonus: 3000,
  age: 40,
  retirementAge: 67,
  currentPot: 48000,
  pensionType: 'salary-sacrifice',
  currentContrib: {
    employee: 7,
    employer: 3,
  },
  futureContrib: {
    employee: 10,
    employer: 5,
  },
  returnRates: {
    low: 3,
    medium: 5,
    high: 7,
  },
  taxPeriod: '2024/25',
};

// ========================================
// PENSION POTS, SAVINGS & MORTGAGES (mobile app)
// ========================================
// Deterministic 5-year household history — see demoHousehold.js
const household = buildDemoHousehold();

// ========================================
// MORTGAGE DATA
// ========================================
const mortgageData = {
  loanAmount: 185000, // Current balance after 8 years of payments
  termYears: 17, // Remaining term (started with 25 years)
  initialRate: 4.5,
  initialTermYears: 2, // 2-year fixed deal
  expiryRate: 5.2, // SVR after fixed period
  regularOverpayment: 100, // £100/month overpayment
  oneOffOverpayment: 0,
  frequency: 'monthly',
  originalLoanAmount: 220000,
  originalTermYears: 25,
  yearsPaid: 8,
};

// ========================================
// TRADING 212 INVESTMENT DATA
// ========================================
const trading212Data = {
  transactions: generateInvestmentTransactions(5), // 5 years of investing
  portfolioData: {
    totalValue: 15000,
    totalInvested: 12500,
    totalReturn: 2500,
    returnPercentage: 20,
  },
};

// ========================================
// EXPORT COMPLETE DEMO DATA
// ========================================
export const demoData = {
  userProfile,
  currentFinances,
  pensionBuilder: pensionBuilderData,
  pensionPots: household.pensionPots,
  savingsTracker: household.savingsTracker,
  mortgages: household.mortgages,
  mortgage: mortgageData,
  trading212: trading212Data,
};
