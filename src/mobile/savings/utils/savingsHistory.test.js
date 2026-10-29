import { accountBalanceSeries, savingsBalanceSeries, earliestSavingsMonth } from './savingsHistory';
import { buildDemoHousehold } from '../../../data/demoHousehold';

const MAPPING = { date: 'date', description: 'description', credit: 'credit', debit: 'debit', balance: 'balance', amount: 'amount' };
const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04'];
const NOW_KEY = '2026-04';

describe('accountBalanceSeries', () => {
  test('uses the statement balance column, forward-filled, with currentBalance for this month', () => {
    const account = {
      mapping: MAPPING,
      dateFormat: 'DD/MM/YYYY',
      currentBalance: 1600,
      rawData: [
        { date: '15/01/2026', description: 'Deposit', credit: 1000, balance: 1000, amount: 1000 },
        { date: '10/03/2026', description: 'Deposit', credit: 500, balance: 1500, amount: 500 },
      ],
    };
    expect(accountBalanceSeries(account, MONTHS, NOW_KEY)).toEqual([1000, 1000, 1500, 1600]);
  });

  test('is 0 before the account existed', () => {
    const account = {
      mapping: MAPPING,
      dateFormat: 'DD/MM/YYYY',
      currentBalance: 200,
      rawData: [{ date: '02/03/2026', description: 'Opening deposit', credit: 200, balance: 200, amount: 200 }],
    };
    expect(accountBalanceSeries(account, MONTHS, NOW_KEY)).toEqual([0, 0, 200, 200]);
  });

  test('falls back to a running total when there is no balance column', () => {
    const account = {
      mapping: { date: 'date', description: 'description', amount: 'amount' },
      dateFormat: 'DD/MM/YYYY',
      currentBalance: 250,
      rawData: [
        { date: '05/02/2026', description: 'Deposit', amount: 300 },
        { date: '20/01/2026', description: 'Deposit', amount: 100 },
        { date: '12/02/2026', description: 'Withdrawal', amount: -150 },
      ],
    };
    expect(accountBalanceSeries(account, MONTHS, NOW_KEY)).toEqual([100, 250, 250, 250]);
  });

  test('balanceHistory snapshots override statement rows on the same day', () => {
    const account = {
      mapping: MAPPING,
      dateFormat: 'DD/MM/YYYY',
      currentBalance: 5200,
      rawData: [{ date: '01/02/2026', description: 'Deposit', credit: 500, balance: 4500, amount: 500 }],
      balanceHistory: [{ date: '2026-02-01', value: 4800 }],
    };
    expect(accountBalanceSeries(account, MONTHS, NOW_KEY)).toEqual([0, 4800, 4800, 5200]);
  });

  test('ignores deleted statement rows', () => {
    const account = {
      mapping: MAPPING,
      dateFormat: 'DD/MM/YYYY',
      currentBalance: 1000,
      deletedRawIndices: [1],
      rawData: [
        { date: '10/01/2026', description: 'Deposit', credit: 1000, balance: 1000, amount: 1000 },
        { date: '10/02/2026', description: 'Duplicate', credit: 1000, balance: 2000, amount: 1000 },
      ],
    };
    expect(accountBalanceSeries(account, MONTHS, NOW_KEY)).toEqual([1000, 1000, 1000, 1000]);
  });

  test('an account with no dated history stays at its current balance', () => {
    const account = { mapping: {}, rawData: [], currentBalance: 750 };
    expect(accountBalanceSeries(account, MONTHS, NOW_KEY)).toEqual([750, 750, 750, 750]);
  });
});

describe('savingsBalanceSeries with demo data', () => {
  const today = new Date(2026, 9, 29);
  const accounts = buildDemoHousehold(today).savingsTracker.uploads;
  const months = [];
  for (let y = 2021, m = 11; y < 2026 || (y === 2026 && m <= 10); m++) {
    if (m > 12) { m = 1; y++; }
    months.push(`${y}-${String(m).padStart(2, '0')}`);
  }

  test('ends at the total current balance', () => {
    const series = savingsBalanceSeries(accounts, months, '2026-10');
    const total = accounts.reduce((s, a) => s + a.currentBalance, 0);
    expect(series[series.length - 1]).toBeCloseTo(total, 2);
  });

  test('grows over five years rather than staying flat', () => {
    const series = savingsBalanceSeries(accounts, months, '2026-10');
    expect(series[0]).toBeLessThan(15000);
    expect(series[series.length - 1]).toBeGreaterThan(100000);
  });
});

describe('earliestSavingsMonth', () => {
  test('returns the earliest dated balance across accounts', () => {
    const accounts = [
      { mapping: MAPPING, dateFormat: 'DD/MM/YYYY', rawData: [{ date: '10/03/2024', amount: 50, balance: 50 }] },
      { mapping: {}, rawData: [], balanceHistory: [{ date: '2023-07-01', value: 900 }] },
      { mapping: {}, rawData: [], currentBalance: 400 },
    ];
    expect(earliestSavingsMonth(accounts)).toBe('2023-07');
  });

  test('is null when no account has dated history', () => {
    expect(earliestSavingsMonth([{ mapping: {}, rawData: [], currentBalance: 400 }])).toBeNull();
    expect(earliestSavingsMonth([])).toBeNull();
  });
});
