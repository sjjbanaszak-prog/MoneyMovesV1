import {
  monthKeyFromDate,
  originalMortgageStartDate,
  mortgageBalanceSegments,
  historicalMortgageBalance,
} from './mortgageHistory';

// Reproduces the "9 Grange Road" scenario: originally taken out with Halifax
// in 2019, remortgaged to Santander in 2025 with a £999 fee rolled into the
// loan (total balance £242,999).
function grangeRoad() {
  return {
    name: '9 Grange Road',
    lender: 'Santander',
    startDate: '2025-06-01',            // overwritten to the switch date on switch
    interestRate: 4.5,
    monthlyPayment: 1300,
    outstandingBalance: 242999,          // advance 242000 + 999 fee added to loan
    mortgageAmount: 242999,
    purchasePrice: 260000,
    propertyValue: 340000,
    fees: 999,
    switchHistory: [
      {
        switchDate: '2025-06-01',
        previousLender: 'Halifax',
        previousStartDate: '2019-03-01', // the ORIGINAL mortgage date
        previousRate: 2.1,
        previousMonthlyPayment: 1100,
        previousBalance: 210000,
        redemption: {
          outstandingBalance: 210000,
          earlyRepaymentCharge: 0,
          exitFee: 100,
          totalRedemptionAmount: 210100,
        },
        completion: {
          newLender: 'Santander',
          newMortgageAdvance: 242000,
          newInterestRate: 4.5,
          newMonthlyPayment: 1300,
          feesAddedToLoan: 999,
        },
        cashReleasedToClient: 31900,
      },
    ],
  };
}

describe('originalMortgageStartDate', () => {
  test('traces back to the pre-switch start date, not the switch date', () => {
    const m = grangeRoad();
    // The live startDate is the switch date…
    expect(m.startDate).toBe('2025-06-01');
    // …but the chart anchor must be the original 2019 date.
    expect(originalMortgageStartDate(m)).toBe('2019-03-01');
    expect(monthKeyFromDate(originalMortgageStartDate(m))).toBe('2019-03');
  });

  test('falls back to startDate when there is no switch history', () => {
    const m = { startDate: '2021-07-01' };
    expect(originalMortgageStartDate(m)).toBe('2021-07-01');
  });
});

describe('mortgageBalanceSegments', () => {
  test('produces original + current segments across a single switch', () => {
    const segs = mortgageBalanceSegments(grangeRoad());
    expect(segs).toHaveLength(2);

    // Original Halifax segment
    expect(segs[0].startDate).toBe('2019-03-01');
    expect(segs[0].endDate).toBe('2025-06-01');
    expect(segs[0].endBalance).toBe(210000);

    // Current Santander segment (runs to "now")
    expect(segs[1].startDate).toBe('2025-06-01');
    expect(segs[1].endDate).toBeNull();
    expect(segs[1].endBalance).toBe(242999);
  });
});

describe('historicalMortgageBalance — net worth chart continuity', () => {
  const nowKey = '2026-07';

  test('shows debt at the original 2019 mortgage date (bug regression)', () => {
    // Before the fix this returned 0 for any month before the switch date,
    // erasing the mortgage from the early part of the chart.
    const bal = historicalMortgageBalance(grangeRoad(), '2019-03', nowKey);
    expect(bal).toBeGreaterThan(0);
    // At origination the Halifax balance should be near — but below — the
    // 210k it had shrunk to by the 2025 switch.
    expect(bal).toBeGreaterThan(210000);
  });

  test('debt line is continuous through the switch (no gap)', () => {
    const m = grangeRoad();
    const justBefore = historicalMortgageBalance(m, '2025-05', nowKey);
    const justAfter  = historicalMortgageBalance(m, '2025-07', nowKey);
    // Pre-switch reconstructs the Halifax balance — just above the £210k it had
    // paid down to by the switch date (a month earlier it was slightly higher).
    expect(justBefore).toBeGreaterThan(209000);
    expect(justBefore).toBeLessThan(213000);
    // …and post-switch jumps up to the Santander balance (equity release).
    expect(justAfter).toBeGreaterThan(240000);
    // The step-up at the switch is visible and continuous (never drops to 0).
    expect(justAfter - justBefore).toBeGreaterThan(25000);
  });

  test('current month reflects the fee-inclusive balance', () => {
    expect(historicalMortgageBalance(grangeRoad(), nowKey, nowKey)).toBe(242999);
  });

  test('switch month shows the NEW balance, not the old redemption balance', () => {
    // Regression: a switch completing in the current month must show the new
    // Santander balance (£242,999), not the Halifax redemption balance (~£239k).
    const m = grangeRoad();
    m.startDate = '2026-07-01';
    m.switchHistory[0].switchDate = '2026-07-01';
    m.switchHistory[0].redemption.outstandingBalance = 239000; // old redeemed balance
    const july = historicalMortgageBalance(m, '2026-07', '2026-07');
    expect(july).toBe(242999);
    expect(july).not.toBe(239000);
  });

  test('returns 0 before the property was ever mortgaged', () => {
    expect(historicalMortgageBalance(grangeRoad(), '2018-01', nowKey)).toBe(0);
  });
});
