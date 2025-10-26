import dayjs from "dayjs";
import "./AccountsTableStyles.css";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { parseNumber } from "./utils/parseNumber";
dayjs.extend(customParseFormat);

export default function AccountsTable({
  uploads,
  selectedAccounts,
  onToggle,
  onRemove,
}) {
  const formatCurrency = (value) => {
    if (!value || value === 0) return "-";
    return `£${Math.round(Number(value)).toLocaleString()}`;
  };

  const formatDate = (dateStr, dateFormat) => {
    if (!dateStr) return "-";
    return dayjs(dateStr, dateFormat, true).format("DD/MM/YY");
  };

  return (
    <div className="accounts-wrapper dark-mode">
      <h3 className="accounts-title">Savings Accounts</h3>
      <div className="table-scroll-container">
        <table className="accounts-table">
          <thead>
            <tr>
              <th className="col-bank">Bank</th>
              <th>Account</th>
              <th className="col-type">Type</th>
              <th className="text-right col-start">Start</th>
              <th className="text-right col-start-value">Start Value</th>
              <th className="text-right">Current Value</th>
              <th className="icon-col" />
            </tr>
          </thead>
          <tbody>
            {uploads.map((upload, idx) => {
              const {
                rawData,
                mapping,
                dateFormat,
                accountName,
                bank,
                accountType,
              } = upload;

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

              // Check if we have any valid data
              if (sorted.length === 0) {
                console.warn(`No valid data for account: ${accountName}`);
                return (
                  <tr
                    key={idx}
                    className="account-row"
                    onClick={() => onToggle(accountName)}
                  >
                    <td className="col-bank" title={bank}>
                      {bank}
                    </td>
                    <td title={accountName}>{accountName}</td>
                    <td className="col-type">
                      {accountType ? (
                        <span
                          className={`table-type-badge ${accountType
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {accountType}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="text-right col-start">-</td>
                    <td className="text-right col-start-value">-</td>
                    <td className="text-right">-</td>
                    <td className="text-center remove-button-cell">
                      <button
                        className="remove-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(accountName);
                        }}
                        aria-label={`Remove ${accountName}`}
                        title="Remove"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              }

              const startRow = sorted[0];
              const endRow = sorted[sorted.length - 1];
              const isSelected = selectedAccounts.includes(accountName);

              // Get balance values with fallback
              const startBalance = mapping.balance
                ? parseNumber(startRow[mapping.balance])
                : 0;
              const endBalance = mapping.balance
                ? parseNumber(endRow[mapping.balance])
                : 0;

              return (
                <tr
                  key={idx}
                  className={`account-row ${!isSelected ? "deselected" : ""}`}
                  onClick={() => onToggle(accountName)}
                >
                  <td className="col-bank" title={bank}>
                    {bank}
                  </td>
                  <td title={accountName}>{accountName}</td>
                  <td className="col-type">
                    {accountType ? (
                      <span
                        className={`table-type-badge ${accountType
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {accountType}
                      </span>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="text-right col-start">
                    {formatDate(startRow[mapping.date], dateFormat)}
                  </td>
                  <td className="text-right col-start-value">
                    {formatCurrency(startBalance)}
                  </td>
                  <td className="text-right">{formatCurrency(endBalance)}</td>
                  <td className="text-center remove-button-cell">
                    <button
                      className="remove-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(accountName);
                      }}
                      aria-label={`Remove ${accountName}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
