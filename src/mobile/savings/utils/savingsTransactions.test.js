import { computeMonthlyHistory } from './savingsTransactions';

const MAPPING = { date: 'date', description: 'description', credit: 'credit', debit: 'debit', amount: 'amount', balance: 'balance' };

describe('computeMonthlyHistory', () => {
  // Older statement rows, balance snapshots only from this tax year, no interest rows
  const account = {
    mapping: MAPPING,
    dateFormat: 'DD/MM/YYYY',
    rawData: [
      { date: '10/01/2025', description: 'Deposit', credit: 5000, amount: 5000, balance: 5000 },
      { date: '15/05/2026', description: 'Deposit', credit: 1000, amount: 1000, balance: 6000 },
    ],
    balanceHistory: [
      { date: '2026-04-30', value: 5100 },
      { date: '2026-05-31', value: 6150 },
      { date: '2026-06-30', value: 6200 },
    ],
  };

  test('growth comes from month-to-month balance snapshots within the year', () => {
    const { monthlyData, monthlyGrowth } = computeMonthlyHistory(account, 'fy', 2026, 2026);
    expect(monthlyData[1].amount).toBe(1000);       // May deposit
    expect(monthlyGrowth[0]).toBeNull();             // April: no earlier snapshot
    expect(monthlyGrowth[1]).toBeCloseTo(50, 2);     // 6150 − 5100 − 1000
    expect(monthlyGrowth[2]).toBeCloseTo(50, 2);     // 6200 − 6150
  });

  test('summing the months gives non-zero deposits and growth', () => {
    const { monthlyData, monthlyGrowth } = computeMonthlyHistory(account, 'fy', 2026, 2026);
    expect(monthlyData.reduce((s, b) => s + b.amount, 0)).toBe(1000);
    expect(monthlyGrowth.reduce((s, g) => s + (g || 0), 0)).toBeCloseTo(100, 2);
  });

  test('prizes count as growth, not deposits, when there are no snapshots', () => {
    const pb = {
      mapping: MAPPING,
      dateFormat: 'DD/MM/YYYY',
      rawData: [
        { date: '01/06/2026', description: 'Bond purchase', credit: 2000, amount: 2000 },
        { date: '02/07/2026', description: 'Prize', credit: 25, amount: 25 },
      ],
    };
    const { monthlyData, monthlyGrowth } = computeMonthlyHistory(pb, 'fy', 2026, 2026);
    expect(monthlyData[2].amount).toBe(2000);
    expect(monthlyData[3].amount).toBe(0);
    expect(monthlyGrowth[3]).toBe(25);
  });
});
