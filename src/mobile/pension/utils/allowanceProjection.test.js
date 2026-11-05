import { projectTaxYearContributions } from './allowanceProjection';

// £5,000/month on the 25th from April 2026, plus a £6,000 bonus sacrifice in June
function monthlyPension() {
  const paymentHistory = [];
  for (let m = 3; m <= 9; m++) paymentHistory.push({ date: `2026-${String(m + 1).padStart(2, '0')}-25`, amount: 5000 });
  paymentHistory.push({ date: '2026-06-28', amount: 6000 });
  return { paymentHistory };
}

describe('projectTaxYearContributions', () => {
  test('projects paid-so-far plus a typical month for each remaining month', () => {
    // 5 Nov 2026: Apr–Oct paid (7 × £5,000 + £6,000 bonus); Nov–Mar still to come
    const p = projectTaxYearContributions([monthlyPension()], new Date(2026, 10, 5));
    expect(p.paidSoFar).toBe(41000);
    expect(p.typicalMonth).toBe(5000);
    expect(p.monthsRemaining).toBe(5);
    expect(p.projected).toBe(66000);
  });

  test("a one-off lump sum in the last 3 months doesn't inflate the typical month", () => {
    // 5 Aug 2026: last three months are May £5k, Jun £11k (incl. bonus), Jul £5k → median £5k
    const p = projectTaxYearContributions([monthlyPension()], new Date(2026, 7, 5));
    expect(p.typicalMonth).toBe(5000);
  });

  test("this month isn't counted again once it's been paid", () => {
    const p = projectTaxYearContributions([monthlyPension()], new Date(2026, 9, 28)); // Oct paid on the 25th
    expect(p.monthsRemaining).toBe(5); // Nov–Mar
  });

  test('nothing left to project in the final days of the tax year', () => {
    const p = projectTaxYearContributions([monthlyPension()], new Date(2027, 3, 3)); // 3 Apr 2027
    expect(p.monthsRemaining).toBe(0);
  });

  test('ignores contributions from previous tax years in paid-so-far', () => {
    const p = projectTaxYearContributions([{ paymentHistory: [{ date: '2026-03-20', amount: 9000 }] }], new Date(2026, 4, 1));
    expect(p.paidSoFar).toBe(0);
  });
});
