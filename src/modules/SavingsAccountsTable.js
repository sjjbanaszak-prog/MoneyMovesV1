import React, { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import { parseNumber } from "./utils/parseNumber";
import "./SavingsAccountsTableStyles.css";

export default function SavingsAccountsTable({
  uploads,
  selectedAccounts,
  onToggle,
  onRemove,
  onAddData,
}) {
  const [sortConfig, setSortConfig] = useState({ key: "accountName", direction: "asc" });
  const [expandedRows, setExpandedRows] = useState([]);

  // Helper function to format currency
  const formatCurrency = (value) => {
    if (!value || value === 0) return "-";
    return `£${Math.round(Number(value)).toLocaleString()}`;
  };

  // Helper function to format date
  const formatDate = (dateStr, dateFormat) => {
    if (!dateStr) return "-";
    return dayjs(dateStr, dateFormat, true).format("DD/MM/YY");
  };

  // Get bank initials for icon
  const getBankInitials = (bankName) => {
    if (!bankName) return "?";
    const words = bankName.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return bankName.substring(0, 2).toUpperCase();
  };

  // Get bank icon color
  const getBankColor = (bankName) => {
    const colors = [
      "#6366f1", // indigo
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#f59e0b", // amber
      "#10b981", // emerald
      "#3b82f6", // blue
      "#ef4444", // red
      "#14b8a6", // teal
    ];

    if (!bankName) return colors[0];

    // Generate consistent color based on bank name
    let hash = 0;
    for (let i = 0; i < bankName.length; i++) {
      hash = bankName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Determine status (Active or Frozen based on last transaction date)
  const getStatus = (lastTransaction) => {
    if (!lastTransaction) return "frozen";
    const monthsSinceLastTransaction = dayjs().diff(dayjs(lastTransaction), "month");
    return monthsSinceLastTransaction <= 3 ? "active" : "frozen";
  };

  // Calculate UK Financial Year (April 6 - April 5)
  const getFinancialYear = (dateStr, dateFormat) => {
    if (!dateStr) return "-";
    const date = dayjs(dateStr, dateFormat, true);
    if (!date.isValid()) return "-";

    const year = date.year();
    const month = date.month(); // 0-indexed (0 = January)
    const day = date.date();

    // UK tax year starts April 6
    if (month < 3 || (month === 3 && day < 6)) {
      return `${year - 1}/${String(year).slice(2)}`;
    } else {
      return `${year}/${String(year + 1).slice(2)}`;
    }
  };

  // Determine data source (all savings transactions are from Upload)
  const getDataSource = (transaction) => {
    // For savings, all transactions come from uploaded statements
    return "Upload";
  };

  // Process upload data to extract transaction details
  const processUploadData = (upload) => {
    const { rawData, mapping, dateFormat, accountName, bank, accountType } = upload;

    // Filter and sort data with error handling
    const sorted = rawData
      .filter((row) => {
        if (!row || !mapping || !mapping.date) return false;
        const dateValue = row[mapping.date];
        if (!dateValue) return false;
        const parsed = dayjs(dateValue, dateFormat, true);
        return parsed.isValid();
      })
      .sort((a, b) => {
        const dateA = dayjs(a[mapping.date], dateFormat, true);
        const dateB = dayjs(b[mapping.date], dateFormat, true);
        return dateA.diff(dateB);
      });

    if (sorted.length === 0) {
      return {
        accountName,
        bank,
        accountType,
        startDate: null,
        lastTransaction: null,
        startValue: 0,
        currentValue: 0,
        growth: 0,
        transactionCount: 0,
        transactions: [],
        isValid: false,
      };
    }

    const startRow = sorted[0];
    const endRow = sorted[sorted.length - 1];

    const startValue = mapping.balance ? parseNumber(startRow[mapping.balance]) : 0;
    const currentValue = mapping.balance ? parseNumber(endRow[mapping.balance]) : 0;

    // Calculate true growth (interest/prizes only, excluding deposits/withdrawals)
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalPrizes = 0;

    sorted.forEach((row) => {
      const description = mapping.description ? String(row[mapping.description] || row.Description || "").toLowerCase() : "";

      if (accountType === "Premium Bonds") {
        const amountValue = parseNumber(
          row[mapping.wins] ||
          row.Wins ||
          row[mapping.amount] ||
          row.Amount ||
          0
        );

        if (description.includes("deposit") && !description.includes("prize")) {
          totalDeposits += amountValue;
        } else if (description.includes("auto") || description.includes("reinvest")) {
          totalPrizes += amountValue;
        } else if (description.includes("prize") || description.includes("payout")) {
          totalPrizes += amountValue;
        } else if (description.includes("withdrawal")) {
          totalWithdrawals += amountValue;
        }
      } else {
        const isInterest = description.includes("interest") ||
                         description.includes("int paid") ||
                         description.includes("int credit") ||
                         description.includes("credit interest") ||
                         description.includes("gross interest") ||
                         description.includes("int pmt") ||
                         description.match(/\bint\b/);

        if (mapping.credit) {
          const creditAmount = parseNumber(row[mapping.credit]);
          if (creditAmount > 0 && !isInterest) {
            totalDeposits += creditAmount;
          }
          if (creditAmount > 0 && isInterest) {
            totalPrizes += creditAmount;
          }
        } else if (mapping.amount) {
          const amount = parseNumber(row[mapping.amount]);
          if (amount > 0 && !isInterest) {
            totalDeposits += amount;
          }
          if (amount > 0 && isInterest) {
            totalPrizes += amount;
          }
        }

        if (mapping.debit) {
          const debitAmount = parseNumber(row[mapping.debit]);
          if (debitAmount > 0) {
            totalWithdrawals += debitAmount;
          }
        } else if (mapping.amount) {
          const amount = parseNumber(row[mapping.amount]);
          if (amount < 0) {
            totalWithdrawals += Math.abs(amount);
          }
        }
      }
    });

    // Growth calculation (matching SavingsMetricCards logic)
    let growth;
    if (accountType === "Premium Bonds") {
      growth = totalPrizes;
    } else {
      growth = currentValue - totalDeposits + totalWithdrawals;
    }

    // Build transaction history
    const transactions = sorted.map((row) => ({
      date: row[mapping.date],
      description: mapping.description ? row[mapping.description] : "",
      debit: mapping.debit ? parseNumber(row[mapping.debit]) : null,
      credit: mapping.credit ? parseNumber(row[mapping.credit]) : null,
      balance: mapping.balance ? parseNumber(row[mapping.balance]) : null,
      amount: mapping.amount ? parseNumber(row[mapping.amount]) : null,
    }));

    return {
      accountName,
      bank,
      accountType,
      startDate: startRow[mapping.date],
      lastTransaction: endRow[mapping.date],
      startValue,
      currentValue,
      growth,
      transactionCount: sorted.length,
      transactions,
      isValid: true,
      dateFormat,
    };
  };

  // Process all uploads
  const processedAccounts = useMemo(() => {
    return uploads.map((upload) => processUploadData(upload));
  }, [uploads]);

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    const sorted = [...processedAccounts];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "accountName":
          aValue = a.accountName || "";
          bValue = b.accountName || "";
          break;
        case "bank":
          aValue = a.bank || "";
          bValue = b.bank || "";
          break;
        case "accountType":
          aValue = a.accountType || "";
          bValue = b.accountType || "";
          break;
        case "startDate":
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case "lastTransaction":
          aValue = a.lastTransaction ? new Date(a.lastTransaction).getTime() : 0;
          bValue = b.lastTransaction ? new Date(b.lastTransaction).getTime() : 0;
          break;
        case "startValue":
          aValue = a.startValue || 0;
          bValue = b.startValue || 0;
          break;
        case "currentValue":
          aValue = a.currentValue || 0;
          bValue = b.currentValue || 0;
          break;
        case "growth":
          aValue = a.growth || 0;
          bValue = b.growth || 0;
          break;
        case "status":
          aValue = getStatus(a.lastTransaction);
          bValue = getStatus(b.lastTransaction);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [processedAccounts, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return " ↕";
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  // Toggle row expansion
  const toggleRowExpansion = (idx, e) => {
    e.stopPropagation();
    setExpandedRows((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Handle remove account
  const handleRemove = (accountName, e) => {
    e.stopPropagation();
    onRemove(accountName);
  };

  return (
    <div className="savings-table-container-v2">
      <div className="savings-table-header-v2">
        <h3 className="savings-table-title-v2">Savings Accounts</h3>
        <button className="add-savings-button-v2" onClick={onAddData}>
          <Plus size={16} />
          Add Saving Data
        </button>
      </div>

      <div className="savings-table-scroll-v2">
        <table className="savings-table-v2">
          <thead>
            <tr>
              <th className="savings-expand-column-v2"></th>
              <th onClick={() => handleSort("bank")} className="savings-sortable-v2">
                Bank{getSortIndicator("bank")}
              </th>
              <th onClick={() => handleSort("accountName")} className="savings-sortable-v2">
                Account{getSortIndicator("accountName")}
              </th>
              <th onClick={() => handleSort("accountType")} className="savings-sortable-v2">
                Type{getSortIndicator("accountType")}
              </th>
              <th onClick={() => handleSort("status")} className="savings-sortable-v2 savings-text-center-v2">
                Status{getSortIndicator("status")}
              </th>
              <th onClick={() => handleSort("startDate")} className="savings-sortable-v2 savings-text-right-v2 savings-hide-mobile-v2">
                First Txn{getSortIndicator("startDate")}
              </th>
              <th onClick={() => handleSort("lastTransaction")} className="savings-sortable-v2 savings-text-right-v2">
                Last Txn{getSortIndicator("lastTransaction")}
              </th>
              <th onClick={() => handleSort("currentValue")} className="savings-sortable-v2 savings-text-right-v2">
                Current Value{getSortIndicator("currentValue")}
              </th>
              <th onClick={() => handleSort("growth")} className="savings-sortable-v2 savings-text-right-v2">
                Growth{getSortIndicator("growth")}
              </th>
              <th className="savings-text-center-v2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account, idx) => {
              const status = getStatus(account.lastTransaction);
              const isSelected = selectedAccounts.includes(account.accountName);
              const isExpanded = expandedRows.includes(idx);
              const hasTransactions = account.transactions && account.transactions.length > 0;
              const isLastSelected = isSelected && selectedAccounts.length === 1;

              return (
                <React.Fragment key={idx}>
                  <tr
                    className={!isSelected ? "savings-row-selected-v2" : ""}
                    onClick={() => onToggle(account.accountName)}
                    style={isLastSelected ? { cursor: "not-allowed" } : {}}
                    title={isLastSelected ? "At least one savings account must remain selected" : ""}
                  >
                    <td className="savings-expand-cell-v2">
                      {hasTransactions && (
                        <button
                          className="savings-expand-button-v2"
                          onClick={(e) => toggleRowExpansion(idx, e)}
                        >
                          <svg
                            className={`savings-chevron-icon-v2 ${isExpanded ? "savings-expanded" : ""}`}
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M4 6L8 10L12 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                    <td className="savings-account-td-v2">
                      <div className="savings-account-cell-v2">
                        <div
                          className="savings-account-icon-v2"
                          style={{ backgroundColor: getBankColor(account.bank) }}
                        >
                          {getBankInitials(account.bank)}
                        </div>
                        {account.bank}
                      </div>
                    </td>
                    <td>{account.accountName}</td>
                    <td>
                      {account.accountType ? (
                        <span
                          className={`savings-type-badge-v2 ${account.accountType
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {account.accountType}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="savings-text-center-v2">
                      <span className={`savings-status-badge-v2 savings-status-${status}-v2`}>
                        {status === "active" ? "Active" : "Frozen"}
                      </span>
                    </td>
                    <td className="savings-text-right-v2 savings-hide-mobile-v2">
                      {formatDate(account.startDate, account.dateFormat)}
                    </td>
                    <td className="savings-text-right-v2">
                      {formatDate(account.lastTransaction, account.dateFormat)}
                    </td>
                    <td className="savings-text-right-v2">{formatCurrency(account.currentValue)}</td>
                    <td className="savings-text-right-v2">
                      <span className={account.growth >= 0 ? "savings-positive-v2" : "savings-negative-v2"}>
                        {account.growth >= 0 ? "+" : "-"}{formatCurrency(Math.abs(account.growth))}
                      </span>
                    </td>
                    <td className="savings-text-center-v2">
                      <button
                        className="savings-remove-button-v2"
                        onClick={(e) => handleRemove(account.accountName, e)}
                        title="Remove account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Row - Transaction History */}
                  {isExpanded && hasTransactions && (
                    <tr className="savings-expanded-row-v2">
                      <td colSpan="10" className="savings-expanded-cell-v2">
                        <div className="savings-history-container-v2">
                          {/* Summary Statistics */}
                          <div className="savings-history-stats-grid-v2">
                            <div className="savings-stat-card-v2">
                              <div className="savings-stat-card-label-v2">Starting Balance</div>
                              <div className="savings-stat-card-value-v2">{formatCurrency(account.startValue)}</div>
                            </div>
                            <div className="savings-stat-card-v2">
                              <div className="savings-stat-card-label-v2">Current Balance</div>
                              <div className="savings-stat-card-value-v2">{formatCurrency(account.currentValue)}</div>
                            </div>
                            <div className="savings-stat-card-v2">
                              <div className="savings-stat-card-label-v2">Net Growth</div>
                              <div className="savings-stat-card-value-v2" style={{
                                color: account.growth >= 0 ? '#10b981' : '#ef4444'
                              }}>
                                {account.growth >= 0 ? '+' : ''}{formatCurrency(account.growth)}
                              </div>
                            </div>
                            <div className="savings-stat-card-v2">
                              <div className="savings-stat-card-label-v2">Total Transactions</div>
                              <div className="savings-stat-card-value-v2">{account.transactionCount}</div>
                            </div>
                          </div>

                          {/* Transaction History Table */}
                          <div className="savings-history-table-wrapper-v2">
                            <table className="savings-history-table-v2">
                              <thead>
                                <tr>
                                  <th>Description</th>
                                  <th>Date</th>
                                  <th>FY</th>
                                  <th>Type</th>
                                  <th className="savings-text-right-v2">Amount</th>
                                  <th>Source</th>
                                  <th className="savings-text-center-v2">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {account.transactions
                                  .slice()
                                  .reverse()
                                  .map((transaction, tIdx) => {
                                    // Determine transaction type and amount
                                    const isDebit = transaction.debit && transaction.debit > 0;
                                    const isCredit = transaction.credit && transaction.credit > 0;
                                    const amount = isDebit ? transaction.debit : (isCredit ? transaction.credit : (transaction.amount || 0));
                                    const type = isDebit ? "Debit" : (isCredit ? "Credit" : (amount < 0 ? "Debit" : "Credit"));

                                    return (
                                      <tr key={tIdx}>
                                        <td className="savings-description-cell-v2">{transaction.description || "-"}</td>
                                        <td>{formatDate(transaction.date, account.dateFormat)}</td>
                                        <td>{getFinancialYear(transaction.date, account.dateFormat)}</td>
                                        <td>
                                          <span className={`savings-type-indicator-v2 ${type.toLowerCase()}`}>
                                            {type}
                                          </span>
                                        </td>
                                        <td className="savings-text-right-v2">
                                          {formatCurrency(Math.abs(amount))}
                                        </td>
                                        <td>
                                          <span className={`source-badge-v2 source-${getDataSource(transaction).toLowerCase()}`}>
                                            {getDataSource(transaction)}
                                          </span>
                                        </td>
                                        <td className="savings-text-center-v2">
                                          <div className="history-actions-v2">
                                            <button
                                              className="history-action-button-v2"
                                              onClick={(e) => e.stopPropagation()}
                                              title="Edit"
                                              disabled
                                            >
                                              ✎
                                            </button>
                                            <button
                                              className="history-action-button-v2 history-remove-button-v2"
                                              onClick={(e) => e.stopPropagation()}
                                              title="Remove"
                                              disabled
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {sortedAccounts.length === 0 && (
          <div className="savings-empty-state-v2">
            <p>No savings accounts added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
