// /modules/mortgageUtils.js

// Import centralized formatters
import { formatCurrency, formatTick } from "../../utils/formatters";

// Re-export formatters for backward compatibility
export { formatCurrency, formatTick };

export const calculateMonthlyPayment = (principal, annualRate, termMonths) => {
  const monthlyRate = annualRate / 100 / 12;
  return (
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))
  );
};

export const generateAmortizationSchedule = ({
  loanAmount,
  termYears,
  initialRate,
  initialtermYears,
  expiryRate,
  regularOverpayment,
  oneOffOverpayment,
  oneOffMonth,
  frequency,
}) => {
  const totalMonths = termYears * 12;
  const initialTermMonths = initialtermYears * 12;
  const schedule = [];
  let balance = loanAmount;

  const getMonthlyRate = (rate) => rate / 100 / 12;

  const initialMonthlyPayment = calculateMonthlyPayment(
    balance,
    initialRate,
    totalMonths
  );
  const expiryMonthlyPayment = calculateMonthlyPayment(
    balance,
    expiryRate,
    totalMonths
  );

  let totalInterest = 0;
  let totalPaid = 0;

  for (let month = 1; month <= totalMonths && balance > 0.01; month++) {
    const isInitial = month <= initialTermMonths;
    const monthlyRate = getMonthlyRate(isInitial ? initialRate : expiryRate);
    const interest = balance * monthlyRate;
    const scheduledPayment = isInitial
      ? initialMonthlyPayment
      : expiryMonthlyPayment;

    const overpayment = frequency === "monthly" ? regularOverpayment : 0;
    const oneOff = month === oneOffMonth ? oneOffOverpayment : 0;

    const principal = scheduledPayment + overpayment + oneOff - interest;
    balance -= principal;

    totalInterest += interest;
    totalPaid += scheduledPayment + overpayment + oneOff;

    schedule.push({
      month,
      interest,
      principal,
      payment: scheduledPayment,
      overpayment,
      oneOff,
      balance: balance > 0 ? balance : 0,
    });
  }

  return {
    schedule,
    amortizationWithOverpay: schedule,
    monthlyPayment: initialMonthlyPayment,
    expiryPayment: expiryMonthlyPayment,
    termMonths: schedule.length,
    totalInterest,
    totalPaid,
  };
};

export const calculateCompoundSavings = (
  monthlyContribution,
  annualRate,
  months
) => {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return monthlyContribution * months;
  return (
    monthlyContribution *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
  );
};

export const calculateSavingsInterestPotential = (
  monthlyOverpayment,
  savingsRate,
  timeSavedMonths
) => {
  let total = 0;
  for (let i = 0; i < timeSavedMonths; i++) {
    const futureValue =
      monthlyOverpayment *
      Math.pow(1 + savingsRate / 100 / 12, timeSavedMonths - i);
    total += futureValue;
  }
  return total;
};

export const calculatePortingSchedule = (baseConfig, portConfig) => {
  const {
    loanAmount,
    termYears,
    initialRate,
    initialtermYears,
    expiryRate,
  } = baseConfig;

  const {
    portMonth,
    portType,
    newRate,
    newFixedTermYears,
    newRevertRate,
    newTotalTermYears,
    topUpAmount = 0,
    topUpRate = 0,
    topUpFixedTermYears = 2,
    topUpRevertRate = 0,
    fees = {},
  } = portConfig;

  const {
    ercType = "percentage",
    ercValue = 0,
    arrangementFee = 0,
    valuationFee = 0,
    legalFee = 0,
    brokerFee = 0,
    exitFee = 0,
    cashback = 0,
    addToLoan = false,
  } = fees;

  const baseSchedule = generateAmortizationSchedule({
    loanAmount,
    termYears,
    initialRate,
    initialtermYears,
    expiryRate,
    regularOverpayment: 0,
    oneOffOverpayment: 0,
    oneOffMonth: 1,
    frequency: "monthly",
  });

  const balanceAtPort = baseSchedule.schedule[portMonth - 1]?.balance ?? 0;
  if (balanceAtPort <= 0) return null;

  const ercAmount =
    ercType === "percentage"
      ? (ercValue / 100) * balanceAtPort
      : ercValue || 0;

  const totalFees =
    ercAmount +
    (arrangementFee || 0) +
    (valuationFee || 0) +
    (legalFee || 0) +
    (brokerFee || 0) +
    (exitFee || 0) -
    (cashback || 0);

  const upfrontCost = addToLoan ? 0 : Math.max(0, totalFees);
  const newLoanAmount = addToLoan
    ? balanceAtPort + Math.max(0, totalFees)
    : balanceAtPort;

  const remainingMonths = termYears * 12 - portMonth;
  const newTermYears =
    newTotalTermYears || Math.max(1, remainingMonths / 12);
  const phase1Slice = baseSchedule.schedule.slice(0, portMonth);

  if (portType === "new_property") {
    const remainingInitialMonths = Math.max(
      0,
      initialtermYears * 12 - portMonth
    );
    const portedRate =
      remainingInitialMonths > 0 ? initialRate : expiryRate;
    const portedInitialTermYears =
      remainingInitialMonths > 0
        ? remainingInitialMonths / 12
        : newTermYears;

    const portedSchedule = generateAmortizationSchedule({
      loanAmount: balanceAtPort,
      termYears: newTermYears,
      initialRate: portedRate,
      initialtermYears: portedInitialTermYears,
      expiryRate,
      regularOverpayment: 0,
      oneOffOverpayment: 0,
      oneOffMonth: 1,
      frequency: "monthly",
    });

    const topUpSchedule =
      topUpAmount > 0
        ? generateAmortizationSchedule({
            loanAmount: topUpAmount,
            termYears: newTermYears,
            initialRate: topUpRate,
            initialtermYears: topUpFixedTermYears,
            expiryRate: topUpRevertRate,
            regularOverpayment: 0,
            oneOffOverpayment: 0,
            oneOffMonth: 1,
            frequency: "monthly",
          })
        : null;

    const maxLen = Math.max(
      portedSchedule.schedule.length,
      topUpSchedule?.schedule.length || 0
    );

    const phase2Schedule = Array.from({ length: maxLen }, (_, i) => {
      const p = portedSchedule.schedule[i] || {
        interest: 0,
        principal: 0,
        payment: 0,
        balance: 0,
      };
      const t = topUpSchedule?.schedule[i] || {
        interest: 0,
        principal: 0,
        payment: 0,
        balance: 0,
      };
      return {
        month: portMonth + i + 1,
        interest: p.interest + t.interest,
        principal: p.principal + t.principal,
        payment: p.payment + t.payment,
        overpayment: 0,
        oneOff: 0,
        balance: p.balance + t.balance,
      };
    });

    const combinedSchedule = [...phase1Slice, ...phase2Schedule];
    const totalInterestAfterPort = phase2Schedule.reduce(
      (s, e) => s + e.interest,
      0
    );

    return {
      combinedSchedule,
      noPortCombined: null,
      phase1Slice,
      phase2Schedule,
      balanceAtPort,
      totalFees,
      ercAmount,
      upfrontCost,
      newLoanAmount: balanceAtPort,
      topUpLoanAmount: topUpAmount,
      portMonth,
      portType,
      newMonthlyPayment:
        portedSchedule.monthlyPayment +
        (topUpSchedule?.monthlyPayment || 0),
      newExpiryPayment:
        portedSchedule.expiryPayment +
        (topUpSchedule?.expiryPayment || 0),
      noPortMonthlyPayment: null,
      monthlySaving: null,
      totalInterestAfterPort,
      totalInterestNoPort: null,
      interestSavedByPort: null,
      breakEvenMonth: null,
    };
  }

  // Product Transfer or Remortgage
  const phase2Raw = generateAmortizationSchedule({
    loanAmount: newLoanAmount,
    termYears: newTermYears,
    initialRate: newRate,
    initialtermYears: newFixedTermYears,
    expiryRate: newRevertRate,
    regularOverpayment: 0,
    oneOffOverpayment: 0,
    oneOffMonth: 1,
    frequency: "monthly",
  });

  const phase2Schedule = phase2Raw.schedule.map((entry) => ({
    ...entry,
    month: portMonth + entry.month,
  }));

  const combinedSchedule = [...phase1Slice, ...phase2Schedule];

  // No-port comparison: at portMonth balance stays on expiryRate
  const noPortRaw = generateAmortizationSchedule({
    loanAmount: balanceAtPort,
    termYears: Math.max(1, remainingMonths / 12),
    initialRate: expiryRate,
    initialtermYears: Math.max(1, remainingMonths / 12),
    expiryRate,
    regularOverpayment: 0,
    oneOffOverpayment: 0,
    oneOffMonth: 1,
    frequency: "monthly",
  });

  const noPortPhase2 = noPortRaw.schedule.map((entry) => ({
    ...entry,
    month: portMonth + entry.month,
  }));
  const noPortCombined = [...phase1Slice, ...noPortPhase2];

  const totalInterestAfterPort = phase2Raw.totalInterest;
  const totalInterestNoPort = noPortRaw.totalInterest;

  let breakEvenMonth = null;
  if (totalFees > 0) {
    let cumSaving = 0;
    const len = Math.min(phase2Schedule.length, noPortPhase2.length);
    for (let i = 0; i < len; i++) {
      cumSaving +=
        (noPortPhase2[i]?.payment || 0) - (phase2Schedule[i]?.payment || 0);
      if (cumSaving >= totalFees) {
        breakEvenMonth = portMonth + i + 1;
        break;
      }
    }
  }

  return {
    combinedSchedule,
    noPortCombined,
    phase1Slice,
    phase2Schedule,
    balanceAtPort,
    totalFees,
    ercAmount,
    upfrontCost,
    newLoanAmount,
    portMonth,
    portType,
    newMonthlyPayment: phase2Raw.monthlyPayment,
    newExpiryPayment: phase2Raw.expiryPayment,
    noPortMonthlyPayment: noPortRaw.monthlyPayment,
    monthlySaving: noPortRaw.monthlyPayment - phase2Raw.monthlyPayment,
    totalInterestAfterPort,
    totalInterestNoPort,
    interestSavedByPort: totalInterestNoPort - totalInterestAfterPort - totalFees,
    breakEvenMonth,
  };
};
