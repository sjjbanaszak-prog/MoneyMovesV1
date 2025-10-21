import React, { useMemo } from 'react';
import './DebtAdvisorPanelStyles.css';

const DebtAdvisorPanel = ({ debts, strategyResult, comparison }) => {
  // Generate insights based on debt data
  const insights = useMemo(() => {
    if (!debts || debts.length === 0 || !strategyResult) {
      return [];
    }

    const insights = [];

    // Total debt analysis
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinimums = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const avgInterestRate = debts.reduce((sum, debt) => sum + debt.interestRate, 0) / debts.length;

    // 1. High-interest debt warning
    const highInterestDebts = debts.filter(d => d.interestRate >= 20);
    if (highInterestDebts.length > 0) {
      const highInterestTotal = highInterestDebts.reduce((sum, d) => sum + d.balance, 0);
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'High-Interest Debt Alert',
        message: `You have £${highInterestTotal.toLocaleString('en-GB')} in high-interest debt (≥20% APR). Prioritizing these debts could save you significant money.`,
        action: 'Consider the Avalanche method to minimize interest costs.'
      });
    }

    // 2. Credit utilization insight
    const creditCardDebts = debts.filter(d => d.debtType === 'Credit Card');
    if (creditCardDebts.length > 0) {
      const creditCardTotal = creditCardDebts.reduce((sum, d) => sum + d.balance, 0);
      const avgCreditRate = creditCardDebts.reduce((sum, d) => sum + d.interestRate, 0) / creditCardDebts.length;

      insights.push({
        type: 'info',
        icon: '💳',
        title: 'Credit Card Debt',
        message: `You have ${creditCardDebts.length} credit card${creditCardDebts.length > 1 ? 's' : ''} with a total balance of £${creditCardTotal.toLocaleString('en-GB')} at an average rate of ${avgCreditRate.toFixed(1)}% APR.`,
        action: 'Stop using credit cards for new purchases while paying down balances.'
      });
    }

    // 3. Strategy comparison insight
    if (comparison && !comparison.snowball.error && !comparison.avalanche.error) {
      const savings = Math.abs(comparison.comparison.interestSaved);
      const monthsSaved = Math.abs(comparison.comparison.monthsSaved);

      if (savings > 100) {
        insights.push({
          type: 'success',
          icon: '💰',
          title: 'Optimization Opportunity',
          message: `Switching to the ${comparison.comparison.recommendedStrategy} method could save you £${savings.toLocaleString('en-GB')} in interest${monthsSaved > 0 ? ` and ${monthsSaved} months` : ''}.`,
          action: `Consider using the ${comparison.comparison.recommendedStrategy} strategy for maximum savings.`
        });
      }
    }

    // 4. Payment-to-interest ratio
    if (strategyResult && !strategyResult.error) {
      const interestPercentage = (strategyResult.totalInterest / strategyResult.totalPaid) * 100;

      if (interestPercentage > 30) {
        insights.push({
          type: 'warning',
          icon: '📈',
          title: 'High Interest Burden',
          message: `${interestPercentage.toFixed(1)}% of your total repayment will be interest (£${strategyResult.totalInterest.toLocaleString('en-GB')}).`,
          action: 'Increasing your monthly payment could significantly reduce this burden.'
        });
      }
    }

    // 5. Debt-to-minimum payment ratio
    const monthsAtMinimum = totalDebt / totalMinimums;
    if (monthsAtMinimum > 120) { // More than 10 years at minimum payments
      insights.push({
        type: 'critical',
        icon: '🚨',
        title: 'Minimum Payment Warning',
        message: `At minimum payments only, it would take over ${Math.floor(monthsAtMinimum / 12)} years to become debt-free.`,
        action: 'Even small increases to your monthly payment can dramatically reduce payoff time.'
      });
    }

    // 6. Positive reinforcement
    if (strategyResult && !strategyResult.error && strategyResult.monthsToPayoff <= 36) {
      insights.push({
        type: 'success',
        icon: '🎯',
        title: 'On Track for Success',
        message: `Your current plan has you debt-free within ${Math.floor(strategyResult.monthsToPayoff / 12)} years!`,
        action: 'Stay consistent with your payments to achieve this goal.'
      });
    }

    // 7. Debt diversity analysis
    const debtTypes = [...new Set(debts.map(d => d.debtType))];
    if (debtTypes.length >= 4) {
      insights.push({
        type: 'info',
        icon: '📊',
        title: 'Debt Consolidation',
        message: `You have ${debtTypes.length} different types of debt. Consider whether consolidation could simplify your repayment.`,
        action: 'Look into personal loan consolidation if it offers a lower interest rate.'
      });
    }

    return insights;
  }, [debts, strategyResult, comparison]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="debt-advisor-panel">
      <div className="advisor-header">
        <h3>💡 Debt Advisor Insights</h3>
        <p className="advisor-subtitle">
          Personalized recommendations based on your debt profile
        </p>
      </div>

      <div className="insights-grid">
        {insights.map((insight, index) => (
          <div key={index} className={`insight-card ${insight.type}`}>
            <div className="insight-header">
              <span className="insight-icon">{insight.icon}</span>
              <h4 className="insight-title">{insight.title}</h4>
            </div>
            <p className="insight-message">{insight.message}</p>
            {insight.action && (
              <div className="insight-action">
                <span className="action-icon">→</span>
                <span>{insight.action}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="advisor-footer">
        <p>
          💼 These insights are generated based on your debt data and UK financial best practices.
          For personalized financial advice, consult a qualified financial advisor.
        </p>
      </div>
    </div>
  );
};

export default DebtAdvisorPanel;
