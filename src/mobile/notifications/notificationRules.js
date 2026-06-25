// ─── Helpers ────────────────────────────────────────────────────────────────

function getCurrentTaxYear() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  if (m > 4 || (m === 4 && d >= 6)) return `${y}_${y + 1}`;
  return `${y - 1}_${y}`;
}

function daysUntilTaxYearEnd() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  const endYear = (m > 4 || (m === 4 && d >= 6)) ? y + 1 : y;
  const end = new Date(endYear, 3, 5); // April 5
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (isNaN(target)) return null;
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getMortgageExpiryDate(m) {
  if (m.fixedRateEndDate) return m.fixedRateEndDate;
  if (m.fixedRateStartDate && m.fixedTermYears) {
    const d = new Date(m.fixedRateStartDate);
    d.setFullYear(d.getFullYear() + Number(m.fixedTermYears));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function mortgageSlug(m) {
  return ((m.lender || '') + '_' + (m.name || ''))
    .toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function fmt(n) {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

// ─── Rules ──────────────────────────────────────────────────────────────────

export function evaluateRules({ savingsMetrics, pensionMetrics, mortgages = [], children = [] }) {
  const taxYear = getCurrentTaxYear();
  const taxDays = daysUntilTaxYearEnd();
  const results = [];

  // ── ISA 80% ───────────────────────────────────────────────────────────────
  if (savingsMetrics) {
    const used  = savingsMetrics.currentFYIsaDeposits || 0;
    const limit = savingsMetrics.isaAllowance || 20000;
    const pct   = used / limit;
    const rem   = limit - used;

    if (pct >= 0.95 && used > 0) {
      results.push({
        key:       `isa_95pct_${taxYear}`,
        category:  'isa',
        priority:  'high',
        icon:      'savings',
        iconColor: '#ff4d4d',
        title:     'ISA allowance almost full',
        body:      `Only ${fmt(rem)} left of your ${fmt(limit)} ISA allowance before April 5th — use it or lose it.`,
        link:      '/mobile/savings',
      });
    } else if (pct >= 0.8 && used > 0) {
      results.push({
        key:       `isa_80pct_${taxYear}`,
        category:  'isa',
        priority:  'medium',
        icon:      'savings',
        iconColor: '#ff9500',
        title:     'ISA allowance at 80%',
        body:      `You've contributed ${fmt(used)} of your ${fmt(limit)} ISA allowance — ${fmt(rem)} remaining this tax year.`,
        link:      '/mobile/savings',
      });
    }

    // LISA 80%
    const lisaUsed = savingsMetrics.currentFYLisaDeposits || 0;
    if (savingsMetrics.hasLisa && lisaUsed >= 3200) {
      const lisaRem = 4000 - lisaUsed;
      results.push({
        key:       `lisa_80pct_${taxYear}`,
        category:  'isa',
        priority:  'medium',
        icon:      'savings',
        iconColor: '#ff9500',
        title:     'LISA approaching its limit',
        body:      `${fmt(lisaRem)} left in your Lifetime ISA — top up before April 5th to earn the full government bonus.`,
        link:      '/mobile/savings',
      });
    }
  }

  // ── Pension 80% & 95% ─────────────────────────────────────────────────────
  if (pensionMetrics) {
    const used  = pensionMetrics.currentFYTotal || 0;
    const limit = 60000;
    const pct   = used / limit;
    const rem   = limit - used;

    if (pct >= 0.95 && used > 0) {
      results.push({
        key:       `pension_95pct_${taxYear}`,
        category:  'pension',
        priority:  'high',
        icon:      'account_balance',
        iconColor: '#ff4d4d',
        title:     'Pension allowance almost full',
        body:      `You've contributed ${fmt(used)} — only ${fmt(rem)} left of your ${fmt(limit)} annual allowance before April 5th.`,
        link:      '/mobile/pension',
      });
    } else if (pct >= 0.8 && used > 0) {
      results.push({
        key:       `pension_80pct_${taxYear}`,
        category:  'pension',
        priority:  'medium',
        icon:      'account_balance',
        iconColor: '#a78bfa',
        title:     'Pension allowance at 80%',
        body:      `You've contributed ${fmt(used)} toward your ${fmt(limit)} annual allowance — ${fmt(rem)} remaining this tax year.`,
        link:      '/mobile/pension',
      });
    }
  }

  // ── Tax year end ──────────────────────────────────────────────────────────
  if (taxDays <= 42 && taxDays > 14) {
    results.push({
      key:       `tax_year_end_${taxYear}`,
      category:  'milestone',
      priority:  'medium',
      icon:      'event',
      iconColor: '#ff9500',
      title:     'Tax year ends in 6 weeks',
      body:      `April 5th is approaching — last chance to maximise your ISA, LISA, and pension contributions for this tax year.`,
      link:      '/mobile/savings',
    });
  } else if (taxDays <= 14 && taxDays > 0) {
    results.push({
      key:       `tax_year_end_urgent_${taxYear}`,
      category:  'milestone',
      priority:  'high',
      icon:      'event',
      iconColor: '#ff4d4d',
      title:     `Tax year ends in ${taxDays} day${taxDays === 1 ? '' : 's'}`,
      body:      `Final chance to use this year's ISA allowance (${fmt(20000)}) and pension contributions before April 5th.`,
      link:      '/mobile/savings',
    });
  }

  // ── Mortgage fixed rate expiry ────────────────────────────────────────────
  mortgages.forEach(m => {
    const expiryDate = getMortgageExpiryDate(m);
    const days = daysUntil(expiryDate);
    if (days === null || days < 0) return;

    const slug  = mortgageSlug(m);
    const label = m.name || m.lender || 'your mortgage';

    if (days <= 30) {
      results.push({
        key:       `mortgage_expiry_30_${slug}`,
        category:  'mortgage',
        priority:  'high',
        icon:      'home',
        iconColor: '#ff4d4d',
        title:     `Fixed rate expires in ${days} day${days === 1 ? '' : 's'}`,
        body:      `${label}'s fixed rate ends on ${expiryDate}. Act now to avoid reverting to the standard variable rate.`,
        link:      '/mobile/mortgage',
      });
    } else if (days <= 90) {
      results.push({
        key:       `mortgage_expiry_90_${slug}`,
        category:  'mortgage',
        priority:  'high',
        icon:      'home',
        iconColor: '#ff9500',
        title:     'Fixed rate expires within 90 days',
        body:      `${label}'s fixed rate ends on ${expiryDate}. Most lenders allow you to lock in a new rate up to 6 months early.`,
        link:      '/mobile/mortgage',
      });
    } else if (days <= 180) {
      results.push({
        key:       `mortgage_expiry_180_${slug}`,
        category:  'mortgage',
        priority:  'medium',
        icon:      'home',
        iconColor: '#4edea3',
        title:     'Fixed rate expires in 6 months',
        body:      `${label}'s fixed rate ends on ${expiryDate}. A good time to start comparing deals — you can usually secure a rate 6 months ahead.`,
        link:      '/mobile/mortgage',
      });
    }
  });

  // ── LTV milestones ────────────────────────────────────────────────────────
  const LTV_MILESTONES = [80, 75, 60, 50];
  mortgages.forEach(m => {
    if (!m.propertyValue || !m.outstandingBalance) return;
    const ltv  = (m.outstandingBalance / m.propertyValue) * 100;
    const slug = mortgageSlug(m);
    const label = m.name || m.lender || 'Your mortgage';

    LTV_MILESTONES.forEach(threshold => {
      if (ltv < threshold) {
        results.push({
          key:       `ltv_below_${threshold}_${slug}`,
          category:  'mortgage',
          priority:  'low',
          icon:      'trending_down',
          iconColor: '#4edea3',
          title:     `LTV dropped below ${threshold}%`,
          body:      `${label} is now at ${ltv.toFixed(1)}% LTV — you may qualify for better mortgage rates. Worth comparing deals at your next renewal.`,
          link:      '/mobile/mortgage',
        });
      }
    });
  });

  // ── Net worth milestones ──────────────────────────────────────────────────
  const pensionValue  = (pensionMetrics?.totalValue)       || 0;
  const savingsValue  = (savingsMetrics?.totalBalance)     || 0;
  const propertyEquity = mortgages.reduce((sum, m) => {
    const equity = (m.propertyValue || 0) - (m.outstandingBalance || 0);
    return sum + Math.max(0, equity);
  }, 0);
  const netWorth = pensionValue + savingsValue + propertyEquity;

  const NW_MILESTONES = [
    { threshold: 1000000, key: 'net_worth_1m',   label: '£1,000,000',  title: 'Net worth reached £1,000,000' },
    { threshold: 500000,  key: 'net_worth_500k',  label: '£500,000',   title: 'Net worth reached £500,000'   },
    { threshold: 250000,  key: 'net_worth_250k',  label: '£250,000',   title: 'Net worth reached £250,000'   },
    { threshold: 100000,  key: 'net_worth_100k',  label: '£100,000',   title: 'Net worth reached £100,000'   },
    { threshold: 50000,   key: 'net_worth_50k',   label: '£50,000',    title: 'Net worth reached £50,000'    },
  ];

  if (netWorth > 0) {
    NW_MILESTONES.forEach(({ threshold, key, label, title }) => {
      if (netWorth >= threshold) {
        results.push({
          key,
          category:  'milestone',
          priority:  'low',
          icon:      'emoji_events',
          iconColor: '#ffd700',
          title,
          body:      `Your combined pension, savings, and property equity has passed the ${label} mark. Keep going.`,
          link:      '/mobile/dashboard',
        });
      }
    });
  }

  // ── JISA approaching £9,000 ───────────────────────────────────────────────
  const JISA_LIMIT = 9000;
  children.forEach(child => {
    const jisa = (child.accounts || []).find(a => a.type === 'jisa');
    if (!jisa || !jisa.contributionsThisYear) return;
    const contributed = jisa.contributionsThisYear;
    const pct = contributed / JISA_LIMIT;
    if (pct < 0.8) return;

    const rem      = JISA_LIMIT - contributed;
    const childKey = ((child.id || child.name || 'child') + '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const name     = child.name || 'Your child';

    results.push({
      key:       `jisa_80pct_${childKey}_${taxYear}`,
      category:  'isa',
      priority:  'medium',
      icon:      'child_care',
      iconColor: '#ff9500',
      title:     `${name}'s JISA approaching limit`,
      body:      `${name} has contributed ${fmt(contributed)} of the ${fmt(JISA_LIMIT)} annual JISA limit — ${fmt(rem)} remaining this tax year.`,
      link:      '/mobile/family/allowances',
    });
  });

  return results;
}
