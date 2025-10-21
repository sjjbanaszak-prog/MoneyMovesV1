import React from 'react';
import './StrategySelectorStyles.css';

const StrategySelector = ({ selectedStrategy, monthlyBudget, onStrategyChange, onBudgetChange, totalMinimums }) => {
  const strategies = [
    {
      id: 'snowball',
      name: 'Snowball',
      description: 'Pay off smallest debts first for quick wins',
      icon: '⚡',
      benefits: ['Psychological boost', 'Quick progress', 'Motivation']
    },
    {
      id: 'avalanche',
      name: 'Avalanche',
      description: 'Pay off highest interest debts first to save money',
      icon: '💰',
      benefits: ['Lowest total interest', 'Fastest mathematically', 'Maximum savings']
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Choose your own priority order',
      icon: '🎯',
      benefits: ['Full control', 'Flexible approach', 'Personal priorities']
    }
  ];

  const handleBudgetChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    onBudgetChange(value);
  };

  const isBudgetSufficient = monthlyBudget >= totalMinimums;

  return (
    <div className="strategy-selector">
      <h3>Repayment Strategy</h3>

      {/* Monthly Budget Input */}
      <div className="budget-input-section">
        <label htmlFor="monthlyBudget">Monthly Repayment Budget (£)</label>
        <div className="budget-input-wrapper">
          <input
            type="number"
            id="monthlyBudget"
            value={monthlyBudget || ''}
            onChange={handleBudgetChange}
            placeholder="Enter total monthly budget"
            step="10"
            min={totalMinimums}
          />
          {!isBudgetSufficient && totalMinimums > 0 && (
            <div className="budget-warning">
              <span className="warning-icon">⚠️</span>
              <span>
                Budget (£{monthlyBudget}) is below minimum payments (£{totalMinimums.toFixed(2)})
              </span>
            </div>
          )}
          {isBudgetSufficient && totalMinimums > 0 && (
            <div className="budget-extra">
              Extra payment: £{(monthlyBudget - totalMinimums).toFixed(2)}/month
            </div>
          )}
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="strategy-grid">
        {strategies.map(strategy => (
          <div
            key={strategy.id}
            className={`strategy-card ${selectedStrategy === strategy.id ? 'selected' : ''}`}
            onClick={() => onStrategyChange(strategy.id)}
          >
            <div className="strategy-header">
              <span className="strategy-icon">{strategy.icon}</span>
              <h4>{strategy.name}</h4>
            </div>
            <p className="strategy-description">{strategy.description}</p>
            <ul className="strategy-benefits">
              {strategy.benefits.map((benefit, index) => (
                <li key={index}>
                  <span className="benefit-check">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Strategy Info */}
      {selectedStrategy && (
        <div className="strategy-info">
          <div className="info-icon">ℹ️</div>
          <div className="info-content">
            {selectedStrategy === 'snowball' && (
              <p>
                <strong>Snowball Method:</strong> Focus extra payments on your smallest debt while making minimum
                payments on others. Once paid off, roll that payment into the next smallest debt. This creates
                momentum and motivational wins.
              </p>
            )}
            {selectedStrategy === 'avalanche' && (
              <p>
                <strong>Avalanche Method:</strong> Focus extra payments on your highest interest rate debt while
                making minimum payments on others. This mathematically minimizes total interest paid and gets you
                debt-free fastest.
              </p>
            )}
            {selectedStrategy === 'custom' && (
              <p>
                <strong>Custom Method:</strong> Manually adjust payment priorities based on your personal preferences.
                This gives you full control to balance psychological wins with financial optimization.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategySelector;
