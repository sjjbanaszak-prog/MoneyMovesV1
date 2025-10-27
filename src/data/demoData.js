import {
  generatePensionHistory,
  generateSavingsTransactions,
  generateInvestmentTransactions,
} from './demoDataGenerator';

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
// PENSION POTS DATA
// ========================================
// Generate payment histories
const avivaPaymentHistory = generatePensionHistory(9, 42000, 0.10, 0);
const lgPaymentHistory = generatePensionHistory(3, 36000, 0.05, 0).slice(0, 36);

// Calculate deposits from payment history
const avivaDeposits = avivaPaymentHistory.reduce((sum, p) => sum + p.amount, 0);
const lgDeposits = lgPaymentHistory.reduce((sum, p) => sum + p.amount, 0);

// Calculate yearly totals from payment history
const calculateYearlyTotals = (paymentHistory) => {
  const totals = {};
  paymentHistory.forEach(payment => {
    // Parse DD/MM/YYYY format
    const dateParts = payment.date.split('/');
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);

    // UK tax year: April 6 to April 5
    let taxYear = year;
    if (month < 4 || (month === 4 && day < 6)) {
      taxYear = year - 1;
    }

    totals[taxYear] = (totals[taxYear] || 0) + payment.amount;
  });
  return totals;
};

const avivaYearlyTotals = calculateYearlyTotals(avivaPaymentHistory);
const lgYearlyTotals = calculateYearlyTotals(lgPaymentHistory);

const pensionPotsData = {
  entries: [
    {
      provider: 'Aviva Workplace Pension',
      accountType: 'Workplace Pension',
      currentValue: 35000,
      employerContribution: 3,
      employeeContribution: 7,
      returnRate: 5.2,
      yearlyTotals: avivaYearlyTotals,
      paymentHistory: avivaPaymentHistory,
      deposits: avivaDeposits,
      firstPayment: avivaPaymentHistory.length > 0 ? avivaPaymentHistory[0].date : null,
      lastPayment: avivaPaymentHistory.length > 0 ? avivaPaymentHistory[avivaPaymentHistory.length - 1].date : null,
    },
    {
      provider: 'Legal & General SIPP',
      accountType: 'Personal Pension (SIPP)',
      currentValue: 13000,
      employerContribution: 0,
      employeeContribution: 5,
      returnRate: 4.8,
      yearlyTotals: lgYearlyTotals,
      paymentHistory: lgPaymentHistory,
      deposits: lgDeposits,
      firstPayment: lgPaymentHistory.length > 0 ? lgPaymentHistory[0].date : null,
      lastPayment: lgPaymentHistory.length > 0 ? lgPaymentHistory[lgPaymentHistory.length - 1].date : null,
    },
  ],
};

// ========================================
// SAVINGS TRACKER DATA
// ========================================
// Updated: Fixed deposit descriptions to avoid "transfer" filter
const savingsTrackerData = {
  uploads: [
    {
      accountName: 'Cash ISA',
      bank: 'Nationwide',
      accountType: 'ISA',
      dateFormat: 'DD/MM/YYYY',
      uploadDate: new Date().toISOString(),
      confirmed: true,
      mapping: {
        date: 'date',
        description: 'description',
        debit: 'debit',
        credit: 'credit',
        balance: 'balance',
        amount: 'amount',
      },
      rawData: generateSavingsTransactions(10, 'ISA', 0, 200), // £200/month average
      currentBalance: 25000, // Approximate balance after 10 years
    },
    {
      accountName: 'Stocks & Shares ISA',
      bank: 'Hargreaves Lansdown',
      accountType: 'ISA',
      dateFormat: 'DD/MM/YYYY',
      uploadDate: new Date().toISOString(),
      confirmed: true,
      mapping: {
        date: 'date',
        description: 'description',
        debit: 'debit',
        credit: 'credit',
        balance: 'balance',
        amount: 'amount',
      },
      rawData: generateSavingsTransactions(5, 'ISA', 0, 150), // Started 5 years ago, £150/month
      currentBalance: 9500, // Approximate balance after 5 years
    },
    {
      accountName: 'Easy Access Saver',
      bank: 'Marcus by Goldman Sachs',
      accountType: 'Savings Account',
      dateFormat: 'DD/MM/YYYY',
      uploadDate: new Date().toISOString(),
      confirmed: true,
      mapping: {
        date: 'date',
        description: 'description',
        debit: 'debit',
        credit: 'credit',
        balance: 'balance',
        amount: 'amount',
      },
      rawData: generateSavingsTransactions(7, 'Savings Account', 1000, 100), // Emergency fund building
      currentBalance: 9800, // Approximate balance after 7 years
    },
    {
      accountName: 'Current Account',
      bank: 'Monzo',
      accountType: 'Current Account',
      dateFormat: 'DD/MM/YYYY',
      uploadDate: new Date().toISOString(),
      confirmed: true,
      mapping: {
        date: 'date',
        description: 'description',
        debit: 'debit',
        credit: 'credit',
        balance: 'balance',
        amount: 'amount',
      },
      rawData: generateSavingsTransactions(4, 'Current Account', 500, 50), // Small savings pot
      currentBalance: 3000, // Approximate balance after 4 years
    },
  ],
  selectedAccounts: ['Cash ISA', 'Stocks & Shares ISA', 'Easy Access Saver', 'Current Account'],
};

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
  pensionPots: pensionPotsData,
  savingsTracker: savingsTrackerData,
  mortgage: mortgageData,
  trading212: trading212Data,
};

// Debug: Log demo data structure
console.log('=== DEMO DATA GENERATED ===');
console.log('Savings accounts:', demoData.savingsTracker.uploads.length);
demoData.savingsTracker.uploads.forEach(upload => {
  console.log(`- ${upload.accountName}: ${upload.rawData?.length || 0} transactions`);
  if (upload.rawData && upload.rawData.length > 0) {
    console.log('  First transaction:', upload.rawData[0]);
    console.log('  Last transaction:', upload.rawData[upload.rawData.length - 1]);
  }
});
