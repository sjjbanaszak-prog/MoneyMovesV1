import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, Edit2, ChevronDown, Download } from "lucide-react";
import dayjs from "dayjs";
import { categorizeTransaction } from "./utils/transactionCategorizer";
import "./DebtListV2Styles.css";

export default function DebtListV2({
  debts,
  onEditDebt,
  onDeleteDebt,
  onAddDebt,
  onUploadStatement,
}) {
  const [sortConfig, setSortConfig] = useState({ key: "balance", direction: "desc" });
  const [expandedRows, setExpandedRows] = useState([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // State for inline editing of transactions
  const [editingTransaction, setEditingTransaction] = useState(null); // { debtIndex, transactionIndex, originalTransaction }
  const [editedTransaction, setEditedTransaction] = useState({
    description: "",
    transactionDate: "",
    type: "charge", // "charge" or "payment"
    amount: ""
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAddDropdown(false);
      }
    }

    if (showAddDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddDropdown]);

  // Toggle dropdown
  const toggleDropdown = () => {
    setShowAddDropdown(!showAddDropdown);
  };

  // Handle manual entry
  const handleManualEntry = () => {
    setShowAddDropdown(false);
    onAddDebt();
  };

  // Handle upload statement
  const handleUploadStatement = () => {
    setShowAddDropdown(false);
    onUploadStatement();
  };

  // Helper function to format currency (whole numbers)
  const formatCurrency = (value) => {
    if (!value || value === 0) return "-";
    return `£${Math.round(Number(value)).toLocaleString()}`;
  };

  // Helper function to format currency with 2 decimal places
  const formatCurrencyWithDecimals = (value) => {
    if (!value || value === 0) return "-";
    return `£${Number(value).toFixed(2)}`;
  };

  // Helper function to format date (DD/MM/YY format)
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";

    // Try multiple date formats since dates may come from different sources
    const formats = [
      'YYYY-MM-DD',     // Standard ISO format
      'DD/MM/YYYY',     // UK format
      'DD MMM YYYY',    // Text month format (28 Oct 2025)
      'DD/MM/YY',       // Short UK format
      'YYYY/MM/DD',     // Alternative ISO
      'MM/DD/YYYY'      // US format
    ];

    let date = null;
    for (const format of formats) {
      date = dayjs(dateStr, format, true);
      if (date.isValid()) break;
    }

    // If none of the formats worked, try parsing without strict format
    if (!date || !date.isValid()) {
      date = dayjs(dateStr);
    }

    // If still invalid, return original string
    if (!date.isValid()) return dateStr;

    // Format as dd/mm/yy (e.g., 28/10/25)
    return date.format("DD/MM/YY");
  };

  // Calculate UK Financial Year (April 6 - April 5)
  const getFinancialYear = (dateStr) => {
    if (!dateStr) return "-";

    // Try multiple date formats since dates may come from different sources
    const formats = [
      'YYYY-MM-DD',     // Standard ISO format
      'DD/MM/YYYY',     // UK format
      'DD MMM YYYY',    // Text month format (28 Oct 2025)
      'DD/MM/YY',       // Short UK format
      'YYYY/MM/DD',     // Alternative ISO
      'MM/DD/YYYY'      // US format
    ];

    let date = null;
    for (const format of formats) {
      date = dayjs(dateStr, format, true);
      if (date.isValid()) break;
    }

    // If none of the formats worked, try parsing without strict format
    if (!date || !date.isValid()) {
      date = dayjs(dateStr);
    }

    // If still invalid, return dash
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

  // Get creditor initials for icon
  const getCreditorInitials = (debtName) => {
    if (!debtName) return "?";
    const words = debtName.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return debtName.substring(0, 2).toUpperCase();
  };

  // Get creditor icon color
  const getCreditorColor = (debtName) => {
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

    if (!debtName) return colors[0];

    // Generate consistent color based on debt name
    let hash = 0;
    for (let i = 0; i < debtName.length; i++) {
      hash = debtName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Get interest rate color class
  const getInterestColor = (rate) => {
    if (rate >= 20) return "high-interest";
    if (rate >= 10) return "medium-interest";
    return "low-interest";
  };

  // Calculate progress percentage
  const calculateProgress = (debt) => {
    if (!debt.originalBalance || debt.originalBalance === 0) return 0;

    // Calculate total payments from transaction history
    const totalPayments = debt.transactions
      ? debt.transactions
          .filter(t => t.amount < 0) // Only payments (negative amounts)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) // Sum absolute values
      : 0;

    return Math.max(0, Math.min(100, (totalPayments / debt.originalBalance) * 100));
  };

  // Sort debts and preserve original indices
  const sortedDebts = useMemo(() => {
    // Add original index to each debt
    const debtsWithIndex = debts.map((debt, originalIndex) => ({
      ...debt,
      _originalIndex: originalIndex
    }));

    debtsWithIndex.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "debtName":
          aValue = a.debtName || "";
          bValue = b.debtName || "";
          break;
        case "debtType":
          aValue = a.debtType || "";
          bValue = b.debtType || "";
          break;
        case "balance":
          aValue = a.balance || 0;
          bValue = b.balance || 0;
          break;
        case "interestRate":
          aValue = a.interestRate || 0;
          bValue = b.interestRate || 0;
          break;
        case "minimumPayment":
          aValue = a.minimumPayment || 0;
          bValue = b.minimumPayment || 0;
          break;
        case "currentPayment":
          aValue = a.currentPayment || 0;
          bValue = b.currentPayment || 0;
          break;
        case "progress":
          aValue = calculateProgress(a);
          bValue = calculateProgress(b);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return debtsWithIndex;
  }, [debts, sortConfig]);

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

  // Handle delete debt
  const handleDelete = (index, e) => {
    e.stopPropagation();
    onDeleteDebt(index);
  };

  // Handle edit debt
  const handleEdit = (index, e) => {
    e.stopPropagation();
    onEditDebt(index);
  };

  // Handle export transaction history
  const handleExport = (debt, index, e) => {
    e.stopPropagation();

    // Check if debt has transactions
    if (!debt.transactions || debt.transactions.length === 0) {
      alert('No transaction history available for this debt.');
      return;
    }

    // Prepare CSV content
    const headers = ['Transaction Date', 'Financial Year', 'Description', 'Type', 'Amount (£)', 'Creditor'];

    // Add debt summary at the top
    const summary = [
      ['Debt Transaction History Export'],
      [''],
      ['Debt Name:', debt.debtName || '-'],
      ['Debt Type:', debt.debtType || '-'],
      ['Current Balance:', `£${debt.balance.toLocaleString()}`],
      ['Original Balance:', `£${(debt.originalBalance || debt.balance).toLocaleString()}`],
      ['Interest Rate (APR):', `${debt.interestRate.toFixed(2)}%`],
      ['Minimum Payment:', `£${debt.minimumPayment.toLocaleString()}`],
      ['Export Date:', dayjs().format('DD/MM/YYYY HH:mm')],
      [''],
      ['Transaction History:'],
      headers
    ];

    // Convert transactions to CSV rows
    const rows = debt.transactions.map(transaction => {
      const amount = transaction.amount || 0;
      const type = amount < 0 ? 'Payment' : 'Charge';
      const formattedAmount = Math.abs(amount).toFixed(2);
      const date = transaction.transactionDate
        ? dayjs(transaction.transactionDate, 'YYYY-MM-DD', true).format('DD/MM/YYYY')
        : '-';
      const fy = getFinancialYear(transaction.transactionDate);

      return [
        date,
        fy,
        transaction.description || '-',
        type,
        formattedAmount,
        transaction.creditor || debt.debtName || '-'
      ];
    });

    // Combine summary and data
    const csvData = [...summary, ...rows];

    // Convert to CSV string
    const csvContent = csvData
      .map(row => row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
      .join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Generate filename with debt name and date
    const safeDebtName = (debt.debtName || 'debt').replace(/[^a-z0-9]/gi, '_');
    const dateStr = dayjs().format('YYYY-MM-DD');
    const filename = `${safeDebtName}_transactions_${dateStr}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle transaction deletion
  const handleDeleteTransaction = (debtIndex, transactionIndex, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    const debt = debts[debtIndex];
    if (!debt || !debt.transactions) return;

    // Create updated debt with transaction removed
    const updatedTransactions = debt.transactions.filter((_, idx) => idx !== transactionIndex);
    const updatedDebt = {
      ...debt,
      transactions: updatedTransactions
    };

    // Call parent handler to update the debt
    if (onEditDebt) {
      onEditDebt(debtIndex, updatedDebt);
    }
  };

  // Handle starting inline edit
  const handleStartEdit = (debtIndex, transactionIndex) => {
    const debt = debts[debtIndex];
    if (!debt || !debt.transactions) return;

    const transaction = debt.transactions[transactionIndex];
    const amount = transaction.amount || 0;

    // Convert transaction date to YYYY-MM-DD format for date input
    let formattedDateForInput = "";
    if (transaction.transactionDate) {
      // Try multiple date formats to parse
      const formats = [
        'YYYY-MM-DD',     // Standard ISO format
        'DD/MM/YYYY',     // UK format
        'DD MMM YYYY',    // Text month format (28 Oct 2025)
        'DD/MM/YY',       // Short UK format
        'YYYY/MM/DD',     // Alternative ISO
        'MM/DD/YYYY'      // US format
      ];

      let parsedDate = null;
      for (const format of formats) {
        parsedDate = dayjs(transaction.transactionDate, format, true);
        if (parsedDate.isValid()) break;
      }

      // If none worked, try flexible parsing
      if (!parsedDate || !parsedDate.isValid()) {
        parsedDate = dayjs(transaction.transactionDate);
      }

      // Format to YYYY-MM-DD for the date input
      if (parsedDate.isValid()) {
        formattedDateForInput = parsedDate.format('YYYY-MM-DD');
      }
    }

    setEditingTransaction({
      debtIndex,
      transactionIndex,
      originalTransaction: transaction
    });
    setEditedTransaction({
      description: transaction.description || "",
      transactionDate: formattedDateForInput,
      type: amount < 0 ? "payment" : "charge",
      amount: Math.abs(amount).toString()
    });
  };

  // Handle canceling inline edit
  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditedTransaction({
      description: "",
      transactionDate: "",
      type: "charge",
      amount: ""
    });
  };

  // Handle saving edited transaction
  const handleSaveEdit = (debtIndex, e) => {
    e.stopPropagation();

    if (!editingTransaction) return;

    const debt = debts[debtIndex];
    if (!debt || !debt.transactions) return;

    // Parse amount with correct sign based on type
    const numAmount = parseFloat(editedTransaction.amount);
    if (isNaN(numAmount)) {
      alert("Please enter a valid amount");
      return;
    }

    const signedAmount = editedTransaction.type === "payment" ? -Math.abs(numAmount) : Math.abs(numAmount);

    // Create updated transaction
    const updatedTransaction = {
      ...editingTransaction.originalTransaction,
      description: editedTransaction.description,
      transactionDate: editedTransaction.transactionDate,
      amount: signedAmount
    };

    // Find the original transaction in the array and update it
    const updatedTransactions = debt.transactions.map((t, idx) =>
      idx === editingTransaction.transactionIndex ? updatedTransaction : t
    );

    // Sort transactions by date (newest first)
    updatedTransactions.sort((a, b) => {
      const dateA = dayjs(a.transactionDate);
      const dateB = dayjs(b.transactionDate);
      return dateB.diff(dateA); // Descending order (newest first)
    });

    // Create updated debt
    const updatedDebt = {
      ...debt,
      transactions: updatedTransactions
    };

    // Call parent handler to update the debt
    if (onEditDebt) {
      onEditDebt(debtIndex, updatedDebt);
    }

    handleCancelEdit();
  };

  // Calculate totals
  const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMinimum = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const totalOriginal = debts.reduce((sum, debt) => sum + (debt.originalBalance || debt.balance), 0);

  // Calculate total paid off from all transaction histories
  const totalPaidOff = debts.reduce((sum, debt) => {
    const debtPayments = debt.transactions
      ? debt.transactions
          .filter(t => t.amount < 0) // Only payments (negative amounts)
          .reduce((pSum, t) => pSum + Math.abs(t.amount), 0) // Sum absolute values
      : 0;
    return sum + debtPayments;
  }, 0);

  if (!debts || debts.length === 0) {
    return (
      <div className="debt-list-v2-empty">
        <div className="debt-empty-state-v2">
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

  return (
    <div className="debt-list-v2-container">
      <div className="debt-list-v2-header">
        <h3 className="debt-list-v2-title">Your Debts</h3>
        <div className="add-debt-dropdown-wrapper" ref={dropdownRef}>
          <button className="add-debt-button-v2" onClick={toggleDropdown}>
            <Plus size={16} />
            Add Debt
            <ChevronDown size={14} className={`dropdown-chevron ${showAddDropdown ? 'open' : ''}`} />
          </button>
          {showAddDropdown && (
            <div className="add-debt-dropdown-menu">
              <button className="dropdown-menu-item" onClick={handleManualEntry}>
                <Plus size={16} />
                <span>Manual Entry</span>
              </button>
              <button className="dropdown-menu-item" onClick={handleUploadStatement}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span>Upload Statement</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="debt-table-v2-scroll">
        <table className="debt-table-v2">
          <thead>
            <tr>
              <th className="expand-column-v2"></th>
              <th onClick={() => handleSort("debtName")} className="debt-sortable-v2">
                Creditor{getSortIndicator("debtName")}
              </th>
              <th onClick={() => handleSort("debtType")} className="debt-sortable-v2">
                Type{getSortIndicator("debtType")}
              </th>
              <th onClick={() => handleSort("balance")} className="debt-sortable-v2 debt-text-right-v2">
                Balance{getSortIndicator("balance")}
              </th>
              <th onClick={() => handleSort("interestRate")} className="debt-sortable-v2 debt-text-right-v2">
                APR{getSortIndicator("interestRate")}
              </th>
              <th onClick={() => handleSort("minimumPayment")} className="debt-sortable-v2 debt-text-right-v2 debt-hide-mobile-v2">
                Min. Payment{getSortIndicator("minimumPayment")}
              </th>
              <th onClick={() => handleSort("currentPayment")} className="debt-sortable-v2 debt-text-right-v2 debt-hide-mobile-v2">
                Current Payment{getSortIndicator("currentPayment")}
              </th>
              <th onClick={() => handleSort("progress")} className="debt-sortable-v2 debt-text-center-v2">
                Progress{getSortIndicator("progress")}
              </th>
              <th className="debt-text-center-v2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedDebts.map((debt, idx) => {
              const isExpanded = expandedRows.includes(debt._originalIndex);
              const progress = calculateProgress(debt);
              const originalBalance = debt.originalBalance || debt.balance;

              // Calculate amount paid off from transaction history (sum of all payments)
              const totalPayments = debt.transactions
                ? debt.transactions
                    .filter(t => t.amount < 0) // Only payments (negative amounts)
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0) // Sum absolute values
                : 0;

              const paidOff = totalPayments;

              return (
                <React.Fragment key={debt._originalIndex}>
                  <tr className="debt-row-v2">
                    <td className="expand-cell-v2">
                      <button
                        className="expand-button-v2"
                        onClick={(e) => toggleRowExpansion(debt._originalIndex, e)}
                      >
                        <svg
                          className={`chevron-icon-v2 ${isExpanded ? "expanded" : ""}`}
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
                    </td>
                    <td className="debt-creditor-td-v2">
                      <div className="debt-creditor-cell-v2">
                        <div
                          className="debt-creditor-icon-v2"
                          style={{ backgroundColor: getCreditorColor(debt.debtName) }}
                        >
                          {getCreditorInitials(debt.debtName)}
                        </div>
                        {debt.debtName}
                      </div>
                    </td>
                    <td>
                      {debt.debtType ? (
                        <span
                          className={`debt-type-badge-v2 ${debt.debtType
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {debt.debtType}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="debt-text-right-v2">{formatCurrency(debt.balance)}</td>
                    <td className="debt-text-right-v2">
                      <span className={`debt-interest-badge-v2 ${getInterestColor(debt.interestRate)}`}>
                        {debt.interestRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="debt-text-right-v2 debt-hide-mobile-v2">
                      {formatCurrency(debt.minimumPayment)}
                    </td>
                    <td className="debt-text-right-v2 debt-hide-mobile-v2">
                      {formatCurrency(debt.currentPayment || debt.minimumPayment)}
                    </td>
                    <td className="debt-text-center-v2">
                      <div className="debt-progress-cell-v2">
                        <div className="debt-progress-bar-wrapper-v2">
                          <div
                            className="debt-progress-bar-fill-v2"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="debt-progress-text-v2">{progress.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="debt-text-center-v2">
                      <div style={{ display: "flex", gap: 0, justifyContent: "center" }}>
                        <button
                          className="debt-edit-button-v2"
                          onClick={(e) => handleEdit(debt._originalIndex, e)}
                          title="Edit debt"
                        >
                          <Edit2 size={14} />
                        </button>
                        {debt.transactions && debt.transactions.length > 0 && (
                          <button
                            className="debt-export-button-v2"
                            onClick={(e) => handleExport(debt, debt._originalIndex, e)}
                            title="Export transaction history"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <button
                          className="debt-remove-button-v2"
                          onClick={(e) => handleDelete(debt._originalIndex, e)}
                          title="Delete debt"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row - Debt Details */}
                  {isExpanded && (
                    <tr className="debt-expanded-row-v2">
                      <td colSpan="9" className="debt-expanded-cell-v2">
                        <div className="debt-details-container-v2">
                          {/* Summary Statistics */}
                          <div className="debt-stats-grid-v2">
                            <div className="debt-stat-card-v2">
                              <div className="debt-stat-card-label-v2">Original Balance</div>
                              <div className="debt-stat-card-value-v2">{formatCurrency(originalBalance)}</div>
                            </div>
                            <div className="debt-stat-card-v2">
                              <div className="debt-stat-card-label-v2">Amount Paid Off</div>
                              <div className="debt-stat-card-value-v2" style={{ color: paidOff > 0 ? '#10b981' : '#e4e6eb' }}>
                                {paidOff > 0 ? '+' : ''}{formatCurrency(paidOff)}
                              </div>
                            </div>
                            <div className="debt-stat-card-v2">
                              <div className="debt-stat-card-label-v2">Current Balance</div>
                              <div className="debt-stat-card-value-v2">{formatCurrency(debt.balance)}</div>
                            </div>
                            <div className="debt-stat-card-v2">
                              <div className="debt-stat-card-label-v2">Monthly Interest</div>
                              <div className="debt-stat-card-value-v2" style={{ color: '#ef4444' }}>
                                {formatCurrency((debt.balance * debt.interestRate / 100) / 12)}
                              </div>
                            </div>
                          </div>

                          {/* Debt Information */}
                          <div className="debt-info-section-v2">
                            <h4>Debt Information</h4>
                            <div className="debt-info-grid-v2">
                              <div className="debt-info-item-v2">
                                <span className="debt-info-label-v2">Minimum Payment:</span>
                                <span className="debt-info-value-v2">{formatCurrency(debt.minimumPayment)}/mo</span>
                              </div>
                              <div className="debt-info-item-v2">
                                <span className="debt-info-label-v2">Current Payment:</span>
                                <span className="debt-info-value-v2">{formatCurrency(debt.currentPayment || debt.minimumPayment)}/mo</span>
                              </div>
                              <div className="debt-info-item-v2">
                                <span className="debt-info-label-v2">Interest Rate (APR):</span>
                                <span className="debt-info-value-v2">
                                  <span className={`debt-interest-badge-v2 ${getInterestColor(debt.interestRate)}`}>
                                    {debt.interestRate.toFixed(2)}%
                                  </span>
                                </span>
                              </div>
                              <div className="debt-info-item-v2">
                                <span className="debt-info-label-v2">Debt Type:</span>
                                <span className="debt-info-value-v2">{debt.debtType || "—"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress Section */}
                          <div className="debt-progress-section-v2">
                            <h4>Repayment Progress</h4>
                            <div className="debt-large-progress-bar-v2">
                              <div
                                className="debt-large-progress-fill-v2"
                                style={{ width: `${progress}%` }}
                              ></div>
                              <span className="debt-large-progress-text-v2">{progress.toFixed(1)}% Paid Off</span>
                            </div>
                            <div className="debt-progress-stats-v2">
                              <div>
                                <span className="debt-progress-stat-label-v2">Paid:</span>
                                <span className="debt-progress-stat-value-v2" style={{ color: '#10b981' }}>
                                  {formatCurrency(paidOff)}
                                </span>
                              </div>
                              <div>
                                <span className="debt-progress-stat-label-v2">Remaining:</span>
                                <span className="debt-progress-stat-value-v2" style={{ color: '#ef4444' }}>
                                  {formatCurrency(debt.balance)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Transaction History Section */}
                          {debt.transactions && debt.transactions.length > 0 && (
                            <div className="debt-history-section-v2">
                              <h4>Transaction History</h4>
                              <div className="debt-history-table-wrapper-v2">
                                <table className="debt-history-table-v2">
                                  <thead>
                                    <tr>
                                      <th>Description</th>
                                      <th>Category</th>
                                      <th>Date</th>
                                      <th>FY</th>
                                      <th>Type</th>
                                      <th className="debt-text-right-v2">Amount</th>
                                      <th>Source</th>
                                      <th className="debt-text-center-v2">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {debt.transactions
                                      .slice()
                                      .sort((a, b) => {
                                        // Sort by date descending (newest first)
                                        const dateA = dayjs(a.transactionDate);
                                        const dateB = dayjs(b.transactionDate);
                                        return dateB.diff(dateA);
                                      })
                                      .map((transaction, tIdx) => {
                                        // Determine transaction type based on amount
                                        const amount = transaction.amount || 0;
                                        const type = amount < 0 ? "Payment" : "Charge";

                                        // Find original index in unsorted array
                                        const originalTransactionIndex = debt.transactions.findIndex(t => t === transaction);

                                        // Check if this transaction is being edited
                                        const isEditingThis =
                                          editingTransaction &&
                                          editingTransaction.debtIndex === debt._originalIndex &&
                                          editingTransaction.transactionIndex === originalTransactionIndex;

                                        return (
                                          <tr key={tIdx}>
                                            <td>
                                              {isEditingThis ? (
                                                <input
                                                  type="text"
                                                  className="history-input-v2"
                                                  value={editedTransaction.description}
                                                  onChange={(e) =>
                                                    setEditedTransaction((prev) => ({
                                                      ...prev,
                                                      description: e.target.value,
                                                    }))
                                                  }
                                                  placeholder="Description"
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              ) : (
                                                transaction.description
                                                  ? transaction.description.length > 25
                                                    ? `${transaction.description.substring(0, 25)}...`
                                                    : transaction.description
                                                  : "-"
                                              )}
                                            </td>
                                            <td>
                                              <span className="category-badge-v2">
                                                {categorizeTransaction(transaction.description || '')}
                                              </span>
                                            </td>
                                            <td>
                                              {isEditingThis ? (
                                                <input
                                                  type="date"
                                                  className="history-input-v2"
                                                  value={editedTransaction.transactionDate}
                                                  onChange={(e) =>
                                                    setEditedTransaction((prev) => ({
                                                      ...prev,
                                                      transactionDate: e.target.value,
                                                    }))
                                                  }
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              ) : (
                                                formatDate(transaction.transactionDate)
                                              )}
                                            </td>
                                            <td>{getFinancialYear(transaction.transactionDate)}</td>
                                            <td>
                                              {isEditingThis ? (
                                                <select
                                                  className="history-select-v2"
                                                  value={editedTransaction.type}
                                                  onChange={(e) =>
                                                    setEditedTransaction((prev) => ({
                                                      ...prev,
                                                      type: e.target.value,
                                                    }))
                                                  }
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <option value="charge">Charge</option>
                                                  <option value="payment">Payment</option>
                                                </select>
                                              ) : (
                                                <span className={`debt-type-indicator-v2 ${type.toLowerCase()}`}>
                                                  {type}
                                                </span>
                                              )}
                                            </td>
                                            <td className="debt-text-right-v2">
                                              {isEditingThis ? (
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  className="history-input-v2"
                                                  value={editedTransaction.amount}
                                                  onChange={(e) =>
                                                    setEditedTransaction((prev) => ({
                                                      ...prev,
                                                      amount: e.target.value,
                                                    }))
                                                  }
                                                  placeholder="0.00"
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              ) : (
                                                formatCurrencyWithDecimals(Math.abs(amount))
                                              )}
                                            </td>
                                            <td>
                                              <span className="source-badge-v2 source-upload">
                                                Upload
                                              </span>
                                            </td>
                                            <td className="debt-text-center-v2">
                                              {isEditingThis ? (
                                                <div className="history-actions-v2">
                                                  <button
                                                    className="history-save-button-v2"
                                                    onClick={(e) => handleSaveEdit(debt._originalIndex, e)}
                                                    title="Save"
                                                  >
                                                    ✓
                                                  </button>
                                                  <button
                                                    className="history-cancel-button-v2"
                                                    onClick={handleCancelEdit}
                                                    title="Cancel"
                                                  >
                                                    ×
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="history-actions-v2">
                                                  <button
                                                    className="history-action-button-v2"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleStartEdit(debt._originalIndex, originalTransactionIndex);
                                                    }}
                                                    title="Edit transaction"
                                                  >
                                                    ✎
                                                  </button>
                                                  <button
                                                    className="history-action-button-v2 history-remove-button-v2"
                                                    onClick={(e) => handleDeleteTransaction(debt._originalIndex, originalTransactionIndex, e)}
                                                    title="Remove transaction"
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {sortedDebts.length === 0 && (
          <div className="debt-empty-state-v2">
            <p>No debts found</p>
          </div>
        )}
      </div>

      {/* Totals at bottom */}
      <div className="debt-totals-footer-v2">
        <div className="debt-total-item-v2">
          <span className="debt-total-label-v2">Total Balance:</span>
          <span className="debt-total-value-v2">{formatCurrency(totalBalance)}</span>
        </div>
        <div className="debt-total-item-v2">
          <span className="debt-total-label-v2">Total Min. Payment:</span>
          <span className="debt-total-value-v2">{formatCurrency(totalMinimum)}/mo</span>
        </div>
        <div className="debt-total-item-v2">
          <span className="debt-total-label-v2">Total Paid Off:</span>
          <span className="debt-total-value-v2 positive-v2">+{formatCurrency(totalPaidOff)}</span>
        </div>
      </div>
    </div>
  );
}
