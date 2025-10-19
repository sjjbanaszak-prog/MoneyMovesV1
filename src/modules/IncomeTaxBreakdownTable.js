import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PERIOD_DIVISORS = { Daily: 260, Weekly: 52, Monthly: 12, Annually: 1 };

function calculateTaperedPersonalAllowance(grossIncome, baseAllowance = 12570) {
  if (grossIncome <= 100000) return baseAllowance;
  const excess = grossIncome - 100000;
  const reduction = Math.floor(excess / 2);
  const adjustedAllowance = baseAllowance - reduction;
  return adjustedAllowance > 0 ? adjustedAllowance : 0;
}

function calculateIncomeTaxBreakdown(grossIncome, personalAllowance) {
  const standardPA = 12570;
  const basicRateEnd = 50270;
  const higherRateEnd = 125140;

  const basicRateTax =
    Math.min(Math.max(0, grossIncome - standardPA), basicRateEnd - standardPA) *
    0.2;
  let higherRateTax =
    grossIncome > basicRateEnd
      ? Math.min(grossIncome - basicRateEnd, higherRateEnd - basicRateEnd) * 0.4
      : 0;
  let additionalRateTax =
    grossIncome > higherRateEnd ? (grossIncome - higherRateEnd) * 0.45 : 0;

  const lostPA = Math.max(0, standardPA - personalAllowance);
  if (lostPA > 0) {
    if (grossIncome > basicRateEnd) {
      higherRateTax += lostPA * 0.4;
    } else {
      return {
        totalTax:
          basicRateTax + lostPA * 0.2 + higherRateTax + additionalRateTax,
        breakdown: [
          { label: "Basic (20%)", taxPaid: basicRateTax + lostPA * 0.2 },
          { label: "Higher (40%)", taxPaid: higherRateTax },
          { label: "Additional (45%)", taxPaid: additionalRateTax },
        ],
      };
    }
  }

  return {
    totalTax: basicRateTax + higherRateTax + additionalRateTax,
    breakdown: [
      { label: "Basic (20%)", taxPaid: basicRateTax },
      { label: "Higher (40%)", taxPaid: higherRateTax },
      { label: "Additional (45%)", taxPaid: additionalRateTax },
    ],
  };
}

function calculateNIC(taxableIncome) {
  if (taxableIncome <= 12570) return 0;
  return taxableIncome <= 50270
    ? (taxableIncome - 12570) * 0.08
    : (50270 - 12570) * 0.08 + (taxableIncome - 50270) * 0.02;
}

function TakeHomeComparisonChart({
  viewBy,
  currentNetPay,
  futureNetPay,
  currentPension,
  futurePension,
  currentNI,
  futureNI,
  currentIncomeTax,
  futureIncomeTax,
}) {
  const data = [
    {
      name: "Current",
      "Net Pay": Math.round(currentNetPay),
      Pension: Math.round(currentPension),
      NI: Math.round(currentNI),
      "Income Tax": Math.round(currentIncomeTax),
      total: Math.round(
        currentNetPay + currentPension + currentNI + currentIncomeTax
      ),
    },
    {
      name: "Future",
      "Net Pay": Math.round(futureNetPay),
      Pension: Math.round(futurePension),
      NI: Math.round(futureNI),
      "Income Tax": Math.round(futureIncomeTax),
      total: Math.round(
        futureNetPay + futurePension + futureNI + futureIncomeTax
      ),
    },
  ];
  return (
    <>
      <h3
        style={{
          color: "#f9fafb",
          marginTop: "2rem",
          marginBottom: "0.75rem",
          fontSize: "1.125rem",
        }}
      >
        Income Tax Breakdown Comparison ({viewBy})
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 30, left: 5, bottom: 10 }}
        >
          <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
          <XAxis
            type="number"
            stroke="#9ca3af"
            tickFormatter={(v) => `£${v.toFixed(0)}`}
            tick={{ fill: "#f3f4f6", fontSize: 14 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            tick={{ fill: "#f3f4f6", fontSize: 14, fontWeight: 600 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e1e",
              border: "1px solid #333",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
            }}
            formatter={(value, name, props) => [
              `£${value.toFixed(2)} (${(
                (value / props.payload.total) *
                100
              ).toFixed(1)}%)`,
              name,
            ]}
          />
          <Bar dataKey="Net Pay" stackId="a" fill="#10b981" fillOpacity={0.5} />
          <Bar dataKey="Pension" stackId="a" fill="#3b82f6" fillOpacity={0.5} />
          <Bar dataKey="NI" stackId="b" fill="#f97316" fillOpacity={0.5} />
          <Bar
            dataKey="Income Tax"
            stackId="b"
            fill="#ef4444"
            fillOpacity={0.5}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

export default function IncomeTaxBreakdownTable({
  totalSalary = 134675,
  personalAllowance = 12570,
  currentMonthly = 0,
  futureMonthly = 3871.91,
  employerMonthly = 0,
  employerMatchEnabled = false,
  taxPeriod = "Monthly",
}) {
  const [viewBy, setViewBy] = useState(taxPeriod);
  const [incomeTaxExpanded, setIncomeTaxExpanded] = useState(false);
  useEffect(() => {
    if (taxPeriod && taxPeriod !== viewBy) setViewBy(taxPeriod);
  }, [taxPeriod]);

  const grossIncomeAnnual = totalSalary;
  const currentPensionAnnual = currentMonthly * 12;
  const futurePensionAnnual = futureMonthly * 12;
  const employerAnnual = employerMonthly * 12;
  const currentIncomeAfterSacrifice = grossIncomeAnnual - currentPensionAnnual;
  const futureIncomeAfterSacrifice = grossIncomeAnnual - futurePensionAnnual;
  const taperedAllowanceCurrent = calculateTaperedPersonalAllowance(
    currentIncomeAfterSacrifice,
    personalAllowance
  );
  const taperedAllowanceFuture = calculateTaperedPersonalAllowance(
    futureIncomeAfterSacrifice,
    personalAllowance
  );
  const { totalTax: incomeTaxCurrent, breakdown: incomeTaxBreakdownCurrent } =
    calculateIncomeTaxBreakdown(
      currentIncomeAfterSacrifice,
      taperedAllowanceCurrent
    );
  const { totalTax: incomeTaxFuture, breakdown: incomeTaxBreakdownFuture } =
    calculateIncomeTaxBreakdown(
      futureIncomeAfterSacrifice,
      taperedAllowanceFuture
    );
  const nationalInsuranceCurrent = calculateNIC(currentIncomeAfterSacrifice);
  const nationalInsuranceFuture = calculateNIC(futureIncomeAfterSacrifice);
  const divisor = PERIOD_DIVISORS[viewBy] || 12;
  const roundRowValue = (val) => Math.round(val / divisor);
  const getRow = (label, current, future) => ({
    label,
    current: roundRowValue(current),
    future: roundRowValue(future),
    change: roundRowValue(future - current),
  });
  const currentTaxableIncome = Math.max(
    0,
    currentIncomeAfterSacrifice - taperedAllowanceCurrent
  );
  const futureTaxableIncome = Math.max(
    0,
    futureIncomeAfterSacrifice - taperedAllowanceFuture
  );

  const rows = [
    getRow("Gross Income", grossIncomeAnnual, grossIncomeAnnual),
    getRow("Pension Contributions", currentPensionAnnual, futurePensionAnnual),
    ...(employerMatchEnabled
      ? [getRow("Employer Pension", employerAnnual, employerAnnual)]
      : []),
    getRow("Taxable Income", currentTaxableIncome, futureTaxableIncome),
    getRow(
      "Personal Allowance",
      taperedAllowanceCurrent,
      taperedAllowanceFuture
    ),
    {
      label: (
        <span
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={() => setIncomeTaxExpanded(!incomeTaxExpanded)}
        >
          Income Tax {incomeTaxExpanded ? "▼" : "▶"}
        </span>
      ),
      current: roundRowValue(incomeTaxCurrent),
      future: roundRowValue(incomeTaxFuture),
      change: roundRowValue(incomeTaxFuture - incomeTaxCurrent),
      isIncomeTaxRow: true,
    },
    getRow(
      "National Insurance",
      nationalInsuranceCurrent,
      nationalInsuranceFuture
    ),
    getRow(
      "Net Take Home",
      currentIncomeAfterSacrifice - incomeTaxCurrent - nationalInsuranceCurrent,
      futureIncomeAfterSacrifice - incomeTaxFuture - nationalInsuranceFuture
    ),
  ];

  return (
    <div
      style={{
        backgroundColor: "#111827",
        padding: "24px",
        borderRadius: "16px",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.4)",
        color: "#fff",
        marginTop: "24px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>
          Income Tax Breakdown
        </h3>
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.875rem",
          color: "#e5e7eb",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: "12px 8px",
                textAlign: "left",
                backgroundColor: "#1f2937",
                color: "#9ca3af",
                fontWeight: "500",
                borderBottom: "1px solid #374151",
                borderTop: "1px solid #2c3342",
              }}
            >
              Label
            </th>
            <th
              style={{
                padding: "12px 8px",
                textAlign: "right",
                backgroundColor: "#1f2937",
                color: "#9ca3af",
                fontWeight: "500",
                borderBottom: "1px solid #374151",
                borderTop: "1px solid #2c3342",
              }}
            >
              Current (£)
            </th>
            <th
              style={{
                padding: "12px 8px",
                textAlign: "right",
                backgroundColor: "#1f2937",
                color: "#9ca3af",
                fontWeight: "500",
                borderBottom: "1px solid #374151",
                borderTop: "1px solid #2c3342",
              }}
            >
              Future (£)
            </th>
            <th
              style={{
                padding: "12px 8px",
                textAlign: "right",
                backgroundColor: "#1f2937",
                color: "#9ca3af",
                fontWeight: "500",
                borderBottom: "1px solid #374151",
                borderTop: "1px solid #2c3342",
              }}
            >
              Change (£)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              <tr
                style={
                  r.isIncomeTaxRow
                    ? { fontWeight: "bold", cursor: "pointer" }
                    : {}
                }
                onClick={
                  r.isIncomeTaxRow
                    ? () => setIncomeTaxExpanded(!incomeTaxExpanded)
                    : undefined
                }
              >
                <td
                  style={{
                    padding: "12px 8px",
                    borderTop: "1px solid #2c3342",
                  }}
                >
                  {r.label}
                </td>
                <td
                  style={{
                    padding: "12px 8px",
                    textAlign: "right",
                    borderTop: "1px solid #2c3342",
                  }}
                >
                  £{r.current.toLocaleString()}
                </td>
                <td
                  style={{
                    padding: "12px 8px",
                    textAlign: "right",
                    borderTop: "1px solid #2c3342",
                  }}
                >
                  £{r.future.toLocaleString()}
                </td>
                <td
                  style={{
                    padding: "12px 8px",
                    textAlign: "right",
                    borderTop: "1px solid #2c3342",
                  }}
                >
                  £{r.change.toLocaleString()}
                </td>
              </tr>
              {r.isIncomeTaxRow &&
                incomeTaxExpanded &&
                incomeTaxBreakdownCurrent.map((band, idx) => {
                  const currentVal = Math.round(band.taxPaid / divisor);
                  const futureVal = Math.round(
                    incomeTaxBreakdownFuture[idx].taxPaid / divisor
                  );
                  return (
                    <tr key={`${band.label}-${idx}`}>
                      <td
                        style={{
                          paddingLeft: 28,
                          paddingTop: 12,
                          paddingBottom: 12,
                          borderTop: "1px solid #2c3342",
                          color: "#e5e7eb",
                        }}
                      >
                        {band.label}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "right",
                          borderTop: "1px solid #2c3342",
                          color: "#e5e7eb",
                        }}
                      >
                        £{currentVal.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "right",
                          borderTop: "1px solid #2c3342",
                          color: "#e5e7eb",
                        }}
                      >
                        £{futureVal.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "right",
                          borderTop: "1px solid #2c3342",
                          color: "#e5e7eb",
                        }}
                      >
                        £{(futureVal - currentVal).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          backgroundColor: "#1f2937",
          borderRadius: "9999px",
          padding: "4px",
          marginTop: "16px",
          overflow: "hidden",
        }}
      >
        {["Day", "Week", "Month", "Year"].map((label) => {
          const periodMap = {
            Day: "Daily",
            Week: "Weekly",
            Month: "Monthly",
            Year: "Annually",
          };
          const period = periodMap[label];
          const selected = viewBy === period;
          return (
            <button
              key={label}
              onClick={() => setViewBy(period)}
              style={{
                flex: 1,
                textAlign: "center",
                background: selected ? "#374151" : "transparent",
                color: selected ? "#fff" : "#ccc",
                padding: "8px 0",
                fontSize: "14px",
                fontWeight: "500",
                border: "none",
                borderRadius: "9999px",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) =>
                !selected &&
                ((e.currentTarget.style.backgroundColor = "#1e293b"),
                (e.currentTarget.style.color = "#e5e7eb"))
              }
              onMouseLeave={(e) =>
                !selected &&
                ((e.currentTarget.style.backgroundColor = "transparent"),
                (e.currentTarget.style.color = "#ccc"))
              }
            >
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: "20px" }}>
        <TakeHomeComparisonChart
          viewBy={viewBy}
          currentNetPay={
            (currentIncomeAfterSacrifice -
              incomeTaxCurrent -
              nationalInsuranceCurrent) /
            divisor
          }
          futureNetPay={
            (futureIncomeAfterSacrifice -
              incomeTaxFuture -
              nationalInsuranceFuture) /
            divisor
          }
          currentPension={currentPensionAnnual / divisor}
          futurePension={futurePensionAnnual / divisor}
          currentNI={nationalInsuranceCurrent / divisor}
          futureNI={nationalInsuranceFuture / divisor}
          currentIncomeTax={incomeTaxCurrent / divisor}
          futureIncomeTax={incomeTaxFuture / divisor}
        />
      </div>
    </div>
  );
}
