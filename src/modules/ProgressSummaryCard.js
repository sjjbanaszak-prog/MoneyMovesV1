import React from 'react';
import './ProgressSummaryCardStyles.css';

const ProgressSummaryCard = ({ strategyResult, progress }) => {
  if (!strategyResult || strategyResult.error) {
    return (
      <div className="progress-summary-card">
        <div className="summary-header">
          <h3>Debt-Free Plan</h3>
        </div>
        <div className="no-results">
          {strategyResult?.error ? (
            <p className="error-message">⚠️ {strategyResult.error}</p>
          ) : (
            <p>Configure your debts and repayment budget to see your debt-free plan</p>
          )}
        </div>
      </div>
    );
  }

  const {
    debtFreeDate,
    monthsToPayoff,
    totalDebt,
    totalInterest,
    totalPaid,
    strategy
  } = strategyResult;

  const getStrategyIcon = (strat) => {
    if (strat === 'Snowball') return '⚡';
    if (strat === 'Avalanche') return '💰';
    return '🎯';
  };

  const getStrategyColor = (strat) => {
    if (strat === 'Snowball') return 'strategy-snowball';
    if (strat === 'Avalanche') return 'strategy-avalanche';
    return 'strategy-custom';
  };

  return (
    <div className="progress-summary-card">
      <div className="summary-header">
        <h3>Debt-Free Plan</h3>
        <span className={`strategy-badge ${getStrategyColor(strategy)}`}>
          {getStrategyIcon(strategy)} {strategy}
        </span>
      </div>

      {/* Main Metric - Debt-Free Date */}
      <div className="debt-free-projection">
        <div className="projection-icon">🎯</div>
        <div className="projection-content">
          <h2 className="projection-date">{debtFreeDate}</h2>
          <p className="projection-label">Debt-Free Date</p>
          <p className="projection-months">{monthsToPayoff} months from now</p>
        </div>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="progress-bar-section">
          <div className="progress-bar-header">
            <span className="progress-label">Overall Progress</span>
            <span className="progress-percentage">{progress.percentPaid.toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(progress.percentPaid, 100)}%` }}
            />
          </div>
          <div className="progress-stats">
            <span className="stat-paid">
              £{progress.totalPaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })} paid
            </span>
            <span className="stat-remaining">
              £{progress.totalRemaining.toLocaleString('en-GB', { minimumFractionDigits: 2 })} remaining
            </span>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">💳</div>
          <div className="metric-content">
            <p className="metric-label">Total Debt</p>
            <p className="metric-value">
              £{totalDebt.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon interest-icon">📈</div>
          <div className="metric-content">
            <p className="metric-label">Total Interest</p>
            <p className="metric-value interest-value">
              £{totalInterest.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <p className="metric-label">Total Payment</p>
            <p className="metric-value">
              £{totalPaid.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📅</div>
          <div className="metric-content">
            <p className="metric-label">Time to Freedom</p>
            <p className="metric-value">
              {Math.floor(monthsToPayoff / 12)}y {monthsToPayoff % 12}m
            </p>
          </div>
        </div>
      </div>

      {/* Motivational Message */}
      <div className="motivational-message">
        <p>
          {monthsToPayoff <= 12
            ? `You're on track to be debt-free within a year!`
            : monthsToPayoff <= 24
            ? `You're on track to be debt-free by ${debtFreeDate}.`
            : `Stay consistent with your plan to be debt-free by ${debtFreeDate}.`}
        </p>
      </div>
    </div>
  );
};

export default ProgressSummaryCard;
