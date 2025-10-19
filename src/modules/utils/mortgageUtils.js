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
