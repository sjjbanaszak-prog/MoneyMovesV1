import React, { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import debounce from "lodash.debounce";
import UnifiedPensionUploader from "./UnifiedPensionUploader";
import MappingReviewModal from "./MappingReviewModal";
import "./PensionAccountsTableV2Styles.css";

dayjs.extend(customParseFormat);

export default function PensionAccountsTableV2({
  pensions,
  selectedPensions,
  onToggle,
  onRemove,
  onUpdateValue,
  onUpdatePensions,
  onFileParsed,
  onMappingConfirmed,
  isDemoMode = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "provider", direction: "asc" });
  const [expandedRows, setExpandedRows] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedValue, setEditedValue] = useState("");
  const [addingDepositProvider, setAddingDepositProvider] = useState(null);
  const [newDeposit, setNewDeposit] = useState({ amount: "", date: "", description: "" });
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [editedDeposit, setEditedDeposit] = useState({ amount: "", date: "", description: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

  // Helper function for parsing dates based on demo mode
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (isDemoMode) {
      // Demo data uses DD/MM/YYYY format - use strict parsing
      return dayjs(dateStr, "DD/MM/YYYY", true);
    }
    // Live data - use flexible parsing
    return dayjs(dateStr);
  };

  // Helper function to format currency
  const formatCurrency = (value) => {
    if (!value || value === 0) return "-";
    return `£${Math.round(Number(value)).toLocaleString()}`;
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const parsed = parseDate(dateStr);
    if (!parsed || !parsed.isValid()) return "-";
    return parsed.format("DD/MM/YY");
  };

  // Calculate IRR using Newton-Raphson method
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

  // Calculate Provider IRR (aggregated by year)
  const calculateProviderIRR = (paymentHistory, currentValue) => {
    if (!paymentHistory || paymentHistory.length === 0 || !currentValue) return null;

    try {
      const cashflows = [];
      const paymentsByYear = {};

      // Parse first payment date flexibly
      const firstDate = parseDate(paymentHistory[0].date);
      if (!firstDate.isValid()) return null;

      const startYear = firstDate.year();
      const currentYear = dayjs().year();

      for (let year = startYear; year <= currentYear; year++) {
        paymentsByYear[year] = 0;
      }

      paymentHistory.forEach((payment) => {
        const paymentDate = parseDate(payment.date);
        if (paymentDate.isValid()) {
          const year = paymentDate.year();
          paymentsByYear[year] += payment.amount;
        }
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

  // Format IRR as percentage
  const formatIRR = (irr) => {
    if (irr === null || isNaN(irr) || !isFinite(irr)) return "-";
    const percentage = irr * 100;
    const formatted = percentage.toFixed(1);
    const sign = percentage >= 0 ? "+" : "";
    return `${sign}${formatted}%`;
  };

  // Get provider initials for icon
  const getProviderInitials = (providerName) => {
    if (!providerName) return "?";
    const words = providerName.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return providerName.substring(0, 2).toUpperCase();
  };

  // Get provider icon color
  const getProviderColor = (providerName) => {
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

    if (!providerName) return colors[0];

    // Generate consistent color based on provider name
    let hash = 0;
    for (let i = 0; i < providerName.length; i++) {
      hash = providerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Determine status (Active or Frozen based on last payment date)
  const getStatus = (lastPayment) => {
    if (!lastPayment) return "frozen";
    const lastPaymentDate = parseDate(lastPayment);
    if (!lastPaymentDate || !lastPaymentDate.isValid()) return "frozen";
    const monthsSinceLastPayment = dayjs().diff(lastPaymentDate, "month");
    return monthsSinceLastPayment <= 3 ? "active" : "frozen";
  };

  // Filter pensions based on search term
  const filteredPensions = useMemo(() => {
    if (!searchTerm) return pensions;

    const term = searchTerm.toLowerCase();
    return pensions.filter((pension) =>
      pension.provider.toLowerCase().includes(term)
    );
  }, [pensions, searchTerm]);

  // Sort pensions
  const sortedPensions = useMemo(() => {
    const sorted = [...filteredPensions];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "provider":
          aValue = a.provider || "";
          bValue = b.provider || "";
          break;
        case "firstPayment":
          aValue = a.firstPayment ? new Date(a.firstPayment).getTime() : 0;
          bValue = b.firstPayment ? new Date(b.firstPayment).getTime() : 0;
          break;
        case "lastPayment":
          aValue = a.lastPayment ? new Date(a.lastPayment).getTime() : 0;
          bValue = b.lastPayment ? new Date(b.lastPayment).getTime() : 0;
          break;
        case "deposits":
          aValue = a.deposits || 0;
          bValue = b.deposits || 0;
          break;
        case "currentValue":
          aValue = a.currentValue || 0;
          bValue = b.currentValue || 0;
          break;
        case "growth":
          aValue = (a.currentValue || 0) - (a.deposits || 0);
          bValue = (b.currentValue || 0) - (b.deposits || 0);
          break;
        case "irr":
          aValue = calculateProviderIRR(a.paymentHistory, a.currentValue) || -Infinity;
          bValue = calculateProviderIRR(b.paymentHistory, b.currentValue) || -Infinity;
          break;
        case "status":
          aValue = getStatus(a.lastPayment);
          bValue = getStatus(b.lastPayment);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredPensions, sortConfig]);

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

  // Calculate UK Financial Year (April 6 - April 5)
  const getFinancialYear = (dateStr) => {
    if (!dateStr) return "-";
    const date = parseDate(dateStr);
    if (!date || !date.isValid()) return "-";

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

  // Calculate contribution statistics
  const calculateContributionStats = (paymentHistory) => {
    if (!paymentHistory || paymentHistory.length === 0) return null;

    const total = paymentHistory.reduce((sum, p) => sum + p.amount, 0);

    // Parse dates using DD/MM/YYYY format
    const years = new Set(
      paymentHistory
        .map((p) => {
          const date = parseDate(p.date);
          return date.isValid() ? date.year() : null;
        })
        .filter((year) => year !== null)
    ).size;

    const avgPerYear = years > 0 ? total / years : 0;
    const avgPerMonth = paymentHistory.length > 0 ? total / paymentHistory.length : 0;

    return {
      total,
      avgPerYear,
      avgPerMonth,
      count: paymentHistory.length,
    };
  };

  // Determine data source based on payment properties (same logic as PensionAccountsTable)
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

  // Calculate linear regression trendline
  const calculateTrendline = (paymentHistory) => {
    if (!paymentHistory || paymentHistory.length < 2) return null;

    const sortedPayments = paymentHistory
      .slice()
      .sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA.diff(dateB);
      });

    const n = sortedPayments.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    sortedPayments.forEach((payment, index) => {
      sumX += index;
      sumY += payment.amount;
      sumXY += index * payment.amount;
      sumXX += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return sortedPayments.map((_, index) => ({
      index,
      value: slope * index + intercept,
    }));
  };

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

  // Handler functions for main table actions
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

  const handleAddDepositClick = (provider, idx, e) => {
    e.stopPropagation();
    setAddingDepositProvider(provider);
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
        const historyTable = expandedRow.querySelector('.history-table-wrapper-v2');
        if (historyTable) {
          historyTable.scrollTop = historyTable.scrollHeight;
        }
      }
    }, 100);
  };

  const handleSaveDeposit = async (provider, e) => {
    e.stopPropagation();
    const amount = parseFloat(newDeposit.amount);
    if (!amount || amount <= 0 || !newDeposit.date) return;

    const updatedPensions = pensions.map((p) => {
      if (p.provider !== provider) return p;

      const newPayment = {
        date: newDeposit.date,
        amount,
        description: newDeposit.description || "Manual deposit",
        source: "Manual",
      };

      const updatedHistory = [...(p.paymentHistory || []), newPayment].sort(
        (a, b) => {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          return dateA.diff(dateB);
        }
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
      const yearlyTotals = {};
      updatedPensions.forEach((pension) => {
        if (pension.paymentHistory) {
          pension.paymentHistory.forEach((payment) => {
            const paymentDate = parseDate(payment.date);
            if (paymentDate.isValid()) {
              const year = paymentDate.year().toString();
              yearlyTotals[year] = (yearlyTotals[year] || 0) + payment.amount;
            }
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

    setAddingDepositProvider(null);
    setNewDeposit({ amount: "", date: "", description: "" });
  };

  const handleCancelDeposit = (e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    setAddingDepositProvider(null);
    setNewDeposit({ amount: "", date: "", description: "" });
  };

  // Edit deposit in contribution history
  const handleEditDeposit = (provider, payment, e) => {
    e.stopPropagation();
    setEditingDeposit({ provider, payment });
    setEditedDeposit({
      amount: payment.amount.toString(),
      date: payment.date,
      description: payment.description || "",
    });
  };

  const handleSaveEditedDeposit = async (provider, e) => {
    e.stopPropagation();
    const amount = parseFloat(editedDeposit.amount);
    if (!amount || amount <= 0 || !editedDeposit.date) return;

    const { payment: originalPayment } = editingDeposit;

    const updatedPensions = pensions.map((p) => {
      if (p.provider !== provider) return p;

      // Find the index of the original payment by matching all properties
      const depositIdx = p.paymentHistory.findIndex(
        (payment) =>
          payment.date === originalPayment.date &&
          payment.amount === originalPayment.amount &&
          payment.description === originalPayment.description
      );

      if (depositIdx === -1) return p;

      const oldAmount = p.paymentHistory[depositIdx].amount;
      const updatedHistory = p.paymentHistory
        .map((payment, pIdx) =>
          pIdx === depositIdx
            ? {
                date: editedDeposit.date,
                amount,
                description: editedDeposit.description || payment.description,
                source: payment.source || "Upload",
              }
            : payment
        )
        .sort((a, b) => {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          return dateA.diff(dateB);
        });

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
            const paymentDate = parseDate(payment.date);
            if (paymentDate.isValid()) {
              const year = paymentDate.year().toString();
              yearlyTotals[year] = (yearlyTotals[year] || 0) + payment.amount;
            }
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

  const handleRemoveDeposit = (provider, payment, e) => {
    e.stopPropagation();

    setConfirmDelete({
      type: "deposit",
      provider,
      payment,
      amount: payment.amount,
      date: payment.date,
    });
  };

  const confirmRemoveDeposit = async () => {
    const { provider, payment: paymentToRemove } = confirmDelete;

    const updatedPensions = pensions.map((p) => {
      if (p.provider !== provider) return p;

      // Find the payment by matching all properties
      const depositIdx = p.paymentHistory.findIndex(
        (payment) =>
          payment.date === paymentToRemove.date &&
          payment.amount === paymentToRemove.amount &&
          payment.description === paymentToRemove.description
      );

      if (depositIdx === -1) return p;

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
            const paymentDate = parseDate(payment.date);
            if (paymentDate.isValid()) {
              const year = paymentDate.year().toString();
              yearlyTotals[year] = (yearlyTotals[year] || 0) + payment.amount;
            }
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

  // Handle upload workflow
  const handleAddPensionData = () => {
    setShowUploader(true);
  };

  const handleFileParsedInternal = (parsedResult) => {
    console.log("PensionAccountsTableV2: File parsed, closing uploader and calling parent");
    setShowUploader(false);

    // Call parent to show the mapping review modal (parent manages this)
    if (onFileParsed) {
      onFileParsed(parsedResult);
    }
  };

  // Note: handleMappingConfirmedInternal and handleCancelMapping removed
  // since parent (PensionPots) handles the MappingReviewModal directly

  return (
    <div className="table-container-v2">
      <div className="table-header-v2">
        <h3 className="table-title-v2">Pension Providers</h3>
        <button className="add-pension-button-v2" onClick={handleAddPensionData}>
          <Plus size={16} />
          Add Pension Data
        </button>
      </div>

      <div className="table-scroll-v2">
        <table>
          <thead>
            <tr>
              <th className="expand-column-v2"></th>
              <th onClick={() => handleSort("provider")} className="sortable-v2">
                Provider{getSortIndicator("provider")}
              </th>
              <th onClick={() => handleSort("status")} className="sortable-v2 text-center-v2">
                Status{getSortIndicator("status")}
              </th>
              <th onClick={() => handleSort("firstPayment")} className="sortable-v2 text-right-v2 hide-mobile-v2">
                First Deposit{getSortIndicator("firstPayment")}
              </th>
              <th onClick={() => handleSort("lastPayment")} className="sortable-v2 text-right-v2">
                Last Deposit{getSortIndicator("lastPayment")}
              </th>
              <th onClick={() => handleSort("deposits")} className="sortable-v2 text-right-v2">
                Total Deposits{getSortIndicator("deposits")}
              </th>
              <th onClick={() => handleSort("currentValue")} className="sortable-v2 text-right-v2">
                Current Value{getSortIndicator("currentValue")}
              </th>
              <th onClick={() => handleSort("growth")} className="sortable-v2 text-right-v2">
                Growth{getSortIndicator("growth")}
              </th>
              <th onClick={() => handleSort("irr")} className="sortable-v2 text-right-v2">
                IRR{getSortIndicator("irr")}
              </th>
              <th className="text-center-v2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPensions.map((pension, idx) => {
              const irr = calculateProviderIRR(pension.paymentHistory, pension.currentValue);
              const growth = (pension.currentValue || 0) - (pension.deposits || 0);
              const status = getStatus(pension.lastPayment);
              const isSelected = selectedPensions.includes(pension.provider);
              const isExpanded = expandedRows.includes(idx);
              const isEditing = editingIndex === idx;
              const hasHistory = pension.paymentHistory && pension.paymentHistory.length > 0;
              const stats = calculateContributionStats(pension.paymentHistory);
              const isLastSelected = isSelected && selectedPensions.length === 1;

              return (
                <React.Fragment key={idx}>
                  <tr
                    className={!isSelected ? "row-selected-v2" : ""}
                    onClick={() => onToggle(pension.provider)}
                    style={isLastSelected ? { cursor: "not-allowed" } : {}}
                    title={isLastSelected ? "At least one pension provider must remain selected" : ""}
                  >
                    <td className="expand-cell-v2">
                      {hasHistory && (
                        <button
                          className="expand-button-v2"
                          onClick={(e) => toggleRowExpansion(idx, e)}
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
                      )}
                    </td>
                  <td className="provider-td-v2">
                    <div className="provider-cell-v2">
                      <div
                        className="provider-icon-v2"
                        style={{ backgroundColor: getProviderColor(pension.provider) }}
                      >
                        {getProviderInitials(pension.provider)}
                      </div>
                      {pension.provider}
                    </div>
                  </td>
                  <td className="text-center-v2">
                    <span className={`status-badge-v2 status-${status}-v2`}>
                      {status === "active" ? "Active" : "Frozen"}
                    </span>
                  </td>
                  <td className="text-right-v2 hide-mobile-v2">{formatDate(pension.firstPayment)}</td>
                  <td className="text-right-v2">{formatDate(pension.lastPayment)}</td>
                  <td className="text-right-v2">{formatCurrency(pension.deposits)}</td>
                  <td className="text-right-v2 value-highlight-v2">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="edit-input-v2"
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      formatCurrency(pension.currentValue)
                    )}
                  </td>
                  <td className="text-right-v2">
                    <span className={growth >= 0 ? "growth-positive-v2" : "growth-negative-v2"}>
                      {growth >= 0 ? "+" : "−"}{formatCurrency(Math.abs(growth))}
                    </span>
                  </td>
                  <td className="text-right-v2">
                    <span className={irr && irr >= 0 ? "growth-positive-v2" : "growth-negative-v2"}>
                      {formatIRR(irr)}
                    </span>
                  </td>
                  <td className="text-center-v2">
                    {isEditing ? (
                      <div className="icon-group-v2">
                        <button
                          className="save-button-v2"
                          onClick={(e) => handleSaveClick(idx, pension.provider, e)}
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          className="remove-button-v2"
                          onClick={handleCancelEdit}
                          title="Cancel"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="icon-group-v2">
                        <button
                          className="add-button-v2"
                          onClick={(e) => handleAddDepositClick(pension.provider, idx, e)}
                          title="Add Deposit"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          className="edit-button-v2"
                          onClick={(e) => handleEditClick(idx, pension.currentValue, e)}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          className="remove-button-v2"
                          onClick={(e) => handleRemove(pension.provider, e)}
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>

                {/* Expanded Row - Contribution History */}
                {isExpanded && hasHistory && (
                  <tr className="expanded-row-v2">
                    <td colSpan="10" className="expanded-cell-v2">
                      <div className="history-container-v2">
                        {/* Summary Statistics */}
                        <div className="history-stats-v2">
                          <div className="stat-card-v2">
                            <div className="stat-label-v2">Total Contributions</div>
                            <div className="stat-value-v2">{formatCurrency(stats.total)}</div>
                          </div>
                          <div className="stat-card-v2">
                            <div className="stat-label-v2">Average per Year</div>
                            <div className="stat-value-v2">{formatCurrency(stats.avgPerYear)}</div>
                          </div>
                          <div className="stat-card-v2">
                            <div className="stat-label-v2">Average per Payment</div>
                            <div className="stat-value-v2">{formatCurrency(stats.avgPerMonth)}</div>
                          </div>
                          <div className="stat-card-v2">
                            <div className="stat-label-v2">Total Payments</div>
                            <div className="stat-value-v2">{stats.count}</div>
                          </div>
                        </div>

                        {/* Mini Timeline Chart */}
                        <div className="timeline-chart-v2">
                          <div className="timeline-label-v2">Contribution Timeline</div>
                          <div className="timeline-bars-container-v2">
                            <div className="timeline-bars-v2">
                              {pension.paymentHistory
                                .slice()
                                .sort((a, b) => {
                                  const dateA = parseDate(a.date);
                                  const dateB = parseDate(b.date);
                                  return dateA.diff(dateB);
                                })
                                .map((payment, pIdx) => {
                                  const maxAmount = Math.max(...pension.paymentHistory.map((p) => p.amount));
                                  const heightPercent = (payment.amount / maxAmount) * 100;

                                  return (
                                    <div
                                      key={pIdx}
                                      className="timeline-bar-v2"
                                      style={{ height: `${heightPercent}%` }}
                                      title={`${formatDate(payment.date)}: ${formatCurrency(payment.amount)}`}
                                    />
                                  );
                                })}
                            </div>
                            {(() => {
                              const trendline = calculateTrendline(pension.paymentHistory);
                              if (!trendline) return null;

                              const maxAmount = Math.max(...pension.paymentHistory.map((p) => p.amount));
                              const points = trendline
                                .map((point, idx) => {
                                  const x = (idx / (trendline.length - 1)) * 100;
                                  const y = 100 - (point.value / maxAmount) * 100;
                                  return `${x},${y}`;
                                })
                                .join(' ');

                              return (
                                <svg className="timeline-trendline-v2" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <polyline
                                    points={points}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth="0.5"
                                    strokeDasharray="1,1"
                                    opacity="0.8"
                                  />
                                </svg>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Contribution History Table */}
                        <div className="history-table-wrapper-v2">
                          <table className="history-table-v2">
                            <thead>
                              <tr>
                                <th>Description</th>
                                <th>Date</th>
                                <th>FY</th>
                                <th className="text-right-v2">Amount</th>
                                <th>Source</th>
                                <th className="text-center-v2">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pension.paymentHistory
                                .slice()
                                .sort((a, b) => {
                                  const dateA = parseDate(a.date);
                                  const dateB = parseDate(b.date);
                                  return dateB.diff(dateA); // Reverse sort (newest first)
                                })
                                .map((payment, pIdx) => {
                                  const isEditingThis =
                                    editingDeposit &&
                                    editingDeposit.provider === pension.provider &&
                                    editingDeposit.payment &&
                                    editingDeposit.payment.date === payment.date &&
                                    editingDeposit.payment.amount === payment.amount &&
                                    editingDeposit.payment.description === payment.description;

                                  return (
                                    <tr key={pIdx}>
                                      <td>
                                        {isEditingThis ? (
                                          <input
                                            type="text"
                                            className="history-input-v2"
                                            value={editedDeposit.description}
                                            onChange={(e) =>
                                              setEditedDeposit((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                              }))
                                            }
                                            placeholder="Description"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        ) : (
                                          payment.description
                                            ? payment.description.length > 25
                                              ? `${payment.description.substring(0, 25)}...`
                                              : payment.description
                                            : "-"
                                        )}
                                      </td>
                                      <td>
                                        {isEditingThis ? (
                                          <input
                                            type="date"
                                            className="history-input-v2"
                                            value={editedDeposit.date}
                                            onChange={(e) =>
                                              setEditedDeposit((prev) => ({
                                                ...prev,
                                                date: e.target.value,
                                              }))
                                            }
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        ) : (
                                          formatDate(payment.date)
                                        )}
                                      </td>
                                      <td>{getFinancialYear(payment.date)}</td>
                                      <td className="text-right-v2">
                                        {isEditingThis ? (
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="history-input-v2"
                                            value={editedDeposit.amount}
                                            onChange={(e) =>
                                              setEditedDeposit((prev) => ({
                                                ...prev,
                                                amount: e.target.value,
                                              }))
                                            }
                                            placeholder="0.00"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        ) : (
                                          formatCurrency(payment.amount)
                                        )}
                                      </td>
                                      <td>
                                        <span className={`source-badge-v2 source-${getDataSource(payment).toLowerCase()}`}>
                                          {getDataSource(payment)}
                                        </span>
                                      </td>
                                      <td className="text-center-v2">
                                        {isEditingThis ? (
                                          <div className="history-actions-v2">
                                            <button
                                              className="history-save-button-v2"
                                              onClick={(e) =>
                                                handleSaveEditedDeposit(
                                                  pension.provider,
                                                  e
                                                )
                                              }
                                              title="Save"
                                            >
                                              ✓
                                            </button>
                                            <button
                                              className="history-cancel-button-v2"
                                              onClick={handleCancelEditDeposit}
                                              title="Cancel"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="history-actions-v2">
                                            <button
                                              className="history-action-button-v2"
                                              onClick={(e) =>
                                                handleEditDeposit(
                                                  pension.provider,
                                                  payment,
                                                  e
                                                )
                                              }
                                              title="Edit"
                                            >
                                              ✎
                                            </button>
                                            <button
                                              className="history-action-button-v2 history-remove-button-v2"
                                              onClick={(e) =>
                                                handleRemoveDeposit(
                                                  pension.provider,
                                                  payment,
                                                  e
                                                )
                                              }
                                              title="Remove"
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
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          </tbody>
        </table>

        {sortedPensions.length === 0 && (
          <div className="empty-state-v2">
            <p>No pension providers found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="modal-overlay-v2" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content-v2" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title-v2">Confirm Deletion</h3>
            <p className="modal-text-v2">
              {confirmDelete.type === "provider"
                ? `Are you sure you want to remove ${confirmDelete.provider}?`
                : `Are you sure you want to remove this deposit of ${formatCurrency(confirmDelete.amount)} from ${formatDate(confirmDelete.date)}?`}
            </p>
            <div className="modal-buttons-v2">
              <button
                className="modal-confirm-button-v2"
                onClick={
                  confirmDelete.type === "provider"
                    ? confirmRemoveProvider
                    : confirmRemoveDeposit
                }
              >
                Yes, Remove
              </button>
              <button
                className="modal-cancel-button-v2"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Pension Data Modal */}
      {showUploader && (
        <UnifiedPensionUploader
          onFileParsed={handleFileParsedInternal}
          onClose={() => setShowUploader(false)}
        />
      )}

      {/* Add Deposit Modal */}
      {addingDepositProvider !== null && (
        <div className="modal-overlay-v2" onClick={handleCancelDeposit}>
          <div className="modal-content-box-v2" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-v2">
              <h2 className="modal-title-v2">Add New Deposit</h2>
              <button onClick={handleCancelDeposit} className="modal-close-v2">
                ×
              </button>
            </div>

            <div className="modal-body-v2">
              <div className="form-group-v2">
                <label className="form-label-v2">Description</label>
                <input
                  type="text"
                  className="form-input-v2"
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

              <div className="form-group-v2">
                <label className="form-label-v2">Date</label>
                <input
                  type="date"
                  className="form-input-v2"
                  value={newDeposit.date}
                  onChange={(e) =>
                    setNewDeposit((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group-v2">
                <label className="form-label-v2">Amount (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input-v2"
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

            <div className="modal-footer-v2">
              <button
                onClick={handleCancelDeposit}
                className="modal-btn-v2 modal-btn-secondary-v2"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleSaveDeposit(addingDepositProvider, e)}
                className="modal-btn-v2 modal-btn-primary-v2"
                disabled={!newDeposit.amount || !newDeposit.date}
              >
                Save Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note: MappingReviewModal is handled by parent (PensionPots) */}
    </div>
  );
}
