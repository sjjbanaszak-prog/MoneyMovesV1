import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { FiDownload } from "react-icons/fi";
import { formatCurrency } from "../utils/mortgageUtils";
import "./MortgageScheduleStyles.css";

export default function MortgageSchedule({
  amortizationNoOverpay,
  amortizationWithOverpay,
  oneOffOverpayment,
  oneOffOverpaymentType,
  oneOffMonth,
}) {
  const [scheduleView, setScheduleView] = useState("Annual");

  if (!amortizationNoOverpay || !amortizationWithOverpay) return null;

  const oneOffMonthIndex = oneOffMonth ? oneOffMonth - 1 : null;

  const scheduleRows =
    scheduleView === "Monthly"
      ? amortizationNoOverpay.map((entry, idx) => ({
          ...entry,
          idx,
          label: entry.month,
        }))
      : Array.from(
          { length: Math.ceil(amortizationNoOverpay.length / 12) },
          (_, i) => {
            const start = i * 12;
            const end = start + 12;
            const chunk = amortizationNoOverpay.slice(start, end);
            const principalPaid = chunk.reduce(
              (sum, r) => sum + r.principal,
              0
            );
            const interestPaid = chunk.reduce((sum, r) => sum + r.interest, 0);

            return {
              idx: end - 1,
              month: end,
              label: `${i + 1}`,
              balance: amortizationNoOverpay[end - 1]?.balance || 0,
              principalPaid,
              interestPaid,
            };
          }
        );

  const downloadCSV = () => {
    const header = [
      scheduleView === "Monthly" ? "Month" : "Year",
      "Balance (No Overpay)",
      "Balance (Overpay)",
      "Principal Paid",
      "Interest Paid",
    ];

    const rows = scheduleRows.map(
      ({ label, idx, principalPaid, interestPaid }) => {
        const balanceNoOverpay = amortizationNoOverpay[idx]?.balance || 0;
        const balanceOverpay = amortizationWithOverpay[idx]?.balance || 0;

        return [
          label,
          balanceNoOverpay.toFixed(2),
          balanceOverpay.toFixed(2),
          (principalPaid || 0).toFixed(2),
          (interestPaid || 0).toFixed(2),
        ];
      }
    );

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Local time format: ddmmyyyyhhmmss
    const now = new Date();
    const pad = (num) => String(num).padStart(2, "0");
    const dd = pad(now.getDate());
    const mm = pad(now.getMonth() + 1);
    const yyyy = now.getFullYear();
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    const filename = `Mortgage_Schedule_${scheduleView} - ${dd}${mm}${yyyy}${hh}${min}${ss}.csv`;
    a.download = filename;

    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="schedule-wrapper dark-mode">
      <div className="schedule-header">
        <h3 className="schedule-title">Payment Schedule</h3>

        <div className="schedule-controls">
          <div className="pill-toggle">
            <button
              className={scheduleView === "Monthly" ? "active" : ""}
              onClick={() => setScheduleView("Monthly")}
            >
              Monthly
            </button>
            <button
              className={scheduleView === "Annual" ? "active" : ""}
              onClick={() => setScheduleView("Annual")}
            >
              Annual
            </button>
          </div>
          <button
            className="download-button"
            onClick={downloadCSV}
            title="Download CSV"
          >
            <FiDownload size={16} />
          </button>
        </div>
      </div>

      <table className="schedule-table">
        <thead>
          <tr>
            <th>{scheduleView === "Monthly" ? "Month" : "Year"}</th>
            <th className="text-right">Balance (Without O/P)</th>
            <th className="text-right">Balance (With O/P)</th>
            <th className="text-right">Principal Paid</th>
            <th className="text-right">Interest Paid</th>
          </tr>
        </thead>
        <tbody>
          {scheduleRows.map(
            ({ label, balance, idx, principalPaid, interestPaid }) => {
              const isOneOff = oneOffOverpayment && idx === oneOffMonthIndex;
              const balanceOverpay = amortizationWithOverpay[idx]?.balance || 0;

              const tooltip = isOneOff
                ? (() => {
                    const baseBalance =
                      amortizationWithOverpay[oneOffMonthIndex]?.balance || 0;
                    const value =
                      oneOffOverpaymentType === "%"
                        ? (oneOffOverpayment / 100) * baseBalance
                        : oneOffOverpayment;
                    return `One-off Overpayment: ${formatCurrency(value)}`;
                  })()
                : undefined;

              return (
                <tr
                  key={label}
                  className={`schedule-row ${isOneOff ? "highlight-row" : ""}`}
                  title={tooltip}
                >
                  <td>{label}</td>
                  <td className="text-right">{formatCurrency(balance)}</td>
                  <td className="text-right">
                    {formatCurrency(balanceOverpay)}
                  </td>
                  <td className="text-right">
                    {formatCurrency(principalPaid)}
                  </td>
                  <td className="text-right">{formatCurrency(interestPaid)}</td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>

      <div className="schedule-chart">
        <div className="schedule-header">
          <h3 className="schedule-title">Payment Types</h3>
        </div>

        <div className="schedule-legend-wrapper">
          <div className="schedule-legend">
            <span className="dot with-overpay" />
            Principal
          </div>
          <div className="schedule-legend">
            <span className="dot no-overpay" />
            Interest
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={scheduleRows}
            margin={{ top: 10, right: 0, left: -15, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              stroke="#9ca3af"
              axisLine={{ stroke: "#333" }}
              tickLine={false}
              minTickGap={10}
            />
            <YAxis
              tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`}
              stroke="#9ca3af"
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;

                return (
                  <div
                    style={{
                      backgroundColor: "#1e1e1e",
                      border: "1px solid #333",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#fff",
                      fontSize: 12,
                      minWidth: 150,
                    }}
                  >
                    <p style={{ marginBottom: 6, color: "#ccc" }}>{label}</p>
                    {payload.map((entry, i) => (
                      <p
                        key={i}
                        style={{ color: entry.color, margin: "4px 0" }}
                      >
                        <strong>{entry.name}:</strong>{" "}
                        {formatCurrency(entry.value)}
                      </p>
                    ))}
                  </div>
                );
              }}
            />

            <Bar
              dataKey="principalPaid"
              stackId="a"
              fill="#10b981"
              name="Principal Paid"
            />
            <Bar
              dataKey="interestPaid"
              stackId="a"
              fill="#60a5fa"
              name="Interest Paid"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
