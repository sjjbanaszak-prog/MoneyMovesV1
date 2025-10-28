import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import NetWorthChart from "../modules/NetWorthChart";
import "../styles/SharedStyles.css";
import "./LandingPage.css";
import { useDemoMode } from "../contexts/DemoModeContext";
import DemoModeBanner from "../components/DemoModeBanner";

console.log("=== LANDINGPAGE.JS FILE LOADED - VERSION 2.0 ===");

const LandingPage = () => {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemoMode();

  const [moduleData, setModuleData] = useState({
    pension: null,
    mortgage: null,
    savings: null,
    tax: null,
  });

  const [pensionPotsData, setPensionPotsData] = useState(null);
  const [savingsData, setSavingsData] = useState(null);
  const [debtsData, setDebtsData] = useState(null);

  console.log("=== LANDINGPAGE COMPONENT RENDERING ===");
  console.log("User object:", user);
  console.log("User UID:", user?.uid);

  useEffect(() => {
    console.log("=== USEEFFECT TRIGGERED ===");

    const loadModuleData = async () => {
      console.log("=== INSIDE loadModuleData FUNCTION ===");
      console.log("User UID check:", user?.uid);

      if (!user?.uid) {
        console.log("NO USER UID - EXITING");
        return;
      }

      console.log("USER UID EXISTS:", user.uid);

      // Demo mode: use demo data
      if (isDemoMode && demoData) {
        console.log("=== LOADING DEMO DATA ===");

        setModuleData({
          pension: demoData.pensionBuilder || null,
          mortgage: null,
          savings: null,
          tax: null,
        });

        // Convert demo pension pots data to the format expected by the component
        if (demoData.pensionPots) {
          const pensionPotsFormatted = {
            pensions: demoData.pensionPots.entries || [],
            selectedPensions: demoData.pensionPots.entries?.map(p => p.provider) || [],
            yearlyTotals: {},
          };

          // Calculate yearly totals from entries
          demoData.pensionPots.entries?.forEach(entry => {
            if (entry.yearlyTotals) {
              Object.keys(entry.yearlyTotals).forEach(year => {
                pensionPotsFormatted.yearlyTotals[year] =
                  (pensionPotsFormatted.yearlyTotals[year] || 0) + entry.yearlyTotals[year];
              });
            }
          });

          setPensionPotsData(pensionPotsFormatted);
        }

        setSavingsData(demoData.savingsTracker || null);

        console.log("DEMO DATA LOADED SUCCESSFULLY");
        return;
      }

      // Live mode: load from Firestore
      console.log("Starting Firebase queries...");

      try {
        console.log("Loading pensionScenarios...");
        const pensionRef = doc(db, "pensionScenarios", user.uid);
        const pensionSnap = await getDoc(pensionRef);
        console.log("pensionScenarios exists:", pensionSnap.exists());

        console.log("Loading pensionPots...");
        const pensionPotsRef = doc(db, "pensionPots", user.uid);
        const pensionPotsSnap = await getDoc(pensionPotsRef);
        console.log("pensionPots exists:", pensionPotsSnap.exists());

        console.log("Loading savingsTracker...");
        const savingsRef = doc(db, "savingsTracker", user.uid);
        const savingsSnap = await getDoc(savingsRef);
        console.log("savingsTracker exists:", savingsSnap.exists());

        console.log("Loading userDebts...");
        const debtsRef = doc(db, "userDebts", user.uid);
        const debtsSnap = await getDoc(debtsRef);
        console.log("userDebts exists:", debtsSnap.exists());

        console.log("=== ALL FIREBASE QUERIES COMPLETE ===");

        if (savingsSnap.exists()) {
          const data = savingsSnap.data();
          console.log("savingsTracker data keys:", Object.keys(data));
          console.log(
            "savingsTracker uploads count:",
            data?.uploads?.length || 0
          );
        }

        if (pensionPotsSnap.exists()) {
          const data = pensionPotsSnap.data();
          console.log("pensionPots data keys:", Object.keys(data));
          console.log(
            "pensionPots pensions count:",
            data?.pensions?.length || 0
          );
        }

        console.log("Setting state...");

        setModuleData({
          pension: pensionSnap.exists() ? pensionSnap.data() : null,
          mortgage: null,
          savings: null,
          tax: null,
        });

        setPensionPotsData(
          pensionPotsSnap.exists() ? pensionPotsSnap.data() : null
        );

        setSavingsData(savingsSnap.exists() ? savingsSnap.data() : null);

        setDebtsData(debtsSnap.exists() ? debtsSnap.data() : null);

        console.log("ALL STATE SET SUCCESSFULLY");
      } catch (error) {
        console.error("ERROR loading module data:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
    };

    loadModuleData();
  }, [user, isDemoMode, demoData]);

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(2)}m`;
    } else if (value >= 1000) {
      return `£${(value / 1000).toFixed(2)}k`;
    } else {
      return `£${Math.round(value).toLocaleString()}`;
    }
  };

  const getDaysUntilTaxYearEnd = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const isAfterApril5 =
      today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6);

    let taxYearEnd;
    if (isAfterApril5) {
      taxYearEnd = new Date(currentYear + 1, 3, 5);
    } else {
      taxYearEnd = new Date(currentYear, 3, 5);
    }

    const diffTime = taxYearEnd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getPensionAllowanceSummary = () => {
    if (!pensionPotsData?.yearlyTotals) {
      return {
        currentYearRemaining: "Not configured",
        availableCarryForward: "Not configured",
        expiringCarryForward: "—",
        daysRemaining: getDaysUntilTaxYearEnd(),
      };
    }

    const yearlyTotals = pensionPotsData.yearlyTotals;

    const today = new Date();
    const currentCalendarYear = today.getFullYear();
    const isAfterApril5 =
      today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6);
    const currentTaxYear = isAfterApril5
      ? currentCalendarYear
      : currentCalendarYear - 1;

    const parseStartYear = (yearStr) => {
      const match = yearStr.match(/^(\d{4})/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const sortedYears = Object.keys(yearlyTotals).sort(
      (a, b) => parseStartYear(a) - parseStartYear(b)
    );

    const processedData = {};
    const carryForwardAvailable = {};
    const carryForwardConsumedFromYear = {};
    const latestYear = Math.max(...sortedYears.map(parseStartYear));

    sortedYears.forEach((yearKey) => {
      const startYear = parseStartYear(yearKey);
      const allowance = startYear >= 2023 ? 60000 : 40000;
      const directContribution = yearlyTotals[yearKey];
      const unusedAllowance = Math.max(0, allowance - directContribution);

      let carryForwardUsed = 0;
      let excessAfterCarryForward = Math.max(0, directContribution - allowance);
      const carryForwardSources = [];

      if (excessAfterCarryForward > 0) {
        const availableYears = sortedYears
          .filter((y) => {
            const yStartYear = parseStartYear(y);
            return (
              yStartYear >= startYear - 3 &&
              yStartYear < startYear &&
              carryForwardAvailable[y] > 0
            );
          })
          .sort((a, b) => parseStartYear(a) - parseStartYear(b));

        let remainingExcess = excessAfterCarryForward;

        availableYears.forEach((cfYear) => {
          if (remainingExcess > 0 && carryForwardAvailable[cfYear] > 0) {
            const cfUsed = Math.min(
              remainingExcess,
              carryForwardAvailable[cfYear]
            );
            carryForwardUsed += cfUsed;
            carryForwardAvailable[cfYear] -= cfUsed;
            remainingExcess -= cfUsed;

            carryForwardSources.push({
              fromYear: cfYear,
              amount: cfUsed,
            });

            if (!carryForwardConsumedFromYear[cfYear]) {
              carryForwardConsumedFromYear[cfYear] = [];
            }
            carryForwardConsumedFromYear[cfYear].push({
              usedByYear: yearKey,
              amount: cfUsed,
            });
          }
        });

        excessAfterCarryForward = remainingExcess;
      }

      carryForwardAvailable[yearKey] = unusedAllowance;
      const isCarryForwardExpired = startYear < latestYear - 3;

      processedData[yearKey] = {
        directContribution,
        carryForwardUsed,
        carryForwardSources,
        allowance,
        unusedCarryForward: unusedAllowance,
        originalUnusedCarryForward: unusedAllowance,
        excessAfterCarryForward,
        totalWithCarryForward: directContribution,
        isExpired: isCarryForwardExpired,
      };
    });

    sortedYears.forEach((yearKey) => {
      const yearData = processedData[yearKey];
      yearData.carryForwardConsumedBy =
        carryForwardConsumedFromYear[yearKey] || [];

      if (yearData.isExpired) {
        const totalConsumed = yearData.carryForwardConsumedBy.reduce(
          (sum, usage) => sum + usage.amount,
          0
        );
        yearData.carryForwardLost = Math.max(
          0,
          yearData.originalUnusedCarryForward - totalConsumed
        );
        yearData.remainingCarryForward = 0;
      } else {
        const totalConsumed = yearData.carryForwardConsumedBy.reduce(
          (sum, usage) => sum + usage.amount,
          0
        );
        yearData.remainingCarryForward = Math.max(
          0,
          yearData.originalUnusedCarryForward - totalConsumed
        );
        yearData.carryForwardLost = 0;
      }
    });

    const currentYearKey = currentTaxYear.toString();
    const currentYearData = processedData[currentYearKey];
    const currentYearRemaining = currentYearData
      ? currentYearData.remainingCarryForward
      : 0;

    let totalRemainingCarryForward = 0;
    let expiringCarryForward = 0;

    sortedYears.forEach((yearKey) => {
      const startYear = parseStartYear(yearKey);
      if (startYear >= currentTaxYear - 3 && startYear < currentTaxYear) {
        const yearData = processedData[yearKey];
        if (yearData && !yearData.isExpired) {
          totalRemainingCarryForward += yearData.remainingCarryForward || 0;

          if (startYear === currentTaxYear - 3) {
            expiringCarryForward += yearData.remainingCarryForward || 0;
          }
        }
      }
    });

    return {
      currentYearRemaining: formatCurrency(currentYearRemaining),
      availableCarryForward: formatCurrency(totalRemainingCarryForward),
      expiringCarryForward:
        expiringCarryForward > 0
          ? formatCurrency(expiringCarryForward)
          : "None",
      daysRemaining: getDaysUntilTaxYearEnd(),
      hasExpiringCarryForward: expiringCarryForward > 0,
    };
  };

  const getPensionSummary = () => {
    if (!moduleData.pension) {
      return {
        monthlyContribution: "Not configured",
        projectedValue: "Set up your pension",
        yearsToRetirement: "—",
      };
    }

    const {
      salary,
      bonus,
      futureContrib,
      unitType,
      age,
      retirementAge,
      currentPot,
      employerMatchEnabled,
      employerMatch,
    } = moduleData.pension;

    const totalSalary = (salary || 0) + (bonus || 0);

    const monthlyPersonalContrib =
      unitType === "percent"
        ? ((futureContrib / 100) * totalSalary) / 12
        : futureContrib / 12;

    const monthlyEmployerContrib = employerMatchEnabled
      ? unitType === "percent"
        ? ((employerMatch / 100) * totalSalary) / 12
        : employerMatch / 12
      : 0;

    const totalMonthlyContrib = monthlyPersonalContrib + monthlyEmployerContrib;

    const yearsToSave = Math.max(0, (retirementAge || 65) - (age || 30));

    const annualReturn = 0.04;
    const monthlyReturn = annualReturn / 12;
    const totalMonths = yearsToSave * 12;

    const futureValue =
      (currentPot || 0) * Math.pow(1 + annualReturn, yearsToSave) +
      (totalMonthlyContrib * (Math.pow(1 + monthlyReturn, totalMonths) - 1)) /
        monthlyReturn;

    return {
      monthlyContribution: `£${Math.round(
        totalMonthlyContrib
      ).toLocaleString()}`,
      projectedValue: `${formatCurrency(futureValue)} by age ${
        retirementAge || 65
      }`,
      yearsToRetirement: `${yearsToSave} years`,
    };
  };

  const pensionSummary = getPensionSummary();
  const pensionAllowanceSummary = getPensionAllowanceSummary();

  const handleNavigateToModule = (moduleName) => {
    console.log(`Navigate to ${moduleName} module`);
  };

  const savingsUploads = savingsData?.uploads || [];
  const pensionAccounts = pensionPotsData?.pensions || [];
  const debts = debtsData?.debts || [];

  console.log("=== NET WORTH CHART DATA (RENDER) ===");
  console.log("savingsData state:", savingsData);
  console.log("pensionPotsData state:", pensionPotsData);
  console.log("savingsUploads length:", savingsUploads.length);
  console.log("pensionAccounts length:", pensionAccounts.length);
  console.log(
    "Should show chart:",
    savingsUploads.length > 0 || pensionAccounts.length > 0
  );

  return (
    <div className="landing-page-container">
      <div className="landing-content-wrapper">
        {/* Demo Mode Banner */}
        {isDemoMode && <DemoModeBanner />}

        {savingsUploads.length > 0 || pensionAccounts.length > 0 || debts.length > 0 ? (
          <div className="networth-section">
            <NetWorthChart
              savingsUploads={savingsUploads}
              pensionAccounts={pensionAccounts}
              debts={debts}
              selectedSavingsAccounts={[]}
              selectedPensions={[]}
              showMetricsAbove={true}
            />
          </div>
        ) : (
          <div className="networth-placeholder">
            Upload savings, pension, or debt data to see your net worth chart
          </div>
        )}

        <div className="modules-grid">
          <div className="module-card">
            <div className="module-header">
              <div className="module-icon allowance">📊</div>
              <h2 className="module-title">Pension Allowances</h2>
            </div>
            <p className="module-description">
              Monitor your annual allowance usage and carry forward from
              previous years. Track expiring allowances and optimize your
              contribution timing to avoid tax charges.
            </p>
            <div className="module-summary">
              <div className="summary-item">
                <span className="summary-label">Current Year Remaining:</span>
                <span className="summary-value">
                  {pensionAllowanceSummary.currentYearRemaining}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Available Carry Forward:</span>
                <span className="summary-value">
                  {pensionAllowanceSummary.availableCarryForward}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Expiring This Year:</span>
                <span
                  className={`summary-value ${
                    pensionAllowanceSummary.hasExpiringCarryForward
                      ? "warning"
                      : ""
                  }`}
                >
                  {pensionAllowanceSummary.expiringCarryForward}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Days Remaining:</span>
                <span
                  className={`summary-value ${
                    pensionAllowanceSummary.daysRemaining < 60 ? "warning" : ""
                  }`}
                >
                  {pensionAllowanceSummary.daysRemaining} days
                </span>
              </div>
            </div>
            <div className="module-actions">
              <button
                className="btn-primary"
                onClick={() => handleNavigateToModule("/PensionPots")}
              >
                View Allowances
              </button>
              <button className="btn-secondary">View Report</button>
            </div>
          </div>

          <div className="module-card">
            <div className="module-header">
              <div className="module-icon pension">£</div>
              <h2 className="module-title">Pension Builder</h2>
            </div>
            <p className="module-description">
              Model your pension contributions, employer matching, and projected
              retirement pot. Compare salary sacrifice vs. personal
              contributions and optimize your tax efficiency.
            </p>
            <div className="module-summary">
              <div className="summary-item">
                <span className="summary-label">Monthly Contribution:</span>
                <span className="summary-value positive">
                  {pensionSummary.monthlyContribution}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Projected Value:</span>
                <span className="summary-value">
                  {pensionSummary.projectedValue}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Years to Retirement:</span>
                <span className="summary-value">
                  {pensionSummary.yearsToRetirement}
                </span>
              </div>
            </div>
            <div className="module-actions">
              <button
                className="btn-primary"
                onClick={() => handleNavigateToModule("pension")}
              >
                Open Builder
              </button>
              <button className="btn-secondary">View Report</button>
            </div>
          </div>

          <div className="module-card">
            <div className="module-header">
              <div className="module-icon mortgage">🏠</div>
              <h2 className="module-title">Mortgage Optimizer</h2>
            </div>
            <p className="module-description">
              Calculate overpayment scenarios, compare mortgage products, and
              see how extra payments can save thousands in interest over the
              life of your loan.
            </p>
            <div className="module-summary">
              <div className="summary-item">
                <span className="summary-label">Monthly Overpayment:</span>
                <span className="summary-value positive">£200/mo</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Interest Saved:</span>
                <span className="summary-value positive">£25,000</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Time Saved:</span>
                <span className="summary-value">5 years 3 months</span>
              </div>
            </div>
            <div className="module-actions">
              <button
                className="btn-primary"
                onClick={() => handleNavigateToModule("mortgage")}
              >
                Open Calculator
              </button>
              <button className="btn-secondary">View Analysis</button>
            </div>
          </div>

          <div className="module-card">
            <div className="module-header">
              <div className="module-icon savings">💰</div>
              <h2 className="module-title">Savings Tracker</h2>
            </div>
            <p className="module-description">
              Track multiple savings goals, ISA contributions, and investment
              accounts. Monitor progress and optimize your savings strategy
              across different vehicles.
            </p>
            <div className="module-summary">
              <div className="summary-item">
                <span className="summary-label">Total Saved:</span>
                <span className="summary-value">£45,650</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Monthly Target:</span>
                <span className="summary-value">£1,200/mo</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">ISA Remaining:</span>
                <span className="summary-value warning">£8,340</span>
              </div>
            </div>
            <div className="module-actions">
              <button
                className="btn-primary"
                onClick={() => handleNavigateToModule("savings")}
              >
                Open Tracker
              </button>
              <button className="btn-secondary">View Goals</button>
            </div>
          </div>

          <div className="module-card">
            <div className="module-header">
              <div className="module-icon tax">📊</div>
              <h2 className="module-title">Tax Planner</h2>
            </div>
            <p className="module-description">
              Optimize your tax efficiency across income, pensions, investments,
              and allowances. Model different scenarios to minimize your tax
              liability legally.
            </p>
            <div className="module-summary">
              <div className="summary-item">
                <span className="summary-label">Annual Tax:</span>
                <span className="summary-value">£28,470</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Effective Rate:</span>
                <span className="summary-value">31.2%</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Potential Savings:</span>
                <span className="summary-value positive">£3,240/yr</span>
              </div>
            </div>
            <div className="module-actions">
              <button
                className="btn-primary"
                onClick={() => handleNavigateToModule("tax")}
              >
                Open Planner
              </button>
              <button className="btn-secondary">View Breakdown</button>
            </div>
          </div>
        </div>

        <div className="cta-section">
          <h2 className="cta-title">Ready to optimize your finances?</h2>
          <p className="cta-description">
            Start with any module above, or dive into our comprehensive
            financial planning guide to understand how all these tools work
            together to maximize your wealth.
          </p>
          <button className="cta-button">View Planning Guide</button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
