import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './RepaymentTimelineChartStyles.css';

const RepaymentTimelineChart = ({ strategyResult, debts }) => {
  // Transform schedule data for Recharts
  const chartData = useMemo(() => {
    if (!strategyResult || !strategyResult.schedule || strategyResult.error) {
      return [];
    }

    const { schedule } = strategyResult;

    // Build data array with running balances for each debt
    return schedule.map((monthData) => {
      const dataPoint = {
        month: monthData.month,
        date: monthData.date,
        totalRemaining: 0
      };

      // Add each debt's remaining balance
      monthData.payments.forEach(payment => {
        const debtKey = payment.debtName.replace(/\s+/g, '_');
        dataPoint[debtKey] = payment.remainingBalance;
        dataPoint.totalRemaining += payment.remainingBalance;
      });

      return dataPoint;
    });
  }, [strategyResult]);

  // Generate colors for each debt
  const debtColors = useMemo(() => {
    if (!debts) return [];

    const colors = [
      '#3b82f6', // Blue
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#f59e0b', // Amber
      '#10b981', // Green
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#f97316', // Orange
    ];

    return debts.map((debt, index) => ({
      key: debt.debtName.replace(/\s+/g, '_'),
      name: debt.debtName,
      color: colors[index % colors.length]
    }));
  }, [debts]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const totalRemaining = payload.reduce((sum, entry) => {
      if (entry.dataKey !== 'date') {
        return sum + (entry.value || 0);
      }
      return sum;
    }, 0);

    return (
      <div className="timeline-tooltip">
        <p className="tooltip-label">{label}</p>
        <div className="tooltip-divider" />
        {payload.map((entry, index) => {
          if (entry.dataKey === 'date') return null;

          return (
            <div key={index} className="tooltip-item">
              <span
                className="tooltip-color"
                style={{ backgroundColor: entry.color }}
              />
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-value">
                £{entry.value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
        <div className="tooltip-divider" />
        <div className="tooltip-total">
          <span>Total Remaining:</span>
          <span>£{totalRemaining.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  };

  // Format Y-axis
  const formatYAxis = (value) => {
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(0)}k`;
    }
    return `£${value}`;
  };

  // Format X-axis - show every 6th month for clarity
  const formatXAxis = (value, index) => {
    if (chartData.length <= 12) return value;
    if (index % 6 === 0 || index === chartData.length - 1) return value;
    return '';
  };

  if (!strategyResult || strategyResult.error || chartData.length === 0) {
    return (
      <div className="repayment-timeline-chart">
        <div className="chart-empty-state">
          <p>Configure your debts and strategy to see the repayment timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="repayment-timeline-chart">
      <div className="chart-header">
        <h3>Repayment Timeline</h3>
        <p className="chart-subtitle">
          Debt balance over time - {strategyResult.strategy} strategy
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            {debtColors.map((debt) => (
              <linearGradient key={debt.key} id={`gradient-${debt.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={debt.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={debt.color} stopOpacity={0.2} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#333" />

          <XAxis
            dataKey="month"
            stroke="#b0b0b0"
            tick={{ fill: '#b0b0b0', fontSize: 12 }}
            tickFormatter={formatXAxis}
          />

          <YAxis
            stroke="#b0b0b0"
            tick={{ fill: '#b0b0b0', fontSize: 12 }}
            tickFormatter={formatYAxis}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />

          {debtColors.map((debt) => (
            <Area
              key={debt.key}
              type="monotone"
              dataKey={debt.key}
              stackId="1"
              stroke={debt.color}
              fill={`url(#gradient-${debt.key})`}
              name={debt.name}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <div className="chart-insights">
        <div className="insight-item">
          <span className="insight-icon">📅</span>
          <span className="insight-text">
            <strong>{strategyResult.monthsToPayoff} months</strong> to debt-free
          </span>
        </div>
        <div className="insight-item">
          <span className="insight-icon">💰</span>
          <span className="insight-text">
            <strong>£{strategyResult.totalInterest.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong> total interest
          </span>
        </div>
        <div className="insight-item">
          <span className="insight-icon">📊</span>
          <span className="insight-text">
            <strong>£{strategyResult.totalPaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong> total to repay
          </span>
        </div>
      </div>
    </div>
  );
};

export default RepaymentTimelineChart;
