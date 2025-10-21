import React, { useState } from 'react';
import './DebtListStyles.css';

const DebtList = ({ debts, onEditDebt, onDeleteDebt }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'balance', direction: 'desc' });

  if (!debts || debts.length === 0) {
    return (
      <div className="debt-list-empty">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          <h3>No Debts Added Yet</h3>
          <p>Add your first debt to start tracking repayment progress</p>
        </div>
      </div>
    );
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDebts = [...debts].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMinimum = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="sort-icon">⇅</span>;
    }
    return sortConfig.direction === 'asc' ?
      <span className="sort-icon active">↑</span> :
      <span className="sort-icon active">↓</span>;
  };

  const getInterestColor = (rate) => {
    if (rate >= 20) return 'high-interest';
    if (rate >= 10) return 'medium-interest';
    return 'low-interest';
  };

  return (
    <div className="debt-list">
      <div className="debt-list-header">
        <h3>Your Debts</h3>
        <div className="debt-totals">
          <span className="total-balance">
            Total: £{totalBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="total-minimum">
            Min. Payment: £{totalMinimum.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
          </span>
        </div>
      </div>

      <div className="debt-table-container">
        <table className="debt-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('debtName')} className="sortable">
                Debt Name {getSortIcon('debtName')}
              </th>
              <th onClick={() => handleSort('debtType')} className="sortable">
                Type {getSortIcon('debtType')}
              </th>
              <th onClick={() => handleSort('balance')} className="sortable text-right">
                Balance {getSortIcon('balance')}
              </th>
              <th onClick={() => handleSort('interestRate')} className="sortable text-right">
                APR {getSortIcon('interestRate')}
              </th>
              <th onClick={() => handleSort('minimumPayment')} className="sortable text-right">
                Min. Payment {getSortIcon('minimumPayment')}
              </th>
              <th onClick={() => handleSort('currentPayment')} className="sortable text-right">
                Current Payment {getSortIcon('currentPayment')}
              </th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDebts.map((debt, index) => (
              <tr key={index}>
                <td className="debt-name">
                  <strong>{debt.debtName}</strong>
                </td>
                <td className="debt-type">{debt.debtType || 'N/A'}</td>
                <td className="text-right">
                  £{debt.balance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="text-right">
                  <span className={`interest-badge ${getInterestColor(debt.interestRate)}`}>
                    {debt.interestRate.toFixed(1)}%
                  </span>
                </td>
                <td className="text-right">
                  £{debt.minimumPayment.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="text-right">
                  £{debt.currentPayment.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="text-center">
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => onEditDebt && onEditDebt(index)}
                      title="Edit debt"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => onDeleteDebt && onDeleteDebt(index)}
                      title="Delete debt"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DebtList;
