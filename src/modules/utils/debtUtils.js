/**
 * Debt Management Utility Functions
 *
 * Implements debt repayment strategies (Snowball, Avalanche) and amortization calculations
 * following UK financial standards with accurate interest calculations.
 */

/**
 * Calculate monthly payment for a debt using amortization formula
 * @param {number} balance - Outstanding balance in £
 * @param {number} annualRate - Annual interest rate as percentage (e.g., 18.9)
 * @param {number} months - Number of months to pay off
 * @returns {number} Monthly payment amount
 */
export const calculateMonthlyPayment = (balance, annualRate, months) => {
  if (balance <= 0 || months <= 0) return 0;
  if (annualRate === 0) return balance / months;

  const monthlyRate = annualRate / 100 / 12;
  const payment = balance * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                  (Math.pow(1 + monthlyRate, months) - 1);

  return Math.round(payment * 100) / 100;
};

/**
 * Generate amortization schedule for a single debt
 * @param {Object} debt - Debt object with balance, interestRate, payment
 * @returns {Array} Array of payment schedule objects
 */
export const generateAmortizationSchedule = (debt) => {
  const { balance, interestRate, currentPayment, minimumPayment } = debt;
  const payment = currentPayment || minimumPayment;
  const monthlyRate = interestRate / 100 / 12;

  let remainingBalance = balance;
  const schedule = [];
  let month = 0;

  while (remainingBalance > 0.01 && month < 600) { // Max 50 years
    month++;
    const interestCharge = remainingBalance * monthlyRate;
    const principalPayment = Math.min(payment - interestCharge, remainingBalance);

    // If payment doesn't cover interest, debt will never be paid off
    if (principalPayment <= 0) {
      return {
        schedule: [],
        error: 'Payment does not cover minimum interest. Debt cannot be repaid with current payment.'
      };
    }

    remainingBalance -= principalPayment;

    schedule.push({
      month,
      date: getMonthDate(month),
      paymentAmount: Math.min(payment, remainingBalance + interestCharge + principalPayment),
      interestPaid: Math.round(interestCharge * 100) / 100,
      principalPaid: Math.round(principalPayment * 100) / 100,
      remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100)
    });
  }

  return { schedule, error: null };
};

/**
 * Calculate debt-free date from current date
 * @param {number} months - Number of months until debt-free
 * @returns {string} Formatted date string (e.g., "July 2029")
 */
const getMonthDate = (monthsFromNow) => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
};

/**
 * Snowball Strategy: Prioritize debts by lowest balance first
 * Allocate extra payments to smallest debt while maintaining minimums on others
 *
 * @param {Array} debts - Array of debt objects
 * @param {number} monthlyBudget - Total monthly budget for debt repayment
 * @returns {Object} Repayment plan with timeline and total interest
 */
export const calculateSnowballStrategy = (debts, monthlyBudget) => {
  // Sort by balance (lowest first)
  const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
  return calculateDebtRepayment(sortedDebts, monthlyBudget, 'Snowball');
};

/**
 * Avalanche Strategy: Prioritize debts by highest interest rate first
 * Allocate extra payments to highest rate debt while maintaining minimums on others
 *
 * @param {Array} debts - Array of debt objects
 * @param {number} monthlyBudget - Total monthly budget for debt repayment
 * @returns {Object} Repayment plan with timeline and total interest
 */
export const calculateAvalancheStrategy = (debts, monthlyBudget) => {
  // Sort by interest rate (highest first)
  const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);
  return calculateDebtRepayment(sortedDebts, monthlyBudget, 'Avalanche');
};

/**
 * Core debt repayment calculation engine
 * Implements waterfall payment allocation strategy
 *
 * @param {Array} sortedDebts - Debts sorted by priority
 * @param {number} monthlyBudget - Total monthly budget
 * @param {string} strategyName - Name of strategy for tracking
 * @returns {Object} Complete repayment plan with schedules and totals
 */
const calculateDebtRepayment = (sortedDebts, monthlyBudget, strategyName) => {
  // Validate minimum payments
  const totalMinimums = sortedDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  if (monthlyBudget < totalMinimums) {
    return {
      error: `Monthly budget (£${monthlyBudget}) is less than total minimum payments (£${totalMinimums}).`,
      debtFreeDate: null,
      totalInterest: 0,
      totalPaid: 0,
      monthsToPayoff: 0,
      schedule: []
    };
  }

  // Clone debts to avoid mutation
  let activeDebts = sortedDebts.map(debt => ({
    ...debt,
    remainingBalance: debt.balance,
    totalInterestPaid: 0,
    totalPrincipalPaid: 0,
    paidOff: false,
    payoffMonth: null
  }));

  const globalSchedule = [];
  let month = 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  while (activeDebts.some(d => !d.paidOff) && month < 600) {
    month++;
    let remainingBudget = monthlyBudget;
    const monthSchedule = {
      month,
      date: getMonthDate(month),
      payments: [],
      totalPayment: 0,
      totalInterest: 0,
      totalPrincipal: 0,
      remainingDebts: 0
    };

    // Step 1: Pay minimums on all debts
    activeDebts.forEach(debt => {
      if (debt.paidOff) return;

      const monthlyRate = debt.interestRate / 100 / 12;
      const interestCharge = debt.remainingBalance * monthlyRate;
      const minimumPayment = Math.min(debt.minimumPayment, debt.remainingBalance + interestCharge);
      const principalFromMinimum = minimumPayment - interestCharge;

      debt.remainingBalance -= principalFromMinimum;
      debt.totalInterestPaid += interestCharge;
      debt.totalPrincipalPaid += principalFromMinimum;
      remainingBudget -= minimumPayment;

      monthSchedule.payments.push({
        debtName: debt.debtName,
        payment: minimumPayment,
        interest: interestCharge,
        principal: principalFromMinimum,
        remainingBalance: Math.max(0, debt.remainingBalance),
        type: 'minimum'
      });

      totalInterestPaid += interestCharge;
      totalPrincipalPaid += principalFromMinimum;
    });

    // Step 2: Allocate remaining budget to priority debt (first unpaid debt in sorted order)
    if (remainingBudget > 0.01) {
      const priorityDebt = activeDebts.find(d => !d.paidOff && d.remainingBalance > 0);

      if (priorityDebt) {
        const extraPayment = Math.min(remainingBudget, priorityDebt.remainingBalance);
        priorityDebt.remainingBalance -= extraPayment;
        priorityDebt.totalPrincipalPaid += extraPayment;
        totalPrincipalPaid += extraPayment;
        remainingBudget -= extraPayment;

        monthSchedule.payments.push({
          debtName: priorityDebt.debtName,
          payment: extraPayment,
          interest: 0,
          principal: extraPayment,
          remainingBalance: Math.max(0, priorityDebt.remainingBalance),
          type: 'extra'
        });
      }
    }

    // Step 3: Mark debts as paid off
    activeDebts.forEach(debt => {
      if (!debt.paidOff && debt.remainingBalance <= 0.01) {
        debt.paidOff = true;
        debt.payoffMonth = month;
        debt.remainingBalance = 0;
      }
    });

    monthSchedule.totalPayment = monthlyBudget - remainingBudget;
    monthSchedule.totalInterest = monthSchedule.payments.reduce((sum, p) => sum + p.interest, 0);
    monthSchedule.totalPrincipal = monthSchedule.payments.reduce((sum, p) => sum + p.principal, 0);
    monthSchedule.remainingDebts = activeDebts.filter(d => !d.paidOff).length;

    globalSchedule.push(monthSchedule);
  }

  const debtFreeDate = getMonthDate(month);
  const totalDebt = sortedDebts.reduce((sum, debt) => sum + debt.balance, 0);

  return {
    error: null,
    strategy: strategyName,
    debtFreeDate,
    monthsToPayoff: month,
    totalDebt,
    totalInterest: Math.round(totalInterestPaid * 100) / 100,
    totalPaid: Math.round((totalDebt + totalInterestPaid) * 100) / 100,
    schedule: globalSchedule,
    debtDetails: activeDebts.map(debt => ({
      debtName: debt.debtName,
      originalBalance: debt.balance,
      interestRate: debt.interestRate,
      totalInterestPaid: Math.round(debt.totalInterestPaid * 100) / 100,
      payoffMonth: debt.payoffMonth,
      payoffDate: debt.payoffMonth ? getMonthDate(debt.payoffMonth) : null
    }))
  };
};

/**
 * Compare repayment strategies and calculate savings
 * @param {Array} debts - Array of debt objects
 * @param {number} monthlyBudget - Total monthly budget
 * @returns {Object} Comparison of Snowball vs Avalanche with savings analysis
 */
export const compareStrategies = (debts, monthlyBudget) => {
  const snowball = calculateSnowballStrategy(debts, monthlyBudget);
  const avalanche = calculateAvalancheStrategy(debts, monthlyBudget);

  const interestSaved = snowball.totalInterest - avalanche.totalInterest;
  const monthsSaved = snowball.monthsToPayoff - avalanche.monthsToPayoff;

  return {
    snowball,
    avalanche,
    comparison: {
      interestSaved: Math.round(interestSaved * 100) / 100,
      monthsSaved,
      recommendedStrategy: interestSaved > 0 ? 'Avalanche' : 'Snowball',
      savingsMessage: interestSaved > 0
        ? `Switching to Avalanche could save you £${Math.abs(Math.round(interestSaved))} in interest and ${Math.abs(monthsSaved)} months.`
        : `Snowball provides faster psychological wins with similar costs.`
    }
  };
};

/**
 * Calculate progress metrics for existing debt repayment
 * @param {Array} debts - Current debts with original balances
 * @returns {Object} Progress statistics
 */
export const calculateProgress = (debts) => {
  const totalOriginal = debts.reduce((sum, debt) => sum + (debt.originalBalance || debt.balance), 0);
  const totalRemaining = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalPaid = totalOriginal - totalRemaining;
  const percentPaid = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

  return {
    totalOriginal: Math.round(totalOriginal * 100) / 100,
    totalRemaining: Math.round(totalRemaining * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    percentPaid: Math.round(percentPaid * 100) / 100,
    debtsRemaining: debts.filter(d => d.balance > 0).length,
    debtsPaidOff: debts.filter(d => d.balance === 0).length
  };
};

/**
 * Validate debt input data
 * @param {Object} debt - Debt object to validate
 * @returns {Object} Validation result with errors array
 */
export const validateDebt = (debt) => {
  const errors = [];

  if (!debt.debtName || debt.debtName.trim() === '') {
    errors.push('Debt name is required');
  }

  if (debt.balance === undefined || debt.balance < 0) {
    errors.push('Balance must be a positive number');
  }

  if (debt.interestRate === undefined || debt.interestRate < 0 || debt.interestRate > 100) {
    errors.push('Interest rate must be between 0 and 100');
  }

  if (debt.minimumPayment === undefined || debt.minimumPayment < 0) {
    errors.push('Minimum payment must be a positive number');
  }

  // Check if minimum payment covers at least some interest
  if (debt.balance && debt.interestRate && debt.minimumPayment) {
    const monthlyInterest = (debt.balance * debt.interestRate / 100) / 12;
    if (debt.minimumPayment <= monthlyInterest) {
      errors.push('Minimum payment must exceed monthly interest charges');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
