import React, { useState, useEffect, useRef, useMemo } from "react";
import "./MortgageCalcStyles.css";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { doc, getDoc, setDoc, getFirestore } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthProvider";
import debounce from "lodash.debounce";

function App() {
  const [balance, setBalance] = useState(260899);
  const [termYears, settermYears] = useState(20);
  const [termMonths, settermMonths] = useState(0);
  const [currentTermYears, setCurrentTermYears] = useState(2);
  const [currentTermMonths, setCurrentTermMonths] = useState(0);
  const [currentRate, setCurrentRate] = useState(4.6);
  const [expiryRate, setExpiryRate] = useState(8.09);
  const [overpaymentAmount, setOverpaymentAmount] = useState(200);
  const [overpaymentFrequency, setOverpaymentFrequency] = useState("Monthly");
  const [savingsRate, setSavingsRate] = useState(4.09);

  const [currentType, setCurrentType] = useState("fixed");
  const [expiryType, setExpiryType] = useState("variable");

  const [oneOffOverpayment, setOneOffOverpayment] = useState(false);
  const [oneOffOverpaymentType, setOneOffOverpaymentType] = useState("£");
  const [oneOffOverpaymentAmount, setOneOffOverpaymentAmount] = useState(0);
  const [oneOffOverpaymentYear, setOneOffOverpaymentYear] = useState(0);
  const [oneOffOverpaymentMonth, setOneOffOverpaymentMonth] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      const loadUserScenario = async () => {
        const docRef = doc(db, "MortgageCalcs", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBalance(data.balance);
          settermYears(data.termYears);
          settermMonths(data.termMonths);
          setCurrentTermYears(data.currentTermYears);
          setCurrentTermMonths(data.currentTermMonths);
          setCurrentRate(data.currentRate);
          setExpiryRate(data.expiryRate);
          setOverpaymentAmount(data.overpaymentAmount);
          setOverpaymentFrequency(data.overpaymentFrequency);
          setSavingsRate(data.savingsRate);
          setCurrentType(data.currentType);
          setExpiryType(data.expiryType);
          setOneOffOverpayment(data.oneOffOverpayment);
          setOneOffOverpaymentType(data.oneOffOverpaymentType);
          setOneOffOverpaymentAmount(data.oneOffOverpaymentAmount);
          setOneOffOverpaymentYear(data.oneOffOverpaymentYear);
          setOneOffOverpaymentMonth(data.oneOffOverpaymentMonth);
        }
      };

      loadUserScenario();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const saveScenario = debounce(() => {
      const docRef = doc(db, "MortgageCalcs", user.uid);
      setDoc(docRef, {
        balance,
        termYears,
        termMonths,
        currentTermYears,
        currentTermMonths,
        currentRate,
        expiryRate,
        overpaymentAmount,
        overpaymentFrequency,
        savingsRate,
        currentType,
        expiryType,
        oneOffOverpayment,
        oneOffOverpaymentType,
        oneOffOverpaymentAmount,
        oneOffOverpaymentYear,
        oneOffOverpaymentMonth,
      });
    }, 1000); // Debounce delay in ms

    saveScenario();

    return () => saveScenario.cancel();
  }, [
    user?.uid,
    balance,
    termYears,
    termMonths,
    currentTermYears,
    currentTermMonths,
    currentRate,
    expiryRate,
    overpaymentAmount,
    overpaymentFrequency,
    savingsRate,
    currentType,
    expiryType,
    oneOffOverpayment,
    oneOffOverpaymentType,
    oneOffOverpaymentAmount,
    oneOffOverpaymentYear,
    oneOffOverpaymentMonth,
  ]);

  const [results, setResults] = useState({
    amortizationNoOverpay: [],
    amortizationWithOverpay: [],
    interestSaved: 0,
    timeSaved: "",
    totalPaidNoOverpay: 0,
    totalPaidWithOverpay: 0,
    savingsInterestPotential: 0,
    recommendation: "",
  });

  const [scheduleView, setScheduleView] = useState("Annual");

  const totalTermMonths = termYears * 12 + termMonths;
  const currentTerm = currentTermYears * 12 + currentTermMonths;
  const expiryTerm = totalTermMonths - currentTerm;

  const oneOffMonthIndex = oneOffOverpaymentYear * 12 + oneOffOverpaymentMonth;

  const monthlyPayment = calculatePayment(
    balance,
    currentRate,
    totalTermMonths
  );
  const expiryPayment = calculatePayment(balance, expiryRate, expiryTerm);

  function calculatePayment(balance, rate, termMonths) {
    const monthlyRate = rate / 100 / 12;
    return (
      (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))
    );
  }

  const formatCurrency = (val) =>
    val.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

  const getMonthlyRate = (rate) => rate / 100 / 12;

  const calculateAmortization = (
    balance,
    monthlyRate,
    termMonths,
    overpayment = 0,
    oneOffOverpay = {}
  ) => {
    const amortization = [];
    let remaining = balance;
    let totalInterest = 0;
    let month = 0;

    const baseMonthlyPayment =
      (monthlyRate * balance) / (1 - Math.pow(1 + monthlyRate, -termMonths));
    const monthlyPayment = baseMonthlyPayment + overpayment;

    // Convert one-off month/year to index
    const oneOffMonthIndex =
      (oneOffOverpay.year ? oneOffOverpay.year * 12 : 0) +
      (oneOffOverpay.month ? oneOffOverpay.month : 0);

    while (remaining > 0 && month < 1000) {
      const interest = remaining * monthlyRate;
      const principal = Math.min(monthlyPayment - interest, remaining);

      remaining -= principal;

      // One-off overpayment
      if (oneOffOverpayment && month + 1 === oneOffMonthIndex) {
        const oneOffAmount =
          oneOffOverpay.type === "%"
            ? (remaining * oneOffOverpay.amount) / 100
            : oneOffOverpay.amount;

        remaining = Math.max(remaining - oneOffAmount, 0);
      }

      totalInterest += interest;

      amortization.push({
        month: month + 1,
        balance: Math.max(remaining, 0),
        payment: monthlyPayment,
        interest,
        principal,
      });

      month++;
    }

    return { amortization, totalInterest };
  };

  const formatTick = (tick) => {
    return `£${tick / 1000}k`;
  };

  const calculate = () => {
    const totalMonths = termYears * 12 + termMonths;
    const currentTermTotalMonths = currentTermYears * 12 + currentTermMonths;
    const expiryTermMonths = totalMonths - currentTermTotalMonths;

    const currentMonthlyRate = getMonthlyRate(currentRate);
    const expiryMonthlyRate = getMonthlyRate(expiryRate);

    // No overpayment scenario
    const { amortization: amort1, totalInterest: interest1 } =
      calculateAmortization(balance, currentMonthlyRate, totalMonths);

    // With overpayment scenario
    const overFreq = { Weekly: 52, Monthly: 12, Annually: 1 }[
      overpaymentFrequency
    ];
    const overpaymentMonthly = (overpaymentAmount * overFreq) / 12;

    const { amortization: amort2, totalInterest: interest2 } =
      calculateAmortization(
        balance,
        currentMonthlyRate,
        totalMonths,
        overpaymentMonthly,
        {
          amount: oneOffOverpaymentAmount,
          type: oneOffOverpaymentType,
          year: oneOffOverpaymentYear,
          month: oneOffOverpaymentMonth,
        }
      );

    const timeSavedMonths = amort1.length - amort2.length;
    const savingsPotential = Array.from({ length: amort2.length }, (_, i) => {
      const monthly = overpaymentAmount * (overFreq / 12);
      return (
        monthly * Math.pow(1 + getMonthlyRate(savingsRate), amort2.length - i)
      );
    }).reduce((a, b) => a + b, 0);

    // Get the month index where overpayment mortgage ends
    const overpayEndMonthIndex = amort2.length - 1;

    // Get remaining mortgage balance from no-overpay schedule at that point
    const remainingBalanceAtOverpayEnd =
      amort1[overpayEndMonthIndex]?.balance ?? 0;

    const remainbalance = remainingBalanceAtOverpayEnd - savingsPotential;
    const savingsbenefit = savingsPotential - remainingBalanceAtOverpayEnd;

    let recommendationText = "";

    if (savingsPotential > remainingBalanceAtOverpayEnd) {
      recommendationText = `You would save more by investing the money in savings, which would grow to ${formatCurrency(
        savingsPotential
      )} — more than the remaining mortgage balance of ${formatCurrency(
        remainingBalanceAtOverpayEnd
      )} at the same time. A net gain of ${formatCurrency(savingsbenefit)}`;
    } else {
      recommendationText = `You would save more by overpaying your mortgage, since you'd avoid repaying a remaining balance of ${formatCurrency(
        remainingBalanceAtOverpayEnd
      )} - which is more than the savings potential of ${formatCurrency(
        savingsPotential
      )}. A net gain of ${formatCurrency(remainbalance)}`;
    }

    // Merge amortizations for full chart coverage
    const maxLength = Math.max(amort1.length, amort2.length);
    const mergedAmortization = Array.from({ length: maxLength }, (_, i) => ({
      month: i + 1,
      balanceNoOverpay: amort1[i]?.balance ?? null,
      balanceWithOverpay: amort2[i]?.balance ?? null,
    }));

    setResults({
      amortizationNoOverpay: amort1,
      amortizationWithOverpay: amort2,
      interestSaved: interest1 - interest2,
      timeSaved: `${Math.floor(timeSavedMonths / 12)} years and ${
        timeSavedMonths % 12
      } months`,
      totalPaidNoOverpay: balance + interest1,
      totalPaidWithOverpay: balance + interest2,
      savingsInterestPotential: savingsPotential,
      recommendation: recommendationText,
      mergedChartData: mergedAmortization,
      monthlyPayment,
      expiryPayment,
    });
  };

  useEffect(() => {
    calculate();
  }, [
    balance,
    termYears,
    termMonths,
    currentRate,
    currentTermYears,
    currentTermMonths,
    expiryRate,
    overpaymentAmount,
    overpaymentFrequency,
    savingsRate,
    oneOffOverpayment,
    oneOffOverpaymentType,
    oneOffOverpaymentAmount,
    oneOffOverpaymentYear,
    oneOffOverpaymentMonth,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    const setters = {
      balance: setBalance,
      termYears: settermYears,
      termMonths: settermMonths,
      currentRate: setCurrentRate,
      currentTermYears: setCurrentTermYears,
      currentTermMonths: setCurrentTermMonths,
      expiryRate: setExpiryRate,
      overpaymentAmount: setOverpaymentAmount,
      overpaymentFrequency: setOverpaymentFrequency,
      savingsRate: setSavingsRate,
      oneOffOverpayment: setOneOffOverpayment,
      oneOffOverpaymentType: setOneOffOverpaymentType,
      oneOffOverpaymentAmount: setOneOffOverpaymentAmount,
      oneOffOverpaymentYear: setOneOffOverpaymentYear,
      oneOffOverpaymentMonth: setOneOffOverpaymentMonth,
    };

    if (setters[name]) {
      const numeric =
        name.includes("Rate") ||
        name.includes("Amount") ||
        name.includes("Years") ||
        name.includes("Months") ||
        name === "balance";
      setters[name](numeric ? Number(value) : value);
    }
  };

  const {
    amortizationNoOverpay,
    amortizationWithOverpay,
    interestSaved,
    timeSaved,
    totalPaidNoOverpay,
    totalPaidWithOverpay,
    savingsInterestPotential,
    recommendation,
    mergedChartData,
  } = results;

  return (
    <div className="card">
      <h1>Mortgage Calculator</h1>
      <div className="section">
        <h2>Mortgage Details</h2>
        <label>
          Full Mortgage Balance (£)
          <input
            name="balance"
            type="number"
            value={balance}
            onChange={handleChange}
          />
        </label>
        <label>
          Full Mortgage Term
          <div className="section">
            <input
              name="termYears"
              type="number"
              value={termYears}
              onChange={handleChange}
            />

            <span>Years</span>
            <input
              name="termMonths"
              type="number"
              value={termMonths}
              onChange={handleChange}
            />
            <span>Months</span>
          </div>
        </label>
        <label>
          Starting Mortgage Type
          <select
            name="currentType"
            value={currentType}
            onChange={handleChange}
          >
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
        </label>
        <label>
          Starting Term
          <div className="split-inputs">
            <input
              name="currentTermYears"
              type="number"
              value={currentTermYears}
              onChange={handleChange}
            />
            <span>Years</span>
            <input
              name="currentTermMonths"
              type="number"
              value={currentTermMonths}
              onChange={handleChange}
            />
            <span>Months</span>
          </div>
        </label>
        <label>
          Starting Interest Rate (%)
          <input
            name="currentRate"
            type="number"
            step="0.01"
            value={currentRate}
            onChange={handleChange}
          />
        </label>
        <label>
          Mortgage Type at Expiry
          <select name="expiryType" value={expiryType} onChange={handleChange}>
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
        </label>
        <label>
          Interest Rate at Expiry (%)
          <input
            name="expiryRate"
            type="number"
            step="0.01"
            value={expiryRate}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="section">
        <h2>Overpayment Options</h2>
        <label>
          Overpayment Frequency
          <select
            name="overpaymentFrequency"
            value={overpaymentFrequency}
            onChange={handleChange}
          >
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Annual</option>
          </select>
        </label>
        <label>
          Overpayment Amount (£)
          <input
            name="overpaymentAmount"
            type="number"
            value={overpaymentAmount}
            onChange={handleChange}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={oneOffOverpayment}
            onChange={(e) => setOneOffOverpayment(e.target.checked)}
          />
          One-off Overpayment
        </label>

        {oneOffOverpayment && (
          <div className="section nested">
            <label>
              Input Type
              <select
                name="oneOffOverpaymentType"
                value={oneOffOverpaymentType}
                onChange={handleChange}
              >
                <option value="£">£</option>
                <option value="%">%</option>
              </select>
            </label>

            <label>
              One-off Overpayment Value
              <input
                name="oneOffOverpaymentAmount"
                type="number"
                value={oneOffOverpaymentAmount}
                onChange={handleChange}
              />
            </label>

            <label>
              Overpayment Period
              <div className="split-inputs">
                <input
                  name="oneOffOverpaymentYear"
                  type="number"
                  min="0"
                  value={oneOffOverpaymentYear}
                  onChange={handleChange}
                />
                <span>Year</span>
                <input
                  name="oneOffOverpaymentMonth"
                  type="number"
                  min="1"
                  max="12"
                  value={oneOffOverpaymentMonth}
                  onChange={handleChange}
                />
                <span>Month</span>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="summary">
        <h2>Summary</h2>
        <p>
          <strong>Current Repayments:</strong> £{monthlyPayment?.toFixed(2)}
        </p>
        <p>
          <strong>Future Repayments:</strong> £{expiryPayment?.toFixed(2)}
        </p>
        {oneOffOverpayment && (
          <p>
            <strong>One-off Overpayment:</strong>{" "}
            {oneOffOverpaymentType === "%" ? (
              <>
                {oneOffOverpaymentAmount}% of balance (
                {formatCurrency(
                  (oneOffOverpaymentAmount / 100) *
                    (amortizationWithOverpay[oneOffMonthIndex - 1]?.balance ||
                      0) || 0
                )}
                )
              </>
            ) : (
              formatCurrency(oneOffOverpaymentAmount)
            )}
          </p>
        )}

        <p>
          <strong>Interest Saved:</strong> {formatCurrency(interestSaved)}
        </p>
        <p>
          <strong>Time Saved:</strong> {timeSaved}
        </p>
        <p>
          <strong>Total - No Overpayments:</strong>{" "}
          {formatCurrency(totalPaidNoOverpay)}
        </p>
        <p>
          <strong>Total - With Overpayments:</strong>{" "}
          {formatCurrency(totalPaidWithOverpay)}
        </p>
      </div>

      <div className="section">
        <h2>Savings Comparison</h2>
        <label>
          Assumed Savings Interest Rate (%)
          <input
            name="savingsRate"
            type="number"
            value={savingsRate}
            onChange={handleChange}
          />
        </label>
        <p>
          <strong>Savings Potential:</strong>{" "}
          {formatCurrency(savingsInterestPotential)}
        </p>
        <p>
          <strong>Recommendation:</strong> {recommendation}
        </p>
      </div>

      <div className="section chart">
        <h2>Mortgage Balance Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={mergedChartData}>
            <defs>
              <linearGradient id="noOverpay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="withOverpay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tickFormatter={(month) => `Year ${Math.ceil(month / 12)}`}
            />
            <YAxis tickFormatter={formatTick} />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;

                const isOverpaymentMonth =
                  oneOffOverpayment && label === oneOffMonthIndex;

                let overpaymentValue = 0;
                if (isOverpaymentMonth) {
                  if (oneOffOverpaymentType === "%") {
                    const balanceAtThatMonth =
                      amortizationWithOverpay[oneOffMonthIndex - 1]?.balance ||
                      0;
                    overpaymentValue =
                      (oneOffOverpaymentAmount / 100) * balanceAtThatMonth;
                  } else {
                    overpaymentValue = oneOffOverpaymentAmount;
                  }
                }

                return (
                  <div
                    className="custom-tooltip"
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      padding: "10px",
                    }}
                  >
                    <p>
                      <strong>Month {label}</strong>
                    </p>
                    {payload.map((entry, i) => (
                      <p key={i} style={{ color: entry.color, margin: 0 }}>
                        {entry.name}: {formatCurrency(entry.value)}
                      </p>
                    ))}
                    {isOverpaymentMonth && (
                      <p style={{ color: "red", marginTop: 5 }}>
                        One-off Overpayment: {formatCurrency(overpaymentValue)}
                      </p>
                    )}
                  </div>
                );
              }}
            />

            <Legend />
            {oneOffOverpayment && (
              <ReferenceLine
                x={oneOffMonthIndex}
                stroke="red"
                // label={{
                //  position: "middle",
                //  value: "One-off Payment",
                //  fill: "red",
                //  fontSize: 12,
                // }}
                strokeDasharray="3 3"
              />
            )}

            <Area
              type="monotone"
              dataKey="balanceWithOverpay"
              stroke="#82ca9d"
              fillOpacity={1}
              fill="url(#withOverpay)"
              name="With Overpayments"
            />
            <Area
              type="monotone"
              dataKey="balanceNoOverpay"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#noOverpay)"
              name="No Overpayments"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="breakdown">
        <h2>Payment Schedule</h2>
        <label>
          View Mode:
          <select
            value={scheduleView}
            onChange={(e) => setScheduleView(e.target.value)}
          >
            <option value="Annual">Annual</option>
            <option value="Monthly">Monthly</option>
          </select>
        </label>

        <table>
          <thead>
            <tr>
              <th>{scheduleView === "Monthly" ? "Month" : "Year"}</th>
              <th>Balance (No Overpay)</th>
              <th>Balance (Overpay)</th>
            </tr>
          </thead>

          <tbody>
            {(scheduleView === "Monthly"
              ? amortizationNoOverpay.map((entry, idx) => ({
                  ...entry,
                  idx,
                }))
              : amortizationNoOverpay
                  .filter((_, idx) => (idx + 1) % 12 === 0)
                  .map((entry, idx) => ({
                    ...entry,
                    idx: (idx + 1) * 12 - 1,
                  }))
            ).map(({ month, balance, idx }) => (
              <tr
                key={month}
                style={
                  oneOffOverpayment && idx + 1 === oneOffMonthIndex
                    ? { backgroundColor: "#82ca9d", cursor: "help" }
                    : {}
                }
                title={
                  oneOffOverpayment && idx + 1 === oneOffMonthIndex
                    ? (() => {
                        const balance =
                          amortizationWithOverpay[oneOffMonthIndex - 1]
                            ?.balance || 0;
                        const value =
                          oneOffOverpaymentType === "%"
                            ? (oneOffOverpaymentAmount / 100) * balance
                            : oneOffOverpaymentAmount;
                        return `One-off Overpayment: ${formatCurrency(value)}`;
                      })()
                    : undefined
                }
              >
                <td>
                  {scheduleView === "Monthly" ? month : Math.ceil(month / 12)}
                </td>
                <td>{formatCurrency(balance)}</td>
                <td>
                  {formatCurrency(amortizationWithOverpay[idx]?.balance || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
