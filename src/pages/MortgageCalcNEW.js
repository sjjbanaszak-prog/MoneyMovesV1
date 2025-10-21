import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import debounce from "lodash.debounce";

import MortgageInputForm from "../modules/mortgage/MortgageInputForm";
import MortgageSummary from "../modules/mortgage/MortgageSummary";
import MortgageChart from "../modules/mortgage/MortgageChart";
import MortgageSchedule from "../modules/mortgage/MortgageSchedule";

import {
  formatCurrency,
  generateAmortizationSchedule,
  calculateSavingsInterestPotential,
} from "../modules/utils/mortgageUtils";

import { db } from "../firebase";
import { useAuth } from "../context/AuthProvider";

import "./MortgageCalcNEWStyles.css";

const MortgageCalcNEW = () => {
  const { user } = useAuth();

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
  });

  const frequencyOptions = [
    { value: "monthly", label: "Monthly" },
    { value: "weekly", label: "Weekly" },
    { value: "yearly", label: "Yearly" },
  ];

  const updateInput = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
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
        }
      } catch (error) {
        console.error("Error loading mortgage data:", error);
      }
    };

    loadMortgageInputs();
  }, [user]);

  // Firebase: Save mortgage inputs with debounce
  useEffect(() => {
    if (!user?.uid) return;

    const saveMortgageInputs = debounce(async () => {
      try {
        const ref = doc(db, "mortgageCalculations", user.uid);
        await setDoc(ref, { ...inputs, savingsRate });
      } catch (error) {
        console.error("Error saving mortgage data:", error);
      }
    }, 1000);

    saveMortgageInputs();

    return () => saveMortgageInputs.cancel();
  }, [inputs, savingsRate, user?.uid]);

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

  return (
    <div className="savings-tracker-container">
      <MortgageInputForm
        inputs={inputs}
        updateInput={updateInput}
        frequencyOptions={frequencyOptions}
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

      <div style={{ marginTop: "2rem" }}>
        <MortgageChart
          amortizationNoOverpay={results.amortizationNoOverpay}
          amortizationWithOverpay={results.amortizationWithOverpay}
          oneOffOverpayment={inputs.oneOffOverpaymentEnabled}
          oneOffOverpaymentType="£"
          oneOffOverpaymentAmount={inputs.oneOffOverpayment}
          oneOffMonthIndex={inputs.oneOffMonth}
        />
      </div>

      <MortgageSchedule
        amortizationNoOverpay={results.amortizationNoOverpay}
        amortizationWithOverpay={results.amortizationWithOverpay}
        oneOffOverpayment={
          inputs.oneOffOverpaymentEnabled ? inputs.oneOffOverpayment : 0
        }
        oneOffOverpaymentType="£"
        oneOffMonth={inputs.oneOffMonth}
      />
    </div>
  );
};

export default MortgageCalcNEW;
