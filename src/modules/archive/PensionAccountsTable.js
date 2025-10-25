import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import dayjs from "dayjs";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import debounce from "lodash.debounce";
import "./PensionAccountsTableStyles.css";

export default function PensionAccountsTable({
  pensions,
  selectedPensions,
  onToggle,
  onRemove,
  onUpdateValue,
  onUpdatePensions, // New callback to update entire pensions array
}) {
  const [expandedRows, setExpandedRows] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedValue, setEditedValue] = useState("");
  const [addingDepositIndex, setAddingDepositIndex] = useState(null);
  const [newDeposit, setNewDeposit] = useState({
    amount: "",
    date: "",
    description: "",
  });
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [editedDeposit, setEditedDeposit] = useState({
    amount: "",
    date: "",
    description: "",
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'provider', direction: 'asc' });

  // Debounced Firebase save function
  const debouncedSaveToFirebase = React.useCallback(
    debounce(
      async (userId, updatedPensions, selectedPensions, yearlyTotals) => {
        if (!userId) return;
        const docRef = doc(db, "pensionPots", userId);
        try {
          await setDoc(docRef, {
            pensions: updatedPensions,
            selectedPensions,
            yearlyTotals,
          });
          console.log("Pension data saved to Firebase");
        } catch (err) {
          console.error("Error saving to Firebase:", err);
        }
      },
      1000
    ),
    []
  );

  const formatCurrency = (value) => {
    if (!value || value === 0) return "-";
    return `£${Math.round(Number(value)).toLocaleString()}`;
  };

  const formatCurrencyDetailed = (value) => {
    if (!value || value === 0) return "-";
    return `£${Number(value).toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return dayjs(dateStr).format("DD/MM/YY");
  };

  // Calculate UK Financial Year (April 6 - April 5)
  const getFinancialYear = (dateStr) => {
    if (!dateStr) return "-";
    const date = dayjs(dateStr);
    const year = date.year();
    const month = date.month(); // 0-indexed (0 = January)
    const day = date.date();

    // UK tax year starts April 6
    // If date is before April 6, it belongs to previous FY
    if (month < 3 || (month === 3 && day < 6)) {
      return `${year - 1}/${String(year).slice(2)}`;
    } else {
      return `${year}/${String(year + 1).slice(2)}`;
    }
  };

  // Determine data source based on payment properties
  const getDataSource = (payment) => {
    // If payment has a 'source' property, use it
    if (payment.source) {
      return payment.source;
    }
    // If description contains "Manual deposit" or was added via Add Deposit, mark as Manual
    if (payment.description && payment.description.includes("Manual deposit")) {
      return "Manual";
    }
    // Default to Upload for legacy data
    return "Upload";
  };

  const calculateIRR = (cashflows, guess = 0.05) => {
    if (cashflows.length < 2) return null;
    const maxIterations = 100;
    const precision = 1e-6;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;

      for (let t = 0; t < cashflows.length; t++) {
        const divisor = Math.pow(1 + rate, t);
        npv += cashflows[t] / divisor;
        if (t !== 0) {
          derivative -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
        }
      }

      if (Math.abs(derivative) < precision) break;
      const newRate = rate - npv / derivative;
      if (Math.abs(newRate - rate) < precision) return newRate;
      rate = newRate;
    }

    return isFinite(rate) ? rate : null;
  };

  const calculateProviderIRR = (paymentHistory, currentValue) => {
    if (!paymentHistory || paymentHistory.length === 0 || !currentValue)
      return null;

    try {
      const cashflows = [];
      const paymentsByYear = {};
      const startYear = new Date(paymentHistory[0].date).getFullYear();
      const currentYear = new Date().getFullYear();

      for (let year = startYear; year <= currentYear; year++) {
        paymentsByYear[year] = 0;
      }

      paymentHistory.forEach((payment) => {
        const year = new Date(payment.date).getFullYear();
        paymentsByYear[year] += payment.amount;
      });

      for (let year = startYear; year <= currentYear; year++) {
        if (paymentsByYear[year] > 0) {
          cashflows.push(-paymentsByYear[year]);
        } else if (year < currentYear) {
          cashflows.push(0);
        }
      }

      cashflows.push(currentValue);
      return calculateIRR(cashflows);
    } catch (error) {
      return null;
    }
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || !isFinite(value)) return "-";
    const percentage = value * 100;
    const sign = percentage >= 0 ? "+" : "";
    return `${sign}${percentage.toFixed(1)}%`;
  };

  const toggleExpand = (idx, e) => {
    e.stopPropagation();
    setExpandedRows((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleRemove = (provider, e) => {
    e.stopPropagation();
    setConfirmDelete({ type: "provider", provider });
  };

  const confirmRemoveProvider = () => {
    onRemove(confirmDelete.provider);
    setConfirmDelete(null);
  };

  const handleEditClick = (idx, currentValue, e) => {
    e.stopPropagation();
    setEditingIndex(idx);
    setEditedValue(currentValue ?? "");
  };

  const handleSaveClick = (idx, provider, e) => {
    e.stopPropagation();
    const today = dayjs().format("YYYY-MM-DD");
    onUpdateValue(provider, editedValue, today);
    setEditingIndex(null);
    setEditedValue("");
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingIndex(null);
    setEditedValue("");
  };

  const handleAddDepositClick = (idx, e) => {
    e.stopPropagation();
    setAddingDepositIndex(idx);
    const today = dayjs().format("YYYY-MM-DD");
    setNewDeposit({ amount: "", date: today, description: "" });

    // Expand the row if not already expanded
    if (!expandedRows.includes(idx)) {
      setExpandedRows((prev) => [...prev, idx]);
    }

    // Scroll to the bottom of the expanded row after it renders
    setTimeout(() => {
      const expandedRow = document.querySelector(`[data-expanded-row="${idx}"]`);
      if (expandedRow) {
        const historyTable = expandedRow.querySelector('.history-table-wrapper');
        if (historyTable) {
          historyTable.scrollTop = historyTable.scrollHeight;
        }
      }
    }, 100);
  };

  const handleSaveDeposit = async (idx, e) => {
    e.stopPropagation();
    const amount = parseFloat(newDeposit.amount);
    if (!amount || amount <= 0 || !newDeposit.date) return;

    const updatedPensions = pensions.map((p, i) => {
      if (i !== idx) return p;

      const newPayment = {
        date: newDeposit.date,
        amount,
        description: newDeposit.description || "Manual deposit",
        source: "Manual",
      };

      const updatedHistory = [...(p.paymentHistory || []), newPayment].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      const newDeposits = (p.deposits || 0) + amount;
      const newFirstPayment = updatedHistory[0].date;
      const newLastPayment = updatedHistory[updatedHistory.length - 1].date;

      return {
        ...p,
        paymentHistory: updatedHistory,
        deposits: newDeposits,
        firstPayment: newFirstPayment,
        lastPayment: newLastPayment,
      };
    });

    if (onUpdatePensions) {
      onUpdatePensions(updatedPensions);
    }

    // Save to Firebase
    const user = auth.currentUser;
    if (user) {
      // Calculate yearly totals from updated pensions
      const yearlyTotals = {};
      updatedPensions.forEach((pension) => {
        if (pension.paymentHistory) {
          pension.paymentHistory.forEach((payment) => {
            const year = new Date(payment.date).getFullYear().toString();
            yearlyTotals[year] = (yearlyTotals[year] || 0) + payment.amount;
          });
        }
      });

      debouncedSaveToFirebase(
        user.uid,
        updatedPensions,
        selectedPensions,
        yearlyTotals
      );
    }

    setAddingDepositIndex(null);
    setNewDeposit({ amount: "", date: "", description: "" });

    // Scroll to show the new entry after state updates
    setTimeout(() => {
      const expandedRow = document.querySelector(`[data-expanded-row="${idx}"]`);
      if (expandedRow) {
        const historyTable = expandedRow.querySelector('.history-table-wrapper');
        if (historyTable) {
          historyTable.scrollTop = historyTable.scrollHeight;
        }
      }
    }, 100);
  };

  const handleCancelDeposit = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const idx = addingDepositIndex;
    setAddingDepositIndex(null);
    setNewDeposit({ amount: "", date: "", description: "" });

    // Collapse the row
    if (idx !== null) {
      setExpandedRows((prev) => prev.filter((rowIdx) => rowIdx !== idx));
    }
  };

  const handleEditDeposit = (pensionIdx, depositIdx, payment, e) => {
    e.stopPropagation();
    setEditingDeposit({ pensionIdx, depositIdx });
    setEditedDeposit({
      amount: payment.amount.toString(),
      date: payment.date,
      description: payment.description || "",
    });
  };

  const handleSaveEditedDeposit = async (pensionIdx, depositIdx, e) => {
    e.stopPropagation();
    const amount = parseFloat(editedDeposit.amount);
    if (!amount || amount <= 0 || !editedDeposit.date) return;

    const updatedPensions = pensions.map((p, i) => {
      if (i !== pensionIdx) return p;

      const oldAmount = p.paymentHistory[depositIdx].amount;
      const updatedHistory = p.paymentHistory
        .map((payment, pIdx) =>
          pIdx === depositIdx
            ? {
                date: editedDeposit.date,
                amount,
                description: editedDeposit.description || payment.description,
                source: payment.source || "Upload", // Preserve source or default to Upload
              }
            : payment
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const newDeposits = p.deposits - oldAmount + amount;
      const newFirstPayment = updatedHistory[0].date;
      const newLastPayment = updatedHistory[updatedHistory.length - 1].date;

      return {
        ...p,
        paymentHistory: updatedHistory,
        deposits: newDeposits,
        firstPayment: newFirstPayment,
        lastPayment: newLastPayment,
      };
    });

    if (onUpdatePensions) {
      onUpdatePensions(updatedPensions);
    }

    // Save to Firebase
    const user = auth.currentUser;
    if (user) {
      const yearlyTotals = {};
      updatedPensions.forEach((pension) => {
        if (pension.paymentHistory) {
          pension.paymentHistory.forEach((payment) => {
            const year = new Date(payment.date).getFullYear().toString();
            yearlyTotals[year] = (yearlyTotals[year] || 0) + payment.amount;
          });
        }
      });

      debouncedSaveToFirebase(
        user.uid,
        updatedPensions,
        selectedPensions,
        yearlyTotals
      );
    }

    setEditingDeposit(null);
    setEditedDeposit({ amount: "", date: "", description: "" });
  };

  const handleCancelEditDeposit = (e) => {
    e.stopPropagation();
    setEditingDeposit(null);
    setEditedDeposit({ amount: "", date: "", description: "" });
  };

  const handleRemoveDeposit = (pensionIdx, depositIdx, e) => {
    e.stopPropagation();

    // Use sortedPensions since pensionIdx is from the sorted array
    const pension = sortedPensions[pensionIdx];
    const depositToRemove = pension.paymentHistory[depositIdx];

    setConfirmDelete({
      type: "deposit",
      pensionIdx,
      depositIdx,
      amount: depositToRemove.amount,
      date: depositToRemove.date,
    });
  };

  const confirmRemoveDeposit = async () => {
    const { pensionIdx, depositIdx } = confirmDelete;

    // Get the actual pension from sortedPensions to ensure we're working with the right one
    const targetPension = sortedPensions[pensionIdx];

    const updatedPensions = pensions.map((p) => {
      // Match by provider name instead of index
      if (p.provider !== targetPension.provider) return p;

      const removedAmount = p.paymentHistory[depositIdx].amount;
      const updatedHistory = p.paymentHistory.filter(
        (_, pIdx) => pIdx !== depositIdx
      );

      if (updatedHistory.length === 0) {
        return {
          ...p,
          paymentHistory: [],
          deposits: 0,
          firstPayment: null,
          lastPayment: null,
        };
      }

      const newDeposits = p.deposits - removedAmount;
      const sortedHistory = [...updatedHistory].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const newFirstPayment = sortedHistory[0].date;
      const newLastPayment = sortedHistory[sortedHistory.length - 1].date;

      return {
        ...p,
        paymentHistory: updatedHistory,
        deposits: newDeposits,
        firstPayment: newFirstPayment,
        lastPayment: newLastPayment,
      };
    });

    if (onUpdatePensions) {
      onUpdatePensions(updatedPensions);
    }

    // Save to Firebase
    const user = auth.currentUser;
    if (user) {
      const yearlyTotals = {};
      updatedPensions.forEach((pension) => {
        if (pension.paymentHistory) {
          pension.paymentHistory.forEach((payment) => {
            const year = new Date(payment.date).getFullYear().toString();
            yearlyTotals[year] = (yearlyTotals[year] || 0) + payment.amount;
          });
        }
      });

      debouncedSaveToFirebase(
        user.uid,
        updatedPensions,
        selectedPensions,
        yearlyTotals
      );
    }

    setConfirmDelete(null);
  };

  // Sort handlers
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="sort-icon">⇅</span>;
    }
    return sortConfig.direction === 'asc' ?
      <span className="sort-icon active">↑</span> :
      <span className="sort-icon active">↓</span>;
  };

  // Sort pensions based on sortConfig
  const sortedPensions = [...pensions].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle IRR sorting (calculated value)
    if (sortConfig.key === 'irr') {
      aValue = calculateProviderIRR(a.paymentHistory, a.currentValue);
      bValue = calculateProviderIRR(b.paymentHistory, b.currentValue);
      // Treat null IRR as -Infinity so it sorts to the bottom
      if (aValue === null) aValue = -Infinity;
      if (bValue === null) bValue = -Infinity;
    }
    // Handle Growth sorting (calculated value)
    else if (sortConfig.key === 'growth') {
      aValue = (a.currentValue || 0) - (a.deposits || 0);
      bValue = (b.currentValue || 0) - (b.deposits || 0);
    }
    // Handle date comparisons
    else if (sortConfig.key === 'firstPayment' || sortConfig.key === 'lastPayment') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }
    // Handle null/undefined values for other columns
    else {
      if (aValue === null || aValue === undefined) aValue = 0;
      if (bValue === null || bValue === undefined) bValue = 0;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return (
    <div className="pension-accounts-wrapper dark-mode">
      <h3 className="pension-accounts-title">Pension Accounts</h3>
      <div className="table-scroll-container">
        <table className="pension-accounts-table">
          <thead>
            <tr>
              <th className="expand-col"></th>
              <th onClick={() => handleSort('provider')} className="sortable">
                Provider {getSortIcon('provider')}
              </th>
              <th onClick={() => handleSort('firstPayment')} className="sortable text-right col-first-payment">
                First Deposit {getSortIcon('firstPayment')}
              </th>
              <th onClick={() => handleSort('lastPayment')} className="sortable text-right col-last-payment">
                Last Deposit {getSortIcon('lastPayment')}
              </th>
              <th onClick={() => handleSort('deposits')} className="sortable text-right col-deposits">
                Total Deposits {getSortIcon('deposits')}
              </th>
              <th onClick={() => handleSort('currentValue')} className="sortable text-right">
                Current Value {getSortIcon('currentValue')}
              </th>
              <th onClick={() => handleSort('growth')} className="sortable text-right col-growth hide-mobile">
                Growth {getSortIcon('growth')}
              </th>
              <th onClick={() => handleSort('irr')} className="sortable text-right col-irr">
                IRR {getSortIcon('irr')}
              </th>
              <th className="icon-col"></th>
            </tr>
          </thead>
          <tbody>
            {sortedPensions.map((pension, idx) => {
              const isSelected = selectedPensions.includes(pension.provider);
              const isExpanded = expandedRows.includes(idx);
              const isEditing = editingIndex === idx;
              const isAddingDeposit = addingDepositIndex === idx;
              const irr = calculateProviderIRR(
                pension.paymentHistory,
                pension.currentValue
              );
              const growth = (pension.currentValue || 0) - (pension.deposits || 0);
              const isGrowthPositive = growth >= 0;

              return (
                <React.Fragment key={pension.provider}>
                  <tr
                    className={`pension-account-row ${
                      !isSelected ? "deselected" : ""
                    }`}
                    onClick={() => onToggle(pension.provider)}
                  >
                    <td className="expand-col">
                      <button
                        className="expand-button"
                        onClick={(e) => toggleExpand(idx, e)}
                        aria-label="Expand"
                      >
                        {isExpanded ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>
                    </td>
                    <td title={pension.provider}>{pension.provider}</td>
                    <td className="text-right col-first-payment">
                      {formatDate(pension.firstPayment)}
                    </td>
                    <td className="text-right col-last-payment">
                      {formatDate(pension.lastPayment)}
                    </td>
                    <td className="text-right col-deposits">
                      {formatCurrency(pension.deposits)}
                    </td>
                    <td className="text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="edit-input"
                          value={editedValue}
                          onChange={(e) => setEditedValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        formatCurrency(pension.currentValue)
                      )}
                    </td>
                    <td className="text-right col-growth hide-mobile">
                      <span className={isGrowthPositive ? "gain-text" : "loss-text"}>
                        {isGrowthPositive ? "+" : "−"}
                        {formatCurrency(Math.abs(growth))}
                      </span>
                    </td>
                    <td className="text-right col-irr">
                      <span
                        className={irr && irr >= 0 ? "gain-text" : "loss-text"}
                      >
                        {formatPercentage(irr)}
                      </span>
                    </td>
                    <td className="text-center remove-button-cell">
                      {isEditing ? (
                        <div className="icon-group">
                          <button
                            className="save-button"
                            onClick={(e) =>
                              handleSaveClick(idx, pension.provider, e)
                            }
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            className="remove-button"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="icon-group">
                          <button
                            className="add-button"
                            onClick={(e) => handleAddDepositClick(idx, e)}
                            title="Add Deposit"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            className="edit-button"
                            onClick={(e) =>
                              handleEditClick(idx, pension.currentValue, e)
                            }
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            className="remove-button"
                            onClick={(e) => handleRemove(pension.provider, e)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr data-expanded-row={idx}>
                      <td colSpan="9" className="expanded-cell">
                        <div className="expanded-content">
                          <h4 className="history-title">
                            Contribution History
                          </h4>

                          <div className="history-table-wrapper">
                            <table className="history-table">
                              <thead>
                                <tr>
                                  <th className="history-desc-col">
                                    Description
                                  </th>
                                  <th className="text-right history-date-col">
                                    <span className="hide-mobile">Deposit Date</span>
                                    <span className="show-mobile">Date</span>
                                  </th>
                                  <th className="text-right history-value-col">
                                    <span className="hide-mobile">Deposit Value</span>
                                    <span className="show-mobile">Deposit</span>
                                  </th>
                                  <th className="text-right history-fy-col hide-mobile">
                                    Financial Year
                                  </th>
                                  <th className="text-right history-source-col hide-mobile">
                                    Data Source
                                  </th>
                                  <th className="history-actions-col"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {pension.paymentHistory &&
                                  pension.paymentHistory.map(
                                    (payment, pIdx) => {
                                      const isEditingThis =
                                        editingDeposit?.pensionIdx === idx &&
                                        editingDeposit?.depositIdx === pIdx;

                                      return (
                                        <tr
                                          key={`${payment.date}-${pIdx}`}
                                          className="history-row"
                                        >
                                          <td className="history-desc-col">
                                            {isEditingThis ? (
                                              <input
                                                type="text"
                                                className="history-input history-desc-input"
                                                value={
                                                  editedDeposit.description
                                                }
                                                onChange={(e) =>
                                                  setEditedDeposit((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                  }))
                                                }
                                                placeholder="Description"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              />
                                            ) : (
                                              <span
                                                className="description-text"
                                                title={payment.description}
                                              >
                                                {payment.description || "-"}
                                              </span>
                                            )}
                                          </td>
                                          <td className="text-right history-date-col">
                                            {isEditingThis ? (
                                              <input
                                                type="date"
                                                className="history-input history-date-input"
                                                value={editedDeposit.date}
                                                onChange={(e) =>
                                                  setEditedDeposit((prev) => ({
                                                    ...prev,
                                                    date: e.target.value,
                                                  }))
                                                }
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              />
                                            ) : (
                                              formatDate(payment.date)
                                            )}
                                          </td>
                                          <td className="text-right history-value-col">
                                            {isEditingThis ? (
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="history-input history-amount-input"
                                                value={editedDeposit.amount}
                                                onChange={(e) =>
                                                  setEditedDeposit((prev) => ({
                                                    ...prev,
                                                    amount: e.target.value,
                                                  }))
                                                }
                                                placeholder="0.00"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              />
                                            ) : (
                                              formatCurrencyDetailed(
                                                payment.amount
                                              )
                                            )}
                                          </td>
                                          <td className="text-right history-fy-col hide-mobile">
                                            {getFinancialYear(payment.date)}
                                          </td>
                                          <td className="text-right history-source-col hide-mobile">
                                            <span className={`source-badge source-${getDataSource(payment).toLowerCase()}`}>
                                              {getDataSource(payment)}
                                            </span>
                                          </td>
                                          <td className="text-center history-actions-col">
                                            {isEditingThis ? (
                                              <div className="icon-group">
                                                <button
                                                  className="history-save-button"
                                                  onClick={(e) =>
                                                    handleSaveEditedDeposit(
                                                      idx,
                                                      pIdx,
                                                      e
                                                    )
                                                  }
                                                  title="Save"
                                                >
                                                  ✓
                                                </button>
                                                <button
                                                  className="history-remove-button"
                                                  onClick={
                                                    handleCancelEditDeposit
                                                  }
                                                  title="Cancel"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="icon-group">
                                                <button
                                                  className="history-edit-button"
                                                  onClick={(e) =>
                                                    handleEditDeposit(
                                                      idx,
                                                      pIdx,
                                                      payment,
                                                      e
                                                    )
                                                  }
                                                  title="Edit"
                                                >
                                                  ✎
                                                </button>
                                                <button
                                                  className="history-remove-button"
                                                  onClick={(e) =>
                                                    handleRemoveDeposit(
                                                      idx,
                                                      pIdx,
                                                      e
                                                    )
                                                  }
                                                  title="Remove"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    }
                                  )}
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
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Confirm Deletion</h3>
            <p className="modal-text">
              {confirmDelete.type === "provider"
                ? `Are you sure you want to remove ${confirmDelete.provider}?`
                : `Are you sure you want to remove the ${formatCurrencyDetailed(
                    confirmDelete.amount
                  )} deposit from ${formatDate(confirmDelete.date)}?`}
            </p>
            <div className="modal-buttons">
              <button
                className="modal-confirm-button"
                onClick={
                  confirmDelete.type === "provider"
                    ? confirmRemoveProvider
                    : confirmRemoveDeposit
                }
              >
                Yes, Remove
              </button>
              <button
                className="modal-cancel-button"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {addingDepositIndex !== null && (
        <div className="modal-overlay" onClick={handleCancelDeposit}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Deposit</h2>
              <button onClick={handleCancelDeposit} className="modal-close">
                <X size={24} />
              </button>
            </div>

            <div className="modal-body modal-body-compact">
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={newDeposit.description}
                  onChange={(e) =>
                    setNewDeposit((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g., Monthly contribution"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newDeposit.date}
                  onChange={(e) =>
                    setNewDeposit((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={newDeposit.amount}
                  onChange={(e) =>
                    setNewDeposit((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={handleCancelDeposit}
                className="modal-btn modal-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleSaveDeposit(addingDepositIndex, e)}
                className="modal-btn modal-btn-primary"
                disabled={!newDeposit.amount || !newDeposit.date}
              >
                Save Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
