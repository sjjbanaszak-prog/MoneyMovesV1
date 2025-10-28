/**
 * Transaction Categorization Utility
 *
 * Automatically categorizes debt transactions based on merchant names and descriptions.
 * UK-specific merchant database with pattern matching.
 */

// UK Merchant & Category Database
export const CATEGORIES = {
  GROCERIES: 'Groceries',
  EATING_OUT: 'Eating Out',
  TRANSPORT: 'Transport',
  SHOPPING: 'Shopping',
  BILLS: 'Bills & Utilities',
  ENTERTAINMENT: 'Entertainment',
  HEALTH: 'Health & Wellbeing',
  HOME: 'Home & Garden',
  TRAVEL: 'Travel',
  SUBSCRIPTIONS: 'Subscriptions',
  CASH: 'Cash Withdrawal',
  OTHER: 'Other'
};

// UK Merchant patterns (case-insensitive)
const MERCHANT_PATTERNS = {
  [CATEGORIES.GROCERIES]: [
    'tesco', 'sainsbury', 'asda', 'morrisons', 'aldi', 'lidl', 'waitrose',
    'marks & spencer', 'm&s', 'iceland', 'co-op', 'coop', 'farmfoods',
    'spar', 'budgens', 'nisa', 'premier', 'londis', 'costcutter',
    'ocado', 'grocery', 'supermarket'
  ],

  [CATEGORIES.EATING_OUT]: [
    'restaurant', 'cafe', 'coffee', 'starbucks', 'costa', 'nero', 'pret',
    'mcdonald', 'burger king', 'kfc', 'subway', 'nando', 'pizza hut',
    'domino', 'greggs', 'wetherspoon', 'pub', 'bar', 'takeaway',
    'deliveroo', 'uber eats', 'just eat', 'food', 'dining', 'grill',
    'pizzaexpress', 'wagamama', 'zizzi', 'bella italia', 'carluccio',
    'five guys', 'chipotle', 'yo! sushi', 'itsu', 'leon', 'caffe', 'bennett hay', 'burger', 'bakery',
    'greeneking', 'harvest moon'
  ],

  [CATEGORIES.TRANSPORT]: [
    'shell', 'bp', 'esso', 'texaco', 'total', 'sainsbury petrol',
    'tesco fuel', 'asda petrol', 'morrisons petrol', 'petrol', 'fuel',
    'national rail', 'trainline', 'tfl', 'transport for london', 'oyster',
    'uber', 'taxi', 'parking', 'car park', 'ncp', 'dvla', 'mot',
    'halfords', 'kwik fit', 'euro car parts', 'insurance', 'breakdown', 'snb', 'rontec'
  ],

  [CATEGORIES.SHOPPING]: [
    'amazon', 'ebay', 'asos', 'next', 'h&m', 'zara', 'primark', 'tkmaxx',
    'john lewis', 'debenhams', 'house of fraser', 'selfridges', 'harrods',
    'argos', 'currys', 'pc world', 'dixons', 'carphone warehouse',
    'boots', 'superdrug', 'wilko', 'poundland', 'home bargains',
    'b&m', 'the range', 'sports direct', 'jd sports', 'decathlon',
    'ikea', 'dunelm', 'homebase', 'wickes', 'screwfix', 'toolstation',
    'clothes', 'clothing', 'fashion', 'retail', 'store', 'shop'
  ],

  [CATEGORIES.BILLS]: [
    'british gas', 'scottish power', 'edf', 'e.on', 'ovo', 'bulb',
    'octopus energy', 'utility', 'water', 'thames water', 'severn trent',
    'council tax', 'tv licence', 'television licensing', 'bbc',
    'vodafone', 'ee', 'o2', 'three', 'bt', 'sky', 'virgin media',
    'talktalk', 'plusnet', 'phone', 'broadband', 'internet'
  ],

  [CATEGORIES.ENTERTAINMENT]: [
    'cinema', 'odeon', 'vue', 'cineworld', 'showcase', 'picturehouse',
    'netflix', 'amazon prime', 'disney', 'spotify', 'apple music',
    'sky tv', 'now tv', 'youtube', 'steam', 'playstation', 'xbox',
    'theatre', 'concert', 'ticket', 'eventim', 'ticketmaster',
    'gym', 'fitness', 'puregym', 'the gym', 'virgin active', 'david lloyd'
  ],

  [CATEGORIES.HEALTH]: [
    'pharmacy', 'chemist', 'doctor', 'dentist', 'optician', 'specsavers',
    'vision express', 'bupa', 'private healthcare', 'medical', 'hospital',
    'nhs', 'prescription', 'medicine', 'health', 'wellbeing', 'smile design', 'hollandbarr'
  ],

  [CATEGORIES.HOME]: [
    'b&q', 'homebase', 'wickes', 'screwfix', 'toolstation', 'diy',
    'ikea', 'dunelm', 'the range', 'garden centre', 'gardening',
    'furniture', 'carpetright', 'dfs', 'sofology', 'plumber',
    'electrician', 'builder', 'decorator', 'cleaner', 'home improvement'
  ],

  [CATEGORIES.TRAVEL]: [
    'easyjet', 'ryanair', 'british airways', 'airline', 'flight',
    'booking.com', 'airbnb', 'hotel', 'travelodge', 'premier inn',
    'holiday inn', 'accommodation', 'travel agent', 'thomas cook',
    'tui', 'expedia', 'lastminute', 'skyscanner', 'trainline', 'eurostar', 'vaa', 'virgin atlantic', 'snb'
  ],

  [CATEGORIES.SUBSCRIPTIONS]: [
    'subscription', 'membership', 'monthly', 'annual fee', 'amazon prime',
    'netflix', 'spotify', 'disney+', 'apple', 'microsoft', 'adobe',
    'dropbox', 'icloud', 'google one', 'onedrive'
  ],

  [CATEGORIES.CASH]: [
    'cash', 'atm', 'cashpoint', 'withdrawal', 'link', 'cash machine'
  ]
};

/**
 * Categorize a transaction based on merchant name and description
 * @param {string} description - Transaction description or merchant name
 * @returns {string} Category name
 */
export function categorizeTransaction(description) {
  if (!description || typeof description !== 'string') {
    return CATEGORIES.OTHER;
  }

  const lowerDesc = description.toLowerCase();

  // Try to match against merchant patterns
  for (const [category, patterns] of Object.entries(MERCHANT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerDesc.includes(pattern)) {
        return category;
      }
    }
  }

  return CATEGORIES.OTHER;
}

/**
 * Categorize multiple transactions
 * @param {Array} transactions - Array of transaction objects with description field
 * @returns {Array} Transactions with added category field
 */
export function categorizeTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    return [];
  }

  return transactions.map(transaction => ({
    ...transaction,
    category: categorizeTransaction(transaction.description || '')
  }));
}

/**
 * Group transactions by category with totals
 * @param {Array} transactions - Array of categorized transactions
 * @returns {Object} Object with categories as keys and {total, count, transactions} as values
 */
export function groupByCategory(transactions) {
  const grouped = {};

  // Initialize all categories
  Object.values(CATEGORIES).forEach(category => {
    grouped[category] = {
      total: 0,
      count: 0,
      transactions: []
    };
  });

  // Group transactions
  transactions.forEach(transaction => {
    const category = transaction.category || CATEGORIES.OTHER;
    const amount = Math.abs(transaction.amount || 0);

    if (!grouped[category]) {
      grouped[category] = { total: 0, count: 0, transactions: [] };
    }

    grouped[category].total += amount;
    grouped[category].count += 1;
    grouped[category].transactions.push(transaction);
  });

  return grouped;
}

/**
 * Get top spending categories
 * @param {Object} groupedTransactions - Result from groupByCategory
 * @param {number} limit - Number of top categories to return
 * @returns {Array} Array of {category, total, count, percentage}
 */
export function getTopCategories(groupedTransactions, limit = 5) {
  const totalSpending = Object.values(groupedTransactions)
    .reduce((sum, cat) => sum + cat.total, 0);

  return Object.entries(groupedTransactions)
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalSpending > 0 ? (data.total / totalSpending) * 100 : 0
    }))
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/**
 * Analyze spending patterns by day of week
 * @param {Array} transactions - Array of transactions with transactionDate
 * @returns {Object} Spending by day of week
 */
export function analyzeByDayOfWeek(transactions) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byDay = {};

  dayNames.forEach(day => {
    byDay[day] = { total: 0, count: 0 };
  });

  transactions.forEach(transaction => {
    if (!transaction.transactionDate) return;

    const date = new Date(transaction.transactionDate);
    if (isNaN(date.getTime())) return;

    const dayName = dayNames[date.getDay()];
    const amount = Math.abs(transaction.amount || 0);

    byDay[dayName].total += amount;
    byDay[dayName].count += 1;
  });

  return byDay;
}

/**
 * Detect spending patterns and anomalies
 * @param {Array} transactions - Array of categorized transactions
 * @returns {Object} Pattern analysis results
 */
export function detectSpendingPatterns(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      patterns: [],
      anomalies: [],
      insights: []
    };
  }

  const patterns = [];
  const anomalies = [];
  const insights = [];

  // Group by category
  const grouped = groupByCategory(transactions);
  const topCategories = getTopCategories(grouped, 5);

  // Day of week analysis
  const byDay = analyzeByDayOfWeek(transactions);
  const highSpendingDays = Object.entries(byDay)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 2);

  if (highSpendingDays.length > 0) {
    patterns.push({
      type: 'day-pattern',
      title: 'Peak Spending Days',
      description: `You spend most on ${highSpendingDays.map(([day]) => day).join(' and ')}`,
      data: highSpendingDays
    });
  }

  // Check for frequent small purchases (impulse buying indicator)
  const smallPurchases = transactions.filter(t => Math.abs(t.amount) < 20);
  if (smallPurchases.length > transactions.length * 0.3) {
    insights.push({
      type: 'impulse-buying',
      severity: 'medium',
      title: 'Frequent Small Purchases Detected',
      description: `${smallPurchases.length} transactions under £20 (${Math.round((smallPurchases.length / transactions.length) * 100)}% of total)`,
      suggestion: 'Consider enforcing a minimum purchase amount to reduce impulse buying'
    });
  }

  // Check for late-night spending (emotional spending indicator)
  const lateNightSpending = transactions.filter(t => {
    if (!t.transactionDate) return false;
    const date = new Date(t.transactionDate);
    const hour = date.getHours();
    return hour >= 20 || hour < 6; // 8pm - 6am
  });

  if (lateNightSpending.length > transactions.length * 0.2) {
    insights.push({
      type: 'late-night-spending',
      severity: 'medium',
      title: 'Late-Night Spending Pattern',
      description: `${lateNightSpending.length} transactions between 8pm-6am`,
      suggestion: 'Late-night purchases are often impulse buys. Try waiting until morning to make decisions.'
    });
  }

  // Check for high spending in specific categories
  topCategories.forEach(cat => {
    if (cat.percentage > 30) {
      insights.push({
        type: 'high-category-spend',
        severity: 'high',
        title: `High ${cat.category} Spending`,
        description: `${cat.category} represents ${cat.percentage.toFixed(0)}% of your spending (£${cat.total.toFixed(2)})`,
        suggestion: `Consider ways to reduce ${cat.category} costs`
      });
    }
  });

  return {
    patterns,
    anomalies,
    insights,
    topCategories,
    byDay
  };
}

/**
 * Generate AI-style insights from spending patterns
 * @param {Array} transactions - Array of categorized transactions
 * @param {Object} debt - Current debt information
 * @returns {Array} Array of insight objects
 */
export function generateSpendingInsights(transactions, debt = {}) {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const insights = [];
  const { insights: patternInsights, topCategories, byDay } = detectSpendingPatterns(transactions);

  // Add pattern-based insights
  insights.push(...patternInsights);

  // Category-specific suggestions
  const eatingOut = topCategories.find(c => c.category === CATEGORIES.EATING_OUT);
  if (eatingOut && eatingOut.total > 150) {
    const mealCount = eatingOut.count;
    const avgMeal = eatingOut.total / mealCount;
    insights.push({
      type: 'eating-out',
      severity: 'medium',
      title: 'Eating Out Opportunity',
      description: `${mealCount} restaurant/takeaway purchases (£${eatingOut.total.toFixed(2)}, avg £${avgMeal.toFixed(2)}/meal)`,
      suggestion: `Cook 2 fewer meals out per month → Save £${(avgMeal * 2).toFixed(0)}/month → £${(avgMeal * 24).toFixed(0)}/year to debt`,
      savingsPotential: avgMeal * 2
    });
  }

  // Transport fuel optimization
  const transport = topCategories.find(c => c.category === CATEGORIES.TRANSPORT);
  if (transport && transport.total > 100) {
    insights.push({
      type: 'transport',
      severity: 'low',
      title: 'Fuel Price Comparison',
      description: `£${transport.total.toFixed(2)} spent on transport this month`,
      suggestion: 'Use fuel price comparison apps to find cheaper petrol stations',
      savingsPotential: transport.total * 0.05 // 5% potential saving
    });
  }

  // Subscription analysis
  const subscriptions = topCategories.find(c => c.category === CATEGORIES.SUBSCRIPTIONS);
  if (subscriptions && subscriptions.count > 3) {
    insights.push({
      type: 'subscriptions',
      severity: 'medium',
      title: 'Multiple Subscriptions Detected',
      description: `${subscriptions.count} subscription services (£${subscriptions.total.toFixed(2)}/month)`,
      suggestion: 'Review and cancel unused subscriptions to reduce monthly costs',
      savingsPotential: subscriptions.total * 0.3 // Assume 30% could be saved
    });
  }

  return insights;
}
