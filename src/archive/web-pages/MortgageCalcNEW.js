import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import debounce from "lodash.debounce";

import MortgageInputForm from "../modules/mortgage/MortgageInputForm";
import MortgageSummary from "../modules/mortgage/MortgageSummary";
import MortgageChart from "../modules/mortgage/MortgageChart";
import MortgageSchedule from "../modules/mortgage/MortgageSchedule";
import MortgagePortingForm from "../modules/mortgage/MortgagePortingForm";
import MortgagePortingSummary from "../modules/mortgage/MortgagePortingSummary";

import {
  formatCurrency,
  generateAmortizationSchedule,
  calculateSavingsInterestPotential,
  calculatePortingSchedule,
} from "../modules/utils/mortgageUtils";

import { db } from "../firebase";
import { useAuth } from "../context/AuthProvider";

import "./MortgageCalcNEWStyles.css";
import { useDemoMode } from "../contexts/DemoModeContext";
import DemoModeBanner from "../components/DemoModeBanner";

const MortgageCalcNEW = () => {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemoMode();

  const [inputs, setInputs] = useState({
    loanAmount: 100000,
    termYears: 20,
    initialRate: 4.6,
    initialtermYears: 2,
    expiryRate: 8.09,
    regularOverpayment: 0,
    oneOffOverpayment: 0,
    oneOffMonth: 1,
    oneOffOverpaymentEnabled: false,
    frequency: "monthly",
    mortgageStartDate: "",
  });

  const defaultPorting = {
    enabled: false,
    portType: "product_transfer",
    newFixedStartDate: "",
    newFixedEndDate: "",
    newFixedTermYears: 2,
    newRate: 4.0,
    newRevertRate: 8.09,
    portMonth: 24,
    termResetEnabled: false,
    newTotalTermYears: null,
    topUpAmount: 0,
    topUpRate: 5.0,
    topUpFixedTermYears: 2,
    topUpRevertRate: 8.09,
    fees: {
      ercType: "percentage",
      ercValue: 0,
      arrangementFee: 0,
      valuationFee: 0,
      legalFee: 0,
      brokerFee: 0,
      exitFee: 0,
      cashback: 0,
      addToLoan: false,
    },
  };

  const [porting, setPorting] = useState(defaultPorting);
  const [portingResults, setPortingResults] = useState(null);

  const frequencyOptions = [
    { value: "monthly", label: "Monthly" },
    { value: "weekly", label: "Weekly" },
    { value: "yearly", label: "Yearly" },
  ];

  const updateInput = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const updatePorting = (field, value) => {
    setPorting((prev) => ({ ...prev, [field]: value }));
  };

  const updatePortingFee = (field, value) => {
    setPorting((prev) => ({
      ...prev,
      fees: { ...prev.fees, [field]: value },
    }));
  };

  const togglePorting = (enabled) => {
    setPorting((prev) => ({
      ...prev,
      enabled,
      portMonth: enabled
        ? Math.max(1, inputs.initialtermYears * 12)
        : prev.portMonth,
    }));
  };

  const [results, setResults] = useState({
    totalInterest: 0,
    totalPaid: 0,
    termMonths: 0,
    monthlyPayment: 0,
    schedule: [],
    amortizationWithOverpay: [],
    expiryPayment: 0,
    interestSaved: 0,
    timeSaved: "0 months",
    totalPaidNoOverpay: 0,
    totalPaidWithOverpay: 0,
    savingsInterestPotential: 0,
    recommendation: "",
  });

  const [savingsRate, setSavingsRate] = useState(3.5);

  const handleChange = (e) => {
    setSavingsRate(Number(e.target.value));
  };

  // Firebase: Load saved mortgage inputs on user login
  useEffect(() => {
    if (!user?.uid) return;

    const loadMortgageInputs = async () => {
      try {
        // Demo mode: use demo data
        if (isDemoMode && demoData?.mortgage) {
          const data = demoData.mortgage;
          setInputs({
            loanAmount: data.loanAmount || 100000,
            termYears: data.termYears || 20,
            initialRate: data.initialRate || 4.6,
            initialtermYears: data.initialTermYears || 2,
            expiryRate: data.expiryRate || 8.09,
            regularOverpayment: data.regularOverpayment || 0,
            oneOffOverpayment: data.oneOffOverpayment || 0,
            oneOffMonth: 1,
            oneOffOverpaymentEnabled: false,
            frequency: data.frequency || "monthly",
          });
          return;
        }

        // Live mode: load from Firestore
        const ref = doc(db, "mortgageCalculations", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setInputs((prev) => ({
            ...prev,
            ...data,
          }));
          if (data.savingsRate !== undefined) {
            setSavingsRate(data.savingsRate);
          }
          if (data.portingDetails) {
            setPorting((prev) => ({ ...prev, ...data.portingDetails }));
          }
        }
      } catch (error) {
        console.error("Error loading mortgage data:", error);
      }
    };

    loadMortgageInputs();
  }, [user, isDemoMode, demoData]);

  // Firebase: Save mortgage inputs with debounce
  useEffect(() => {
    if (!user?.uid) return;

    // Don't save to Firestore in demo mode
    if (isDemoMode) return;

    const saveMortgageInputs = debounce(async () => {
      try {
        const ref = doc(db, "mortgageCalculations", user.uid);
        await setDoc(ref, { ...inputs, savingsRate, portingDetails: porting });
      } catch (error) {
        console.error("Error saving mortgage data:", error);
      }
    }, 1000);

    saveMortgageInputs();

    return () => saveMortgageInputs.cancel();
  }, [inputs, savingsRate, porting, user?.uid, isDemoMode]);

  // Sync portMonth from mortgage start date + new fixed start date
  useEffect(() => {
    if (!inputs.mortgageStartDate || !porting.newFixedStartDate) return;
    const d1 = new Date(inputs.mortgageStartDate);
    const d2 = new Date(porting.newFixedStartDate);
    const months =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());
    if (months > 0) {
      setPorting((prev) =>
        prev.portMonth === months ? prev : { ...prev, portMonth: months }
      );
    }
  }, [inputs.mortgageStartDate, porting.newFixedStartDate]); // eslint-disable-line

  // Sync newFixedTermYears from new fixed start + end dates
  useEffect(() => {
    if (!porting.newFixedStartDate || !porting.newFixedEndDate) return;
    const d1 = new Date(porting.newFixedStartDate);
    const d2 = new Date(porting.newFixedEndDate);
    const months =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());
    if (months > 0) {
      const years = months / 12;
      setPorting((prev) =>
        Math.abs(prev.newFixedTermYears - years) < 0.01
          ? prev
          : { ...prev, newFixedTermYears: years }
      );
    }
  }, [porting.newFixedStartDate, porting.newFixedEndDate]); // eslint-disable-line

  // Porting calculation
  useEffect(() => {
    if (!porting.enabled) {
      setPortingResults(null);
      return;
    }
    const result = calculatePortingSchedule(inputs, {
      portMonth: porting.portMonth,
      portType: porting.portType,
      newRate: porting.newRate,
      newFixedTermYears: porting.newFixedTermYears,
      newRevertRate: porting.newRevertRate,
      newTotalTermYears: porting.termResetEnabled ? porting.newTotalTermYears : null,
      topUpAmount: porting.portType === "new_property" ? porting.topUpAmount : 0,
      topUpRate: porting.topUpRate,
      topUpFixedTermYears: porting.topUpFixedTermYears,
      topUpRevertRate: porting.topUpRevertRate,
      fees: porting.fees,
    });
    setPortingResults(result);
  }, [porting, inputs]);

  // Mortgage calculation logic
  useEffect(() => {
    const noOverpayInputs = {
      ...inputs,
      regularOverpayment: 0,
      oneOffOverpayment: 0,
    };
    const noOverpay = generateAmortizationSchedule(noOverpayInputs);

    const withOverpay = generateAmortizationSchedule({
      ...inputs,
      oneOffOverpayment: inputs.oneOffOverpaymentEnabled
        ? inputs.oneOffOverpayment
        : 0,
    });

    const interestSaved = noOverpay.totalInterest - withOverpay.totalInterest;
    const timeSavedMonths = noOverpay.termMonths - withOverpay.termMonths;
    const timeSavedStr = `${Math.floor(timeSavedMonths / 12)}y ${
      timeSavedMonths % 12
    }m`;

    const monthlyOverpaymentAmount =
      inputs.frequency === "monthly"
        ? inputs.regularOverpayment
        : inputs.frequency === "weekly"
        ? (inputs.regularOverpayment * 52) / 12
        : inputs.frequency === "yearly"
        ? inputs.regularOverpayment / 12
        : 0;

    const savingsInterestPotential = calculateSavingsInterestPotential(
      monthlyOverpaymentAmount,
      savingsRate,
      timeSavedMonths
    );

    let recommendationText = "";

    const hasOverpayment = inputs.regularOverpayment > 0;
    const hasSavingsRate = savingsRate > 0;

    if (hasOverpayment && hasSavingsRate) {
      if (savingsInterestPotential > interestSaved) {
        const netGain = savingsInterestPotential - interestSaved;
        recommendationText = `You would save more by investing the money in savings, which could grow to ${formatCurrency(
          savingsInterestPotential
        )} — more than the mortgage interest saved of ${formatCurrency(
          interestSaved
        )}. A net gain of ${formatCurrency(netGain)}.`;
      } else {
        const netGain = interestSaved - savingsInterestPotential;
        recommendationText = `You would save more by overpaying your mortgage, avoiding interest of ${formatCurrency(
          interestSaved
        )} — which is more than the potential savings growth of ${formatCurrency(
          savingsInterestPotential
        )}. A net gain of ${formatCurrency(netGain)}.`;
      }
    }

    setResults({
      ...withOverpay,
      interestSaved,
      timeSaved: timeSavedStr,
      totalPaidNoOverpay: noOverpay.totalPaid,
      totalPaidWithOverpay: withOverpay.totalPaid,
      savingsInterestPotential,
      recommendation: recommendationText,
      amortizationNoOverpay: noOverpay.schedule,
    });
  }, [inputs, savingsRate]);

  const portingActive = porting.enabled && portingResults;
  const portTypeLabelMap = {
    product_transfer: "Product Transfer",
    remortgage: "Remortgage",
    new_property: "Property Port",
  };

  const chartNoOverpay = portingActive
    ? portingResults.noPortCombined || results.amortizationNoOverpay
    : results.amortizationNoOverpay;
  const chartWithOverpay = portingActive
    ? portingResults.combinedSchedule
    : results.amortizationWithOverpay;

  const estimatedBalanceAtPort =
    results.amortizationNoOverpay?.[porting.portMonth - 1]?.balance ?? 0;

  return (
    <div className="savings-tracker-container">
      {/* Demo Mode Banner */}
      {isDemoMode && <DemoModeBanner />}

      <MortgageInputForm
        inputs={inputs}
        updateInput={updateInput}
        frequencyOptions={frequencyOptions}
      />

      <MortgagePortingForm
        porting={porting}
        updatePorting={updatePorting}
        updatePortingFee={updatePortingFee}
        togglePorting={togglePorting}
        mortgageStartDate={inputs.mortgageStartDate}
        initialtermYears={inputs.initialtermYears}
        termYears={inputs.termYears}
        estimatedBalanceAtPort={estimatedBalanceAtPort}
      />

      <MortgageSummary
        monthlyPayment={results.monthlyPayment}
        expiryPayment={results.expiryPayment}
        oneOffOverpayment={inputs.oneOffOverpaymentEnabled}
        oneOffOverpaymentType="£"
        oneOffOverpaymentAmount={inputs.oneOffOverpayment}
        amortizationWithOverpay={results.amortizationWithOverpay}
        oneOffMonthIndex={inputs.oneOffMonth}
        interestSaved={results.interestSaved}
        timeSaved={results.timeSaved}
        totalPaidNoOverpay={results.totalPaidNoOverpay}
        totalPaidWithOverpay={results.totalPaidWithOverpay}
        savingsRate={savingsRate}
        savingsInterestPotential={results.savingsInterestPotential}
        handleChange={handleChange}
        regularOverpaymentAmount={inputs.regularOverpayment}
        mortgageTermYears={inputs.termYears}
        mortgageTermMonths={0}
      />

      {portingActive && (
        <MortgagePortingSummary portingResults={portingResults} />
      )}

      <div style={{ marginTop: "2rem" }}>
        <MortgageChart
          amortizationNoOverpay={chartNoOverpay}
          amortizationWithOverpay={chartWithOverpay}
          oneOffOverpayment={!portingActive && inputs.oneOffOverpaymentEnabled}
          oneOffOverpaymentType="£"
          oneOffOverpaymentAmount={inputs.oneOffOverpayment}
          oneOffMonthIndex={inputs.oneOffMonth}
          portMonth={portingActive ? porting.portMonth : null}
          portLabel={portTypeLabelMap[porting.portType]}
          withOverpayLabel={portingActive ? "With Port" : "With Overpayments"}
          noOverpayLabel={
            portingActive
              ? portingResults.noPortCombined
                ? "Stay on Revert Rate"
                : "No Overpayments"
              : "No Overpayments"
          }
        />
      </div>

      <MortgageSchedule
        amortizationNoOverpay={chartNoOverpay}
        amortizationWithOverpay={chartWithOverpay}
        oneOffOverpayment={
          !portingActive && inputs.oneOffOverpaymentEnabled
            ? inputs.oneOffOverpayment
            : 0
        }
        oneOffOverpaymentType="£"
        oneOffMonth={inputs.oneOffMonth}
        portMonth={portingActive ? porting.portMonth : null}
      />
    </div>
  );
};

export default MortgageCalcNEW;
