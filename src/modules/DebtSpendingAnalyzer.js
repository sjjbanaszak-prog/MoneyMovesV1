import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, Lightbulb, DollarSign } from 'lucide-react';
import {
  categorizeTransactions,
  groupByCategory,
  getTopCategories,
  generateSpendingInsights,
  CATEGORIES
} from './utils/transactionCategorizer';
import './DebtSpendingAnalyzerStyles.css';

/**
 * DebtSpendingAnalyzer Component
 *
 * Analyzes debt transactions to identify spending patterns and provide AI-powered insights.
 * Shows:
 * - Category breakdown (pie chart)
 * - Top spending categories
 * - AI-generated insights and suggestions
 */
export default function DebtSpendingAnalyzer({ debts, timeframe = 'month' }) {
  // Category colors matching Money Moves theme
  const CATEGORY_COLORS = {
    [CATEGORIES.GROCERIES]: '#10b981',      // emerald
    [CATEGORIES.EATING_OUT]: '#f59e0b',     // amber
    [CATEGORIES.TRANSPORT]: '#3b82f6',      // blue
    [CATEGORIES.SHOPPING]: '#ec4899',       // pink
    [CATEGORIES.BILLS]: '#8b5cf6',          // purple
    [CATEGORIES.ENTERTAINMENT]: '#06b6d4',  // cyan
    [CATEGORIES.HEALTH]: '#14b8a6',         // teal
    [CATEGORIES.HOME]: '#f97316',           // orange
    [CATEGORIES.TRAVEL]: '#6366f1',         // indigo
    [CATEGORIES.SUBSCRIPTIONS]: '#a855f7',  // violet
    [CATEGORIES.CASH]: '#6b7280',           // gray
    [CATEGORIES.OTHER]: '#4b5563'           // dark gray
  };

  // Extract all transactions from debts (charges only, not payments)
  const allTransactions = useMemo(() => {
    if (!debts || debts.length === 0) return [];

    const transactions = [];
    debts.forEach(debt => {
      if (debt.transactions && Array.isArray(debt.transactions)) {
        debt.transactions.forEach(txn => {
          // Only include charges (positive amounts)
          if (txn.amount > 0) {
            transactions.push({
              ...txn,
              debtName: debt.debtName,
              creditor: txn.creditor || debt.debtName
            });
          }
        });
      }
    });

    return transactions;
  }, [debts]);

  // Filter transactions by timeframe
  const filteredTransactions = useMemo(() => {
    if (timeframe === 'all') return allTransactions;

    const now = new Date();
    const cutoffDate = new Date();

    switch (timeframe) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        cutoffDate.setMonth(now.getMonth() - 1);
    }

    return allTransactions.filter(txn => {
      if (!txn.transactionDate) return false;
      const txnDate = new Date(txn.transactionDate);
      return txnDate >= cutoffDate;
    });
  }, [allTransactions, timeframe]);

  // Categorize transactions
  const categorizedTransactions = useMemo(() => {
    return categorizeTransactions(filteredTransactions);
  }, [filteredTransactions]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    return groupByCategory(categorizedTransactions);
  }, [categorizedTransactions]);

  // Get top categories
  const topCategories = useMemo(() => {
    return getTopCategories(groupedByCategory, 10);
  }, [groupedByCategory]);

  // Calculate total spending
  const totalSpending = useMemo(() => {
    return topCategories.reduce((sum, cat) => sum + cat.total, 0);
  }, [topCategories]);

  // Generate AI insights
  const insights = useMemo(() => {
    return generateSpendingInsights(categorizedTransactions, debts[0]);
  }, [categorizedTransactions, debts]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return topCategories
      .filter(cat => cat.total > 0)
      .map(cat => ({
        name: cat.category,
        value: cat.total,
        percentage: cat.percentage,
        count: cat.count
      }));
  }, [topCategories]);

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="debt-analyzer-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">£{data.value.toFixed(2)}</p>
          <p className="tooltip-percentage">{data.payload.percentage.toFixed(1)}% of spending</p>
          <p className="tooltip-count">{data.payload.count} transactions</p>
        </div>
      );
    }
    return null;
  };

  // Get severity icon and color
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle size={18} className="severity-icon-high" />;
      case 'medium':
        return <TrendingUp size={18} className="severity-icon-medium" />;
      default:
        return <Lightbulb size={18} className="severity-icon-low" />;
    }
  };

  if (!debts || debts.length === 0) {
    return (
      <div className="debt-analyzer-empty">
        <p>No debt data available for analysis</p>
      </div>
    );
  }

  if (categorizedTransactions.length === 0) {
    return (
      <div className="debt-analyzer-empty">
        <p>No transactions found for the selected timeframe</p>
      </div>
    );
  }

  return (
    <div className="debt-spending-analyzer">
      {/* Header */}
      <div className="analyzer-header">
        <h3 className="analyzer-title">💳 Spending Analysis</h3>
        <div className="analyzer-summary">
          <div className="summary-stat">
            <span className="stat-label">Total Charges:</span>
            <span className="stat-value">£{totalSpending.toFixed(2)}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Transactions:</span>
            <span className="stat-value">{categorizedTransactions.length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Categories:</span>
            <span className="stat-value">{chartData.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="analyzer-content-grid">
        {/* Category Breakdown Chart */}
        <div className="analyzer-card chart-card">
          <h4 className="card-title">Spending by Category</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[entry.name] || '#4b5563'}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Categories List */}
        <div className="analyzer-card categories-card">
          <h4 className="card-title">Top Spending Categories</h4>
          <div className="categories-list">
            {topCategories.slice(0, 5).map((cat, idx) => (
              <div key={idx} className="category-item">
                <div className="category-header">
                  <div
                    className="category-color-dot"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#4b5563' }}
                  ></div>
                  <span className="category-name">{cat.category}</span>
                </div>
                <div className="category-stats">
                  <span className="category-amount">£{cat.total.toFixed(2)}</span>
                  <span className="category-percentage">{cat.percentage.toFixed(0)}%</span>
                </div>
                <div className="category-bar">
                  <div
                    className="category-bar-fill"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: CATEGORY_COLORS[cat.category] || '#4b5563'
                    }}
                  ></div>
                </div>
                <div className="category-count">{cat.count} transactions</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      {insights.length > 0 && (
        <div className="analyzer-insights-section">
          <h4 className="insights-title">🔍 AI-Powered Insights</h4>
          <div className="insights-grid">
            {insights.map((insight, idx) => (
              <div key={idx} className={`insight-card insight-${insight.severity}`}>
                <div className="insight-header">
                  {getSeverityIcon(insight.severity)}
                  <h5 className="insight-title">{insight.title}</h5>
                </div>
                <p className="insight-description">{insight.description}</p>
                <p className="insight-suggestion">
                  <strong>💡 Suggestion:</strong> {insight.suggestion}
                </p>
                {insight.savingsPotential && insight.savingsPotential > 0 && (
                  <div className="insight-savings">
                    <DollarSign size={16} />
                    <span>Potential savings: £{insight.savingsPotential.toFixed(2)}/month</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="analyzer-actions">
        <button className="action-btn btn-primary">
          Apply Savings to Debt
        </button>
        <button className="action-btn btn-secondary">
          View Detailed Report
        </button>
      </div>
    </div>
  );
}
