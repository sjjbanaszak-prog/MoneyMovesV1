import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import './StrategyComparisonChartStyles.css';

const StrategyComparisonChart = ({ comparison }) => {
  if (!comparison || !comparison.snowball || !comparison.avalanche) {
    return (
      <div className="strategy-comparison-chart">
        <div className="comparison-empty-state">
          <p>Add debts and set a budget to compare strategies</p>
        </div>
      </div>
    );
  }

  const { snowball, avalanche, comparison: comparisonData } = comparison;

  // Check for errors
  if (snowball.error || avalanche.error) {
    return (
      <div className="strategy-comparison-chart">
        <div className="comparison-error-state">
          <p className="error-message">
            ⚠️ {snowball.error || avalanche.error}
          </p>
        </div>
      </div>
    );
  }

  // Prepare data for bar chart
  const chartData = [
    {
      metric: 'Total Interest',
      Snowball: snowball.totalInterest,
      Avalanche: avalanche.totalInterest,
      format: 'currency'
    },
    {
      metric: 'Total Paid',
      Snowball: snowball.totalPaid,
      Avalanche: avalanche.totalPaid,
      format: 'currency'
    },
    {
      metric: 'Months to Payoff',
      Snowball: snowball.monthsToPayoff,
      Avalanche: avalanche.monthsToPayoff,
      format: 'number'
    }
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const format = payload[0].payload.format;

    return (
      <div className="comparison-tooltip">
        <p className="tooltip-label">{label}</p>
        <div className="tooltip-divider" />
        {payload.map((entry, index) => (
          <div key={index} className="tooltip-item">
            <span
              className="tooltip-color"
              style={{ backgroundColor: entry.color }}
            />
            <span className="tooltip-name">{entry.name}:</span>
            <span className="tooltip-value">
              {format === 'currency'
                ? `£${entry.value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${entry.value} months`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Format Y-axis
  const formatYAxis = (value, format) => {
    if (format === 'currency') {
      if (value >= 1000) {
        return `£${(value / 1000).toFixed(0)}k`;
      }
      return `£${value}`;
    }
    return value;
  };

  // Determine recommended strategy
  const recommendedStrategy = comparisonData.recommendedStrategy;
  const savings = Math.abs(comparisonData.interestSaved);
  const monthsSaved = Math.abs(comparisonData.monthsSaved);

  return (
    <div className="strategy-comparison-chart">
      <div className="comparison-header">
        <h3>Strategy Comparison</h3>
        <p className="comparison-subtitle">
          Snowball vs Avalanche - which saves you more?
        </p>
      </div>

      {/* Recommendation Banner */}
      <div className={`recommendation-banner ${recommendedStrategy.toLowerCase()}`}>
        <div className="recommendation-icon">
          {recommendedStrategy === 'Avalanche' ? '💰' : '⚡'}
        </div>
        <div className="recommendation-content">
          <h4>{recommendedStrategy} Method Recommended</h4>
          <p>{comparisonData.savingsMessage}</p>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="comparison-cards">
        <div className="comparison-card snowball">
          <div className="card-header">
            <span className="card-icon">⚡</span>
            <h4>Snowball</h4>
          </div>
          <div className="card-body">
            <div className="card-metric">
              <span className="metric-label">Debt-Free Date</span>
              <span className="metric-value">{snowball.debtFreeDate}</span>
            </div>
            <div className="card-metric">
              <span className="metric-label">Total Interest</span>
              <span className="metric-value">
                £{snowball.totalInterest.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="card-metric">
              <span className="metric-label">Time to Freedom</span>
              <span className="metric-value">{snowball.monthsToPayoff} months</span>
            </div>
          </div>
          <div className="card-footer">
            <span className="strategy-tag">Psychological Wins</span>
          </div>
        </div>

        <div className="comparison-card avalanche">
          <div className="card-header">
            <span className="card-icon">💰</span>
            <h4>Avalanche</h4>
          </div>
          <div className="card-body">
            <div className="card-metric">
              <span className="metric-label">Debt-Free Date</span>
              <span className="metric-value">{avalanche.debtFreeDate}</span>
            </div>
            <div className="card-metric">
              <span className="metric-label">Total Interest</span>
              <span className="metric-value">
                £{avalanche.totalInterest.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="card-metric">
              <span className="metric-label">Time to Freedom</span>
              <span className="metric-value">{avalanche.monthsToPayoff} months</span>
            </div>
          </div>
          <div className="card-footer">
            <span className="strategy-tag">Maximum Savings</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Comparison */}
      <div className="comparison-chart-container">
        <h4 className="chart-title">Side-by-Side Metrics</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />

            <XAxis
              dataKey="metric"
              stroke="#b0b0b0"
              tick={{ fill: '#b0b0b0', fontSize: 12 }}
            />

            <YAxis
              stroke="#b0b0b0"
              tick={{ fill: '#b0b0b0', fontSize: 12 }}
              tickFormatter={(value) => formatYAxis(value, chartData[0].format)}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />

            <Bar dataKey="Snowball" fill="#fbbf24" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Avalanche" fill="#22c55e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Savings Summary */}
      {savings > 0 && (
        <div className="savings-summary">
          <div className="savings-icon">💡</div>
          <div className="savings-content">
            <h4>Potential Savings</h4>
            <p>
              By choosing {recommendedStrategy}, you could save{' '}
              <strong>£{savings.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong> in interest
              {monthsSaved > 0 && (
                <> and become debt-free <strong>{monthsSaved} months earlier</strong></>
              )}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyComparisonChart;
