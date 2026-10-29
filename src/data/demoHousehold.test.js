import { buildDemoHousehold } from './demoHousehold';
import { historicalMortgageBalance } from '../mobile/mortgage/utils/mortgageHistory';

const TODAY = new Date(2026, 9, 29); // 29 Oct 2026
const NOW_KEY = '2026-10';

describe('buildDemoHousehold', () => {
  const household = buildDemoHousehold(TODAY);

  test('is deterministic for a given date', () => {
    expect(buildDemoHousehold(TODAY)).toEqual(household);
  });

  test('covers at least 5 years of history', () => {
    const firstMortgagePayment = household.mortgages[0].paymentHistory[0].date;
    expect(firstMortgagePayment <= '2021-12-01').toBe(true);
    household.savingsTracker.uploads.forEach(a => expect(a.rawData.length).toBeGreaterThan(40));
  });

  test('nothing is dated in the future', () => {
    const todayIso = '2026-10-29';
    household.pensionPots.entries.forEach(e => {
      e.paymentHistory.forEach(p => expect(p.date <= todayIso).toBe(true));
    });
    household.mortgages.forEach(m => {
      m.paymentHistory.forEach(p => expect(p.date <= todayIso).toBe(true));
    });
  });

  test('pension deposits equal the sum of contributions', () => {
    household.pensionPots.entries.forEach(e => {
      const sum = e.paymentHistory.reduce((s, p) => s + p.amount, 0);
      expect(e.deposits).toBeCloseTo(sum, 1);
    });
  });

  test('pension contributions stay within the £60k annual allowance', () => {
    const byYear = {};
    household.pensionPots.entries.forEach(e => {
      Object.entries(e.yearlyTotals).forEach(([fy, v]) => { byYear[fy] = (byYear[fy] || 0) + v; });
    });
    Object.values(byYear).forEach(v => expect(v).toBeLessThan(60000));
  });

  test('cash savings balances agree with their transactions', () => {
    household.savingsTracker.uploads
      .filter(a => a.accountType !== 'Stocks & Shares ISA')
      .forEach(a => {
        const sum = a.rawData.reduce((s, r) => s + r.amount, 0);
        expect(a.currentBalance).toBeCloseTo(sum, 0);
        expect(a.rawData[a.rawData.length - 1].balance).toBeCloseTo(a.currentBalance, 0);
      });
  });

  test('ISA deposits this tax year stay within the £20k allowance', () => {
    let deposits = 0;
    household.savingsTracker.uploads
      .filter(a => a.accountType.includes('ISA'))
      .forEach(a => a.rawData.forEach(r => {
        const [d, m, y] = r.date.split('/').map(Number);
        const inFY = new Date(y, m - 1, d) >= new Date(2026, 3, 6);
        if (inFY && r.amount > 0 && !/interest|dividend/i.test(r.description)) deposits += r.amount;
      }));
    expect(deposits).toBeGreaterThan(0);
    expect(deposits).toBeLessThan(20000);
  });

  test('mortgage switch redemption matches the advance plus fees', () => {
    const oak = household.mortgages[0];
    const sw = oak.switchHistory[0];
    expect(sw.completion.newMortgageAdvance).toBeCloseTo(sw.redemption.totalRedemptionAmount, 2);
    expect(oak.mortgageAmount).toBeCloseTo(sw.completion.newMortgageAdvance + sw.completion.feesAddedToLoan, 2);
  });
});

describe('historicalMortgageBalance with overpayments', () => {
  const [oak] = buildDemoHousehold(TODAY).mortgages;

  test('reconstructs the fee-inclusive balance at the switch month despite later overpayments', () => {
    expect(historicalMortgageBalance(oak, '2023-11', NOW_KEY)).toBeCloseTo(oak.mortgageAmount, -1);
  });

  test('ends at the original redemption balance before the switch', () => {
    const sw = oak.switchHistory[0];
    const oct = historicalMortgageBalance(oak, '2023-10', NOW_KEY);
    // One more monthly payment to the old lender took it to the redemption balance
    expect(oct).toBeGreaterThan(sw.redemption.outstandingBalance);
    expect(oct - sw.redemption.outstandingBalance).toBeLessThan(1000);
  });

  test('the lump sum shows up as a drop in the month it was paid', () => {
    const march = historicalMortgageBalance(oak, '2025-03', NOW_KEY);
    const april = historicalMortgageBalance(oak, '2025-04', NOW_KEY);
    expect(march - april).toBeGreaterThan(5000);
    expect(march - april).toBeLessThan(6000);
  });

  test('current month equals the live outstanding balance', () => {
    expect(historicalMortgageBalance(oak, NOW_KEY, NOW_KEY)).toBe(Math.round(oak.outstandingBalance));
  });
});
