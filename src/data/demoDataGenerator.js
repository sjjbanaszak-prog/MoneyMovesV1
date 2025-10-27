import dayjs from 'dayjs';

/**
 * Generate realistic fluctuating value with natural variation
 * @param {number} baseValue - Starting value
 * @param {number} trend - Annual growth rate (e.g., 0.05 for 5%)
 * @param {number} volatility - How much it can vary (0-1, where 0.1 = ±10%)
 * @returns {number} Adjusted value
 */
export function addNaturalVariation(baseValue, trend = 0, volatility = 0.1) {
  const trendFactor = 1 + trend;
  const randomVariation = 1 + (Math.random() - 0.5) * 2 * volatility;
  return baseValue * trendFactor * randomVariation;
}

/**
 * Generate monthly salary with realistic variations
 * @param {number} annualSalary - Base annual salary
 * @param {number} month - Month of year (0-11)
 * @returns {number} Monthly salary amount
 */
export function generateMonthlySalary(annualSalary, month) {
  const baseMonthlySalary = annualSalary / 12;

  // December often has bonus/extra payments
  if (month === 11) {
    return baseMonthlySalary * (1.1 + Math.random() * 0.3); // 10-40% bonus
  }

  // Small natural variations
  return baseMonthlySalary * (0.98 + Math.random() * 0.04);
}

/**
 * Generate realistic pension contribution history
 * @param {number} years - Number of years of history
 * @param {number} currentSalary - Current annual salary
 * @param {number} currentContribRate - Current contribution rate (e.g., 0.10 for 10%)
 * @returns {Array} Array of {date, amount, balance} objects
 */
export function generatePensionHistory(years, currentSalary, currentContribRate, startingBalance = 0) {
  const history = [];
  let runningBalance = startingBalance;
  const startDate = dayjs().subtract(years, 'years');

  // Salary growth over time (lower in earlier years)
  const salaryAtStart = currentSalary / Math.pow(1.03, years); // Assume 3% annual growth

  for (let year = 0; year < years; year++) {
    const yearSalary = salaryAtStart * Math.pow(1.03, year);

    // Contribution rate was lower in earlier years
    const contributionRate = currentContribRate * (0.5 + (year / years) * 0.5);

    for (let month = 0; month < 12; month++) {
      const date = startDate.add(year, 'years').add(month, 'months');
      const monthlySalary = yearSalary / 12;
      const contribution = monthlySalary * contributionRate;

      // Add some months with no contribution (realistic - job changes, breaks)
      const hasContribution = Math.random() > 0.05; // 95% of months have contributions

      if (hasContribution) {
        runningBalance += contribution;

        // Add investment growth (monthly)
        const monthlyGrowth = Math.random() * 0.015; // 0-1.5% monthly (varies)
        runningBalance *= (1 + monthlyGrowth);

        history.push({
          date: date.format('DD/MM/YYYY'),
          amount: Math.round(contribution * 100) / 100,
          balance: Math.round(runningBalance * 100) / 100,
          description: 'Monthly pension contribution',
        });
      }
    }
  }

  return history;
}

/**
 * Generate realistic savings account transactions
 * @param {number} years - Number of years
 * @param {string} accountType - Type of account
 * @param {number} startBalance - Starting balance
 * @param {number} monthlyDeposit - Average monthly deposit
 * @returns {Array} Transactions array
 */
export function generateSavingsTransactions(years, accountType, startBalance, monthlyDeposit) {
  const transactions = [];
  let balance = startBalance;
  const startDate = dayjs().subtract(years, 'years');

  // Interest rate based on account type
  const annualInterestRate = accountType === 'ISA' ? 0.04 :
                            accountType === 'Savings Account' ? 0.035 : 0.02;

  // Realistic deposit descriptions (avoiding "transfer" to ensure they're counted as deposits)
  const depositDescriptions = [
    'Direct debit payment',
    'Standing order',
    'Salary deposit',
    'Monthly savings',
    'Automatic payment',
    'Regular deposit',
  ];

  for (let year = 0; year < years; year++) {
    for (let month = 0; month < 12; month++) {
      const date = startDate.add(year, 'years').add(month, 'months');

      // Monthly deposits (with some variation and occasional skipped months)
      if (Math.random() > 0.1) { // 90% of months have deposits
        const depositAmount = monthlyDeposit * (0.8 + Math.random() * 0.4);
        const description = depositDescriptions[Math.floor(Math.random() * depositDescriptions.length)];
        transactions.push({
          date: date.format('DD/MM/YYYY'),
          description: description,
          debit: null,
          credit: Math.round(depositAmount * 100) / 100,
          balance: null,
          amount: Math.round(depositAmount * 100) / 100,
        });
        balance += depositAmount;
      }

      // Occasional withdrawals (realistic behavior)
      if (Math.random() > 0.92) { // 8% chance of withdrawal
        const withdrawalAmount = balance * (0.05 + Math.random() * 0.15);
        transactions.push({
          date: date.add(Math.floor(Math.random() * 28), 'days').format('DD/MM/YYYY'),
          description: 'Withdrawal',
          debit: Math.round(withdrawalAmount * 100) / 100,
          credit: null,
          balance: null,
          amount: -Math.round(withdrawalAmount * 100) / 100,
        });
        balance -= withdrawalAmount;
      }

      // Monthly interest (end of month)
      const monthlyInterest = balance * (annualInterestRate / 12);
      transactions.push({
        date: date.endOf('month').format('DD/MM/YYYY'),
        description: 'Interest credit',
        debit: null,
        credit: Math.round(monthlyInterest * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        amount: Math.round(monthlyInterest * 100) / 100,
      });
      balance += monthlyInterest;
    }
  }

  // Sort by date and add running balance
  transactions.sort((a, b) => {
    const dateA = dayjs(a.date, 'DD/MM/YYYY');
    const dateB = dayjs(b.date, 'DD/MM/YYYY');
    return dateA.diff(dateB);
  });

  let runningBalance = startBalance;
  transactions.forEach(txn => {
    if (txn.amount) {
      runningBalance += txn.amount;
    } else if (txn.credit) {
      runningBalance += txn.credit;
    } else if (txn.debit) {
      runningBalance -= txn.debit;
    }
    txn.balance = Math.round(runningBalance * 100) / 100;
  });

  return transactions;
}

/**
 * Generate realistic investment portfolio transactions
 * @param {number} years - Number of years
 * @returns {Array} Trading 212 format transactions
 */
export function generateInvestmentTransactions(years) {
  const transactions = [];
  const startDate = dayjs().subtract(years, 'years');

  const tickers = [
    { symbol: 'VUSA', name: 'Vanguard S&P 500 UCITS ETF', type: 'ETF' },
    { symbol: 'VWRL', name: 'Vanguard FTSE All-World UCITS ETF', type: 'ETF' },
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Stock' },
    { symbol: 'VOD.L', name: 'Vodafone Group PLC', type: 'Stock' },
  ];

  // Monthly investments with varying amounts
  for (let month = 0; month < years * 12; month++) {
    const date = startDate.add(month, 'months');

    // Skip some months (realistic - not always investing)
    if (Math.random() > 0.15) {
      const ticker = tickers[Math.floor(Math.random() * tickers.length)];
      const shares = Math.floor(Math.random() * 10) + 1;
      const pricePerShare = 50 + Math.random() * 200;

      transactions.push({
        Action: 'Market buy',
        Time: date.format('YYYY-MM-DD HH:mm:ss'),
        ISIN: `GB00${Math.random().toString(36).substring(7).toUpperCase()}`,
        Ticker: ticker.symbol,
        Name: ticker.name,
        'No. of shares': shares,
        'Price / share': pricePerShare.toFixed(2),
        'Currency (Price / share)': 'GBP',
        'Exchange rate': '1',
        Result: '£' + (shares * pricePerShare).toFixed(2),
        'Currency (Result)': 'GBP',
        Total: '£' + (shares * pricePerShare).toFixed(2),
        'Currency (Total)': 'GBP',
      });
    }
  }

  return transactions;
}
