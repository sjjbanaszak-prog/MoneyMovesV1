/**
 * Tests for Debt Management Utility Functions
 * Validates financial calculations for UK debt repayment strategies
 */

import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  calculateSnowballStrategy,
  calculateAvalancheStrategy,
  compareStrategies,
  calculateProgress,
  validateDebt
} from './debtUtils';

describe('calculateMonthlyPayment', () => {
  test('calculates correct payment for typical credit card debt', () => {
    const payment = calculateMonthlyPayment(5000, 18.9, 24);
    expect(payment).toBeCloseTo(251.80, 2);
  });

  test('handles zero interest rate', () => {
    const payment = calculateMonthlyPayment(1200, 0, 12);
    expect(payment).toBe(100);
  });

  test('handles zero balance', () => {
    const payment = calculateMonthlyPayment(0, 18.9, 24);
    expect(payment).toBe(0);
  });

  test('handles zero months', () => {
    const payment = calculateMonthlyPayment(5000, 18.9, 0);
    expect(payment).toBe(0);
  });
});

describe('generateAmortizationSchedule', () => {
  test('generates correct schedule for simple debt', () => {
    const debt = {
      balance: 1000,
      interestRate: 12,
      minimumPayment: 100,
      currentPayment: 100
    };

    const { schedule, error } = generateAmortizationSchedule(debt);

    expect(error).toBeNull();
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[schedule.length - 1].remainingBalance).toBe(0);

    // Check first payment has interest and principal
    expect(schedule[0].interestPaid).toBeGreaterThan(0);
    expect(schedule[0].principalPaid).toBeGreaterThan(0);
  });

  test('detects when payment does not cover interest', () => {
    const debt = {
      balance: 10000,
      interestRate: 24,
      minimumPayment: 50, // Too low to cover £200/month interest
      currentPayment: 50
    };

    const { schedule, error } = generateAmortizationSchedule(debt);

    expect(error).toBeTruthy();
    expect(schedule.length).toBe(0);
  });

  test('handles zero interest debt', () => {
    const debt = {
      balance: 1000,
      interestRate: 0,
      minimumPayment: 100,
      currentPayment: 100
    };

    const { schedule, error } = generateAmortizationSchedule(debt);

    expect(error).toBeNull();
    expect(schedule.length).toBe(10); // 1000 / 100 = 10 months
    expect(schedule[0].interestPaid).toBe(0);
  });
});

describe('Snowball Strategy', () => {
  const debts = [
    { debtName: 'Credit Card A', balance: 3000, interestRate: 18.9, minimumPayment: 90 },
    { debtName: 'Credit Card B', balance: 1000, interestRate: 22.9, minimumPayment: 30 },
    { debtName: 'Personal Loan', balance: 5000, interestRate: 8.5, minimumPayment: 150 }
  ];

  test('prioritizes smallest balance first', () => {
    const result = calculateSnowballStrategy(debts, 400);

    expect(result.error).toBeNull();
    expect(result.debtDetails[0].debtName).toBe('Credit Card B'); // Smallest balance
    expect(result.debtDetails[0].payoffMonth).toBeLessThan(result.debtDetails[1].payoffMonth);
  });

  test('calculates total interest and debt-free date', () => {
    const result = calculateSnowballStrategy(debts, 400);

    expect(result.totalDebt).toBe(9000);
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.monthsToPayoff).toBeGreaterThan(0);
    expect(result.debtFreeDate).toBeTruthy();
  });

  test('detects insufficient budget', () => {
    const result = calculateSnowballStrategy(debts, 200); // Less than minimums (270)

    expect(result.error).toBeTruthy();
    expect(result.debtFreeDate).toBeNull();
  });
});

describe('Avalanche Strategy', () => {
  const debts = [
    { debtName: 'Credit Card A', balance: 3000, interestRate: 18.9, minimumPayment: 90 },
    { debtName: 'Credit Card B', balance: 1000, interestRate: 22.9, minimumPayment: 30 },
    { debtName: 'Personal Loan', balance: 5000, interestRate: 8.5, minimumPayment: 150 }
  ];

  test('prioritizes highest interest rate first', () => {
    const result = calculateAvalancheStrategy(debts, 400);

    expect(result.error).toBeNull();
    expect(result.debtDetails[0].debtName).toBe('Credit Card B'); // Highest rate (22.9%)
    expect(result.debtDetails[0].payoffMonth).toBeLessThan(result.debtDetails[2].payoffMonth);
  });

  test('pays off all debts', () => {
    const result = calculateAvalancheStrategy(debts, 400);

    expect(result.debtDetails.every(d => d.payoffMonth !== null)).toBe(true);
  });
});

describe('compareStrategies', () => {
  const debts = [
    { debtName: 'Credit Card A', balance: 3000, interestRate: 18.9, minimumPayment: 90 },
    { debtName: 'Credit Card B', balance: 1000, interestRate: 22.9, minimumPayment: 30 },
    { debtName: 'Personal Loan', balance: 5000, interestRate: 8.5, minimumPayment: 150 }
  ];

  test('compares snowball vs avalanche correctly', () => {
    const comparison = compareStrategies(debts, 400);

    expect(comparison.snowball).toBeDefined();
    expect(comparison.avalanche).toBeDefined();
    expect(comparison.comparison).toBeDefined();
    expect(comparison.comparison.recommendedStrategy).toBeTruthy();
  });

  test('avalanche typically saves more interest than snowball', () => {
    const comparison = compareStrategies(debts, 400);

    // Avalanche should have lower total interest
    expect(comparison.avalanche.totalInterest).toBeLessThanOrEqual(comparison.snowball.totalInterest);
  });

  test('provides savings message', () => {
    const comparison = compareStrategies(debts, 400);

    expect(comparison.comparison.savingsMessage).toBeTruthy();
    expect(typeof comparison.comparison.savingsMessage).toBe('string');
  });
});

describe('calculateProgress', () => {
  test('calculates progress correctly', () => {
    const debts = [
      { debtName: 'Card A', balance: 2000, originalBalance: 5000 },
      { debtName: 'Card B', balance: 0, originalBalance: 1000 },
      { debtName: 'Loan', balance: 3000, originalBalance: 4000 }
    ];

    const progress = calculateProgress(debts);

    expect(progress.totalOriginal).toBe(10000);
    expect(progress.totalRemaining).toBe(5000);
    expect(progress.totalPaid).toBe(5000);
    expect(progress.percentPaid).toBe(50);
    expect(progress.debtsRemaining).toBe(2);
    expect(progress.debtsPaidOff).toBe(1);
  });

  test('handles debts without original balance', () => {
    const debts = [
      { debtName: 'Card A', balance: 2000 },
      { debtName: 'Card B', balance: 1000 }
    ];

    const progress = calculateProgress(debts);

    expect(progress.totalOriginal).toBe(3000);
    expect(progress.percentPaid).toBe(0);
  });
});

describe('validateDebt', () => {
  test('validates correct debt object', () => {
    const debt = {
      debtName: 'Credit Card',
      balance: 5000,
      interestRate: 18.9,
      minimumPayment: 150
    };

    const validation = validateDebt(debt);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('detects missing debt name', () => {
    const debt = {
      debtName: '',
      balance: 5000,
      interestRate: 18.9,
      minimumPayment: 150
    };

    const validation = validateDebt(debt);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Debt name is required');
  });

  test('detects negative balance', () => {
    const debt = {
      debtName: 'Credit Card',
      balance: -100,
      interestRate: 18.9,
      minimumPayment: 150
    };

    const validation = validateDebt(debt);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Balance'))).toBe(true);
  });

  test('detects invalid interest rate', () => {
    const debt = {
      debtName: 'Credit Card',
      balance: 5000,
      interestRate: 150, // Over 100%
      minimumPayment: 150
    };

    const validation = validateDebt(debt);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Interest rate'))).toBe(true);
  });

  test('detects minimum payment below interest coverage', () => {
    const debt = {
      debtName: 'Credit Card',
      balance: 10000,
      interestRate: 24,
      minimumPayment: 100 // £200/month interest, only £100 payment
    };

    const validation = validateDebt(debt);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('interest'))).toBe(true);
  });
});
