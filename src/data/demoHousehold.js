/**
 * Demo household for Money Moves (mobile app).
 *
 * Profile: 38-year-old in Leeds, consultant at Accenture since March 2022
 * (matches DEMO_INCOMES in IncomeDataContext), partner Sarah, two children.
 *
 * Everything is simulated month by month from fixed start dates up to "today",
 * so balances always agree with the transactions behind them and the demo keeps
 * extending as time passes. A seeded PRNG keeps the numbers identical on every
 * load — no Math.random().
 *
 * Story the data tells:
 *  - Pensions: an old Aviva workplace pot (deferred since a job change), the
 *    current Scottish Widows salary sacrifice scheme with bonus sacrifice, and a
 *    Vanguard SIPP with tax-year-end top-ups. Well under the £60k allowance, so
 *    carry forward is building up.
 *  - Savings: Cash ISA, Stocks & Shares ISA, an emergency fund with real-life
 *    withdrawals, and Premium Bonds with monthly prizes.
 *  - Mortgages: a home bought Nov 2021 on a 1.79% fix that was switched in
 *    Nov 2023 (fees added to the loan) and whose current fix ends soon, plus a
 *    buy-to-let bought in 2023. Regular and lump-sum overpayments from 2024.
 */

// ---- deterministic helpers ----

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = n => Math.round(n * 100) / 100;
const pad = n => String(n).padStart(2, '0');

const isoDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const ukDate  = (y, m, d) => `${pad(d)}/${pad(m)}/${y}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const monthKey = (y, m) => `${y}-${pad(m)}`;

/** Every { y, m } from start through the current month, inclusive. */
function monthsUntil(startY, startM, today) {
  const out = [];
  let y = startY, m = startM;
  const endY = today.getFullYear(), endM = today.getMonth() + 1;
  while (y < endY || (y === endY && m <= endM)) {
    out.push({ y, m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function hasHappened(y, m, d, today) {
  return new Date(y, m - 1, d) <= today;
}

/** Latest value in a [[ 'YYYY-MM', value ], ...] schedule at or before y/m. */
function scheduleAt(schedule, y, m) {
  const key = monthKey(y, m);
  let val = schedule[0][1];
  for (const [k, v] of schedule) {
    if (k <= key) val = v;
    else break;
  }
  return val;
}

function monthlyPayment(principal, annualRatePct, years) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * r / (1 - Math.pow(1 + r, -n));
}

// ---- market returns ----
// Rough global equity calendar-year returns in GBP, spread across months with
// seeded noise. Shared by every invested account so they move together.

const ANNUAL_EQUITY_RETURN = {
  2019: 0.17, 2020: 0.09, 2021: 0.15, 2022: -0.09, 2023: 0.11,
  2024: 0.13, 2025: 0.09, 2026: 0.07, 2027: 0.06, 2028: 0.06,
};

const MARKET_RETURNS = (() => {
  const rand = mulberry32(20190401);
  const table = {};
  for (let y = 2019; y <= 2030; y++) {
    const annual = ANNUAL_EQUITY_RETURN[y] ?? 0.06;
    const base = Math.pow(1 + annual, 1 / 12) - 1;
    for (let m = 1; m <= 12; m++) {
      // Sum of uniforms ≈ normal; ±~3% monthly swings
      const noise = (rand() + rand() + rand() - 1.5) * 0.04;
      table[monthKey(y, m)] = base + noise;
    }
  }
  return table;
})();

function marketReturn(y, m, beta = 1) {
  return (MARKET_RETURNS[monthKey(y, m)] ?? 0.005) * beta;
}

// ---- pensions ----

/**
 * Simulate a pension pot. `contributionsFor(y, m)` returns the month's
 * payments; growth is applied at month end. Each payment records the pot value
 * after it lands (used by the dashboard's value series), and valueHistory holds
 * a month-end snapshot (used for per-month growth on the provider page).
 */
function simulatePension({ startY, startM, beta, contributionsFor, today }) {
  let value = 0;
  const paymentHistory = [];
  const valueHistory = [];

  monthsUntil(startY, startM, today).forEach(({ y, m }) => {
    (contributionsFor(y, m) || []).forEach(c => {
      if (!hasHappened(y, m, c.day, today)) return;
      value += c.amount;
      paymentHistory.push({
        date: isoDate(y, m, c.day),
        amount: round2(c.amount),
        description: c.description,
        type: c.type,
        balance: round2(value),
      });
    });

    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth() + 1;
    if (isCurrentMonth) {
      // Part-month growth so today's value isn't stale
      const frac = today.getDate() / daysInMonth(y, m);
      value *= 1 + marketReturn(y, m, beta) * frac;
      valueHistory.push({ date: isoDate(y, m, today.getDate()), value: round2(value) });
    } else {
      value *= 1 + marketReturn(y, m, beta);
      valueHistory.push({ date: isoDate(y, m, daysInMonth(y, m)), value: round2(value) });
    }
  });

  const deposits = round2(paymentHistory.reduce((s, p) => s + p.amount, 0));
  return {
    currentValue: round2(value),
    deposits,
    paymentHistory,
    valueHistory,
    firstPayment: paymentHistory[0]?.date || null,
    lastPayment: paymentHistory[paymentHistory.length - 1]?.date || null,
  };
}

/** Yearly totals keyed by tax-year start, for the desktop allowance chart. */
function yearlyTotals(paymentHistory) {
  const totals = {};
  paymentHistory.forEach(p => {
    const [y, m, d] = p.date.split('-').map(Number);
    const fy = (m < 4 || (m === 4 && d < 6)) ? y - 1 : y;
    totals[fy] = round2((totals[fy] || 0) + p.amount);
  });
  return totals;
}

// Salary at the previous employer, then Accenture (mirrors DEMO_INCOMES)
const PREVIOUS_SALARY = { 2019: 38000, 2020: 40000, 2021: 43000, 2022: 43000 };
const ACCENTURE_SALARY = { 2022: 52000, 2023: 56000, 2024: 60000, 2025: 63000, 2026: 65000, 2027: 65000, 2028: 65000 };

function buildPensions(today) {
  const aviva = simulatePension({
    startY: 2019, startM: 4, beta: 0.85, today,
    contributionsFor: (y, m) => {
      // Left for Accenture at the end of Feb 2022 — pot deferred since
      if (y > 2022 || (y === 2022 && m > 2)) return [];
      const monthly = PREVIOUS_SALARY[y] / 12;
      return [
        { day: 28, amount: monthly * 0.05, description: 'Employee Contribution', type: 'employee' },
        { day: 28, amount: monthly * 0.03, description: 'Employer Contribution', type: 'employer' },
      ];
    },
  });

  const scottishWidows = simulatePension({
    startY: 2022, startM: 3, beta: 0.9, today,
    contributionsFor: (y, m) => {
      const monthly = ACCENTURE_SALARY[y] / 12;
      const out = [
        { day: 25, amount: monthly * 0.05, description: 'Employee Contribution (salary sacrifice)', type: 'employee' },
        { day: 25, amount: monthly * 0.06, description: 'Employer Contribution', type: 'employer' },
      ];
      // Annual bonus paid in March, sacrificed straight into the pension
      if (m === 3 && y === 2025) out.push({ day: 25, amount: 6000, description: 'Bonus Sacrifice', type: 'one_off' });
      if (m === 3 && y === 2026) out.push({ day: 25, amount: 5500, description: 'Bonus Sacrifice', type: 'one_off' });
      return out;
    },
  });

  const vanguard = simulatePension({
    startY: 2023, startM: 6, beta: 1.05, today,
    contributionsFor: (y, m) => {
      // £200/month net, £250 gross after 20% relief at source
      const out = [{ day: 3, amount: 250, description: 'Personal (SIPP) — incl. tax relief', type: 'personal' }];
      // Tax-year-end top-ups (gross)
      if (y === 2024 && m === 3) out.push({ day: 20, amount: 4000, description: 'One-Off Payment — tax year end', type: 'one_off' });
      if (y === 2025 && m === 3) out.push({ day: 20, amount: 6250, description: 'One-Off Payment — tax year end', type: 'one_off' });
      if (y === 2026 && m === 3) out.push({ day: 20, amount: 8750, description: 'One-Off Payment — tax year end', type: 'one_off' });
      return out;
    },
  });

  return [
    {
      provider: 'Scottish Widows',
      accountType: 'Workplace Pension',
      fund: 'Scottish Widows Pension Portfolio Two',
      employeeContribution: 5,
      employerContribution: 6,
      returnRate: 6.1,
      ...scottishWidows,
      yearlyTotals: yearlyTotals(scottishWidows.paymentHistory),
    },
    {
      provider: 'Vanguard SIPP',
      accountType: 'Personal Pension (SIPP)',
      fund: 'LifeStrategy 100% Equity',
      employeeContribution: 0,
      employerContribution: 0,
      returnRate: 7.2,
      ...vanguard,
      yearlyTotals: yearlyTotals(vanguard.paymentHistory),
    },
    {
      provider: 'Aviva',
      accountType: 'Workplace Pension',
      fund: 'Aviva My Future Growth',
      employeeContribution: 5,
      employerContribution: 3,
      returnRate: 5.6,
      ...aviva,
      yearlyTotals: yearlyTotals(aviva.paymentHistory),
    },
  ];
}

// ---- savings ----

const SAVINGS_MAPPING = {
  date: 'date',
  description: 'description',
  debit: 'debit',
  credit: 'credit',
  balance: 'balance',
  amount: 'amount',
};

/**
 * Simulate a savings account. `eventsFor(y, m, balance)` returns the month's
 * deposits (+) and withdrawals (−). Cash accounts get monthly interest at month
 * end; invested accounts move with the market and pay quarterly dividends.
 */
function simulateSavings({ startY, startM, today, eventsFor, rateSchedule, beta, dividendYield, prizes }) {
  let balance = 0;
  const rows = [];
  const balanceHistory = [];
  const rand = mulberry32(startY * 100 + startM);

  const pushRow = (y, m, d, description, amount) => {
    balance += amount;
    rows.push({
      date: ukDate(y, m, d),
      description,
      debit: amount < 0 ? round2(-amount) : null,
      credit: amount > 0 ? round2(amount) : null,
      balance: round2(balance),
      amount: round2(amount),
    });
  };

  monthsUntil(startY, startM, today).forEach(({ y, m }) => {
    const lastDay = daysInMonth(y, m);
    const monthDone = hasHappened(y, m, lastDay, today);
    const events = [...(eventsFor(y, m, balance) || [])];

    if (prizes && monthDone && balance > 0) {
      // Premium Bonds: expected prize value at the prize-fund rate, paid in £25 prizes
      // (plus the odd £100), drawn on the opening balance and paid early in the month
      const expected = balance * scheduleAt(rateSchedule, y, m) / 100 / 12;
      let won = Math.round((expected / 25) * (0.4 + rand() * 1.2)) * 25;
      if (rand() > 0.9) won += 100;
      if (won > 0) events.push({ day: 1 + Math.floor(rand() * 3), amount: won, description: 'Prize (tax-free interest)' });
    }

    events
      .filter(e => hasHappened(y, m, e.day, today))
      .sort((a, b) => a.day - b.day)
      .forEach(e => pushRow(y, m, e.day, e.description, e.amount));

    if (beta) {
      const frac = monthDone ? 1 : today.getDate() / lastDay;
      balance *= 1 + marketReturn(y, m, beta) * frac;
      if (monthDone && dividendYield && m % 3 === 0) {
        pushRow(y, m, lastDay, 'Dividend reinvested', balance * dividendYield / 4);
      }
    } else if (!prizes && rateSchedule && monthDone && balance > 0) {
      const interest = balance * scheduleAt(rateSchedule, y, m) / 100 / 12;
      pushRow(y, m, lastDay, 'Interest paid', interest);
    }

    const snapDay = monthDone ? lastDay : today.getDate();
    balanceHistory.push({ date: isoDate(y, m, snapDay), value: round2(balance) });
  });

  return { rawData: rows, balanceHistory, currentBalance: round2(balance) };
}

// Approximate rates tracking the Bank Rate cycle
const CASH_ISA_RATES = [
  ['2021-11', 0.4], ['2022-06', 1.1], ['2022-11', 2.6], ['2023-06', 3.6],
  ['2023-10', 4.3], ['2024-09', 4.05], ['2025-03', 3.8], ['2025-09', 3.65], ['2026-02', 3.5],
];
const EASY_ACCESS_RATES = [
  ['2021-11', 1.0], ['2022-06', 1.5], ['2022-11', 3.0], ['2023-06', 4.1],
  ['2023-10', 4.5], ['2024-09', 4.25], ['2025-03', 4.0], ['2025-09', 3.75], ['2026-02', 3.6],
];
const PREMIUM_BOND_RATES = [
  ['2021-12', 1.0], ['2022-07', 1.4], ['2022-09', 2.2], ['2023-03', 3.3],
  ['2023-09', 4.65], ['2024-03', 4.4], ['2024-12', 4.15], ['2025-04', 3.8], ['2025-10', 3.6],
];

function buildSavings(today) {
  const cashIsa = simulateSavings({
    startY: 2021, startM: 11, today, rateSchedule: CASH_ISA_RATES,
    eventsFor: (y, m) => {
      const ev = [{ day: 2, amount: 300, description: 'Standing order' }];
      if (y === 2021 && m === 11) ev.push({ day: 1, amount: 6000, description: 'Opening deposit' });
      if (y === 2022 && m === 8) ev.push({ day: 14, amount: -3500, description: 'Withdrawal — garden landscaping' });
      if (m === 4 && y === 2023) ev.push({ day: 10, amount: 2000, description: 'ISA top-up — new tax year' });
      if (m === 4 && y === 2025) ev.push({ day: 8, amount: 3000, description: 'ISA top-up — new tax year' });
      if (m === 4 && y === 2026) ev.push({ day: 7, amount: 2500, description: 'ISA top-up — new tax year' });
      return ev;
    },
  });

  const ssIsa = simulateSavings({
    startY: 2022, startM: 1, today, beta: 1, dividendYield: 0.018,
    eventsFor: y => {
      const monthly = y === 2022 ? 400 : y === 2023 ? 500 : 750;
      return [{ day: 1, amount: monthly, description: 'Monthly direct debit' }];
    },
  });

  const easyAccess = simulateSavings({
    startY: 2021, startM: 11, today, rateSchedule: EASY_ACCESS_RATES,
    eventsFor: (y, m) => {
      const ev = [{ day: 28, amount: 250, description: 'Monthly savings' }];
      if (y === 2021 && m === 11) ev.push({ day: 1, amount: 3000, description: 'Opening deposit' });
      if (y === 2023 && m === 2)  ev.push({ day: 9,  amount: -1850, description: 'Withdrawal — car repair' });
      if (y === 2024 && m === 7)  ev.push({ day: 3,  amount: -2400, description: 'Withdrawal — holiday, Portugal' });
      if (y === 2026 && m === 1)  ev.push({ day: 16, amount: -3200, description: 'Withdrawal — new boiler' });
      return ev;
    },
  });

  const premiumBonds = simulateSavings({
    startY: 2021, startM: 12, today, rateSchedule: PREMIUM_BOND_RATES, prizes: true,
    eventsFor: (y, m) => {
      if (y === 2021 && m === 12) return [{ day: 6, amount: 10000, description: 'Bond purchase' }];
      if (y === 2023 && m === 4)  return [{ day: 18, amount: 5000, description: 'Bond purchase' }];
      if (y === 2024 && m === 12) return [{ day: 11, amount: 5000, description: 'Bond purchase' }];
      return [];
    },
  });

  const base = { dateFormat: 'DD/MM/YYYY', mapping: SAVINGS_MAPPING, confirmed: true, uploadDate: today.toISOString() };

  return [
    { ...base, accountName: 'Cash ISA', bank: 'Nationwide', accountType: 'Cash ISA', interestRate: 3.5, ...cashIsa },
    { ...base, accountName: 'Stocks & Shares ISA', bank: 'Vanguard', accountType: 'Stocks & Shares ISA', interestRate: null, ...ssIsa },
    { ...base, accountName: 'Emergency Fund', bank: 'Chase', accountType: 'Easy Access', interestRate: 3.6, ...easyAccess },
    { ...base, accountName: 'Premium Bonds', bank: 'NS&I', accountType: 'Premium Bonds', interestRate: 3.6, ...premiumBonds },
  ];
}

// ---- mortgages ----

// Yorkshire & the Humber-ish annual house price growth
const ANNUAL_HPI = { 2021: 0.08, 2022: 0.075, 2023: -0.01, 2024: 0.035, 2025: 0.045, 2026: 0.03, 2027: 0.03, 2028: 0.03 };

/** Quarterly valuations from purchase to today, rounded to the nearest £500. */
function propertyValues(purchasePrice, startY, startM, today) {
  let value = purchasePrice;
  const history = [];
  monthsUntil(startY, startM, today).forEach(({ y, m }, i) => {
    if (i === 0) return;
    value *= Math.pow(1 + (ANNUAL_HPI[y] ?? 0.03), 1 / 12);
    if (m % 3 === 1) {
      history.push({ date: isoDate(y, m, 15), value: Math.round(value / 500) * 500 });
    }
  });
  return { propertyValue: Math.round(value / 500) * 500, propertyValueHistory: history };
}

/**
 * Amortize month by month with payments on the 1st. Uses the same convention as
 * historicalMortgageBalance: B[k] = B[k-1] × (1 + r) − payment − overpayment[k].
 */
function amortize({ balance, ratePct, payment, startY, startM, untilY, untilM, today, overpaymentsFor, paymentHistory }) {
  const r = ratePct / 100 / 12;
  monthsUntil(startY, startM, today).forEach(({ y, m }, i) => {
    if (i === 0) return; // completion month — first payment the month after
    if (untilY && (y > untilY || (y === untilY && m > untilM))) return;
    if (!hasHappened(y, m, 1, today)) return;
    balance = balance * (1 + r) - payment;
    paymentHistory.push({ date: isoDate(y, m, 1), amount: round2(payment), description: 'Monthly Payment', type: 'monthly' });
    (overpaymentsFor?.(y, m) || []).forEach(o => {
      balance -= o.amount;
      paymentHistory.push({ date: isoDate(y, m, o.day), amount: o.amount, description: o.description, type: o.type });
    });
  });
  return balance;
}

function buildMortgages(today) {
  // ── 12 Oak Street: bought Nov 2021, switched Nationwide → Halifax Nov 2023 ──
  const oakPayments = [];
  const oakOriginal = { lender: 'Nationwide', amount: 250000, rate: 1.79, defaultRate: 7.24, termYears: 30, startDate: '2021-11-01' };
  const oakOriginalPayment = round2(monthlyPayment(oakOriginal.amount, oakOriginal.rate, oakOriginal.termYears));

  const redemptionBalance = round2(amortize({
    balance: oakOriginal.amount, ratePct: oakOriginal.rate, payment: oakOriginalPayment,
    startY: 2021, startM: 11, untilY: 2023, untilM: 11, today, paymentHistory: oakPayments,
  }));
  const exitFee = 95;
  const totalRedemption = round2(redemptionBalance + exitFee);
  const switchDate = '2023-11-15';
  const productFee = 999;
  const halifax = { rate: 4.89, defaultRate: 7.49, termYears: 28, fixedTermYears: 3, fixedEnd: '2026-11-30' };
  const halifaxBalance = round2(totalRedemption + productFee);
  const halifaxPayment = round2(monthlyPayment(halifaxBalance, halifax.rate, halifax.termYears));

  oakPayments.push({ date: switchDate, amount: 0, description: 'Switch: Nationwide → Halifax', type: 'switch' });

  const oakBalance = round2(amortize({
    balance: halifaxBalance, ratePct: halifax.rate, payment: halifaxPayment,
    startY: 2023, startM: 11, today, paymentHistory: oakPayments,
    overpaymentsFor: (y, m) => {
      const out = [];
      if (y > 2024 || (y === 2024 && m >= 6)) out.push({ day: 1, amount: 200, description: 'Regular Overpayment', type: 'overpayment' });
      if (y === 2025 && m === 4) out.push({ day: 22, amount: 5000, description: 'Lump Sum Overpayment', type: 'lump_sum' });
      return out;
    },
  }));

  const oak = {
    name: '12 Oak Street',
    postcode: 'LS6 4QR',
    type: 'Residential',
    lender: 'Halifax',
    purchasePrice: 295000,
    ...propertyValues(295000, 2021, 11, today),
    mortgageAmount: halifaxBalance,
    outstandingBalance: oakBalance,
    monthlyPayment: halifaxPayment,
    fees: productFee,
    startDate: switchDate,
    termYears: halifax.termYears,
    fixedRateStartDate: switchDate,
    fixedTermYears: halifax.fixedTermYears,
    fixedRateEndDate: halifax.fixedEnd,
    interestRate: halifax.rate,
    defaultRate: halifax.defaultRate,
    paymentHistory: oakPayments,
    switchHistory: [{
      switchDate,
      previousLender: oakOriginal.lender,
      previousRate: oakOriginal.rate,
      previousDefaultRate: oakOriginal.defaultRate,
      previousBalance: redemptionBalance,
      previousTermYears: oakOriginal.termYears,
      previousStartDate: oakOriginal.startDate,
      previousMonthlyPayment: oakOriginalPayment,
      redemption: {
        outstandingBalance: redemptionBalance,
        earlyRepaymentCharge: 0,
        exitFee,
        totalRedemptionAmount: totalRedemption,
      },
      completion: {
        newLender: 'Halifax',
        newMortgageAdvance: totalRedemption,
        newInterestRate: halifax.rate,
        newDefaultRate: halifax.defaultRate,
        newTermYears: halifax.termYears,
        newFixedTermYears: halifax.fixedTermYears,
        newFixedRateEndDate: halifax.fixedEnd,
        newMonthlyPayment: halifaxPayment,
        feesPayableOnCompletion: 0,
        feesAddedToLoan: productFee,
      },
      cashReleasedToClient: 0,
    }],
  };

  // ── 4 Maple Avenue: buy-to-let bought Jun 2023 on a 5-year fix ──
  const maplePayments = [];
  const maple = { amount: 123750, rate: 5.49, termYears: 25 };
  const maplePayment = round2(monthlyPayment(maple.amount, maple.rate, maple.termYears));
  const mapleBalance = round2(amortize({
    balance: maple.amount, ratePct: maple.rate, payment: maplePayment,
    startY: 2023, startM: 6, today, paymentHistory: maplePayments,
  }));

  const mapleAve = {
    name: '4 Maple Avenue',
    postcode: 'LS4 2PS',
    type: 'Buy-to-Let',
    lender: 'The Mortgage Works',
    purchasePrice: 165000,
    ...propertyValues(165000, 2023, 6, today),
    mortgageAmount: maple.amount,
    outstandingBalance: mapleBalance,
    monthlyPayment: maplePayment,
    fees: 1495,
    startDate: '2023-06-01',
    termYears: maple.termYears,
    fixedRateStartDate: '2023-06-01',
    fixedTermYears: 5,
    fixedRateEndDate: '2028-05-31',
    interestRate: maple.rate,
    defaultRate: 8.24,
    paymentHistory: maplePayments,
  };

  return [oak, mapleAve];
}

// ---- public API ----

export function buildDemoHousehold(today = new Date()) {
  const pensions = buildPensions(today);
  const savings = buildSavings(today);
  return {
    pensionPots: { currentAge: 38, retirementAge: 67, entries: pensions },
    savingsTracker: { uploads: savings, selectedAccounts: savings.map(a => a.accountName) },
    mortgages: buildMortgages(today),
  };
}
