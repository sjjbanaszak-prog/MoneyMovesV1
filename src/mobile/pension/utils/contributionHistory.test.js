import { monthlyContributionHistory, periodContributionSummary } from './contributionHistory';

const pensionA = {
  currentValue: 10600,
  paymentHistory: [
    { date: '2026-01-15', amount: 300 },
    { date: '2026-05-15', amount: 500 },
    { date: '2026-06-15', amount: 500 },
  ],
  valueHistory: [
    { date: '2026-03-31', value: 9000 },
    { date: '2026-04-30', value: 9100 },
    { date: '2026-05-31', value: 9700 },
    { date: '2026-06-30', value: 10300 },
  ],
};

const pensionB = {
  currentValue: 2050,
  paymentHistory: [{ date: '2026-05-01', amount: 2000 }], // opened during the tax year
  valueHistory: [{ date: '2026-05-31', value: 2000 }, { date: '2026-06-30', value: 2050 }],
};

describe('monthlyContributionHistory', () => {
  test('a single pension: contributions by month and growth from value snapshots', () => {
    const { monthlyData, monthlyGrowth } = monthlyContributionHistory([pensionA], 'fy', 2026);
    expect(monthlyData[1].amount).toBe(500);      // May
    expect(monthlyGrowth[0]).toBeCloseTo(100, 2); // Apr: 9100 − 9000
    expect(monthlyGrowth[1]).toBeCloseTo(100, 2); // May: 9700 − 9100 − 500
  });

  test('sums contributions and growth across pensions', () => {
    const { monthlyData, monthlyGrowth } = monthlyContributionHistory([pensionA, pensionB], 'fy', 2026);
    expect(monthlyData[1].amount).toBe(2500);     // 500 + 2000
    expect(monthlyGrowth[1]).toBeCloseTo(100, 2); // only A can be worked out in May
    expect(monthlyGrowth[2]).toBeCloseTo(150, 2); // Jun: A 100 + B 50
    expect(monthlyGrowth[5]).toBeNull();          // Sep: no snapshots
  });

  test('calendar year buckets by month from January', () => {
    const { monthlyData } = monthlyContributionHistory([pensionA], 'cy', 2026);
    expect(monthlyData[0].amount).toBe(300);
  });
});

describe('periodContributionSummary', () => {
  test('adds each pension’s contributions and growth for the tax year', () => {
    const { contributions, growth } = periodContributionSummary([pensionA, pensionB], 'fy', 2026);
    expect(contributions).toBe(3000);
    // A: 10600 − 9000 − 1000 = 600; B started this year: 2050 − 0 − 2000 = 50
    expect(growth).toBeCloseTo(650, 2);
  });

  test('growth is null when no pension has an opening value', () => {
    const noHistory = { currentValue: 5000, paymentHistory: [{ date: '2024-01-01', amount: 100 }] };
    expect(periodContributionSummary([noHistory], 'fy', 2026).growth).toBeNull();
  });
});
