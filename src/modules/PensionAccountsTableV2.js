import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import "./PensionAccountsTableV2Styles.css";

export default function PensionAccountsTableV2({
  pensions,
  selectedPensions,
  onToggle,
  onRemove,
  onUpdateValue,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "provider", direction: "asc" });

  // Helper function to format currency
  const formatCurrency = (value) => {
    if (!value || value === 0) return "-";
    return `£${Math.round(Number(value)).toLocaleString()}`;
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return dayjs(dateStr).format("DD/MM/YY");
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
    const monthsSinceLastPayment = dayjs().diff(dayjs(lastPayment), "month");
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

  return (
    <div className="table-container-v2">
      <div className="table-header-v2">
        <h3 className="table-title-v2">Pension Providers</h3>
      </div>

      <div className="table-scroll-v2">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("provider")} className="sortable-v2">
                Provider{getSortIndicator("provider")}
              </th>
              <th onClick={() => handleSort("status")} className="sortable-v2 text-center-v2">
                Status{getSortIndicator("status")}
              </th>
              <th onClick={() => handleSort("firstPayment")} className="sortable-v2 text-right-v2">
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
            </tr>
          </thead>
          <tbody>
            {sortedPensions.map((pension, idx) => {
              const irr = calculateProviderIRR(pension.paymentHistory, pension.currentValue);
              const growth = (pension.currentValue || 0) - (pension.deposits || 0);
              const status = getStatus(pension.lastPayment);
              const isSelected = selectedPensions.includes(pension.provider);

              return (
                <tr
                  key={idx}
                  className={!isSelected ? "row-selected-v2" : ""}
                  onClick={() => onToggle(pension.provider)}
                >
                  <td>
                    <div className="provider-cell-v2">
                      <div
                        className="provider-icon-v2"
                        style={{ backgroundColor: getProviderColor(pension.provider) }}
                      >
                        {getProviderInitials(pension.provider)}
                      </div>
                      <span className="provider-name-v2">{pension.provider}</span>
                    </div>
                  </td>
                  <td className="text-center-v2">
                    <span className={`status-badge-v2 status-${status}-v2`}>
                      {status === "active" ? "Active" : "Frozen"}
                    </span>
                  </td>
                  <td className="text-right-v2">{formatDate(pension.firstPayment)}</td>
                  <td className="text-right-v2">{formatDate(pension.lastPayment)}</td>
                  <td className="text-right-v2">{formatCurrency(pension.deposits)}</td>
                  <td className="text-right-v2 value-highlight-v2">
                    {formatCurrency(pension.currentValue)}
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
                </tr>
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
    </div>
  );
}
