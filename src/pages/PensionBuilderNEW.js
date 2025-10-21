import React, { useState, useEffect, useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import debounce from "lodash.debounce";
import { db } from "../firebase";
import { useAuth } from "../context/AuthProvider";

import IncomeTaxInputs from "../modules/IncomeTaxInputs";
import PensionReturnsChart from "../modules/PensionReturnsChart";
import IncomeTaxBreakdownTable from "../modules/IncomeTaxBreakdownTable";
import { getIncomeTax, getNI } from "../modules/utils";
import "./PensionBuilderStyles.css";
import "./SavingsTrackerStyles.css"; // for full-width-card + tracker-title

export default function PensionBuilder() {
  const { user } = useAuth();

  // Core state
  const [salary, setSalary] = useState(100000);
  const [bonus, setBonus] = useState(0);
  const [age, setAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentPot, setCurrentPot] = useState(55000);
  const [pensionType, setPensionType] = useState("Salary Sacrifice");
  const [unitType, setUnitType] = useState("percent");
  const [currentContrib, setCurrentContrib] = useState(5);
  const [futureContrib, setFutureContrib] = useState(10);
  const [employerMatchEnabled, setEmployerMatchEnabled] = useState(false);
  const [employerMatch, setEmployerMatch] = useState(10);
  const [selectedReturnKey, setSelectedReturnKey] = useState("Medium");
  const [returnRates, setReturnRates] = useState({
    Low: 0.02,
    Medium: 0.04,
    High: 0.06,
  });
  const [taxPeriod, setTaxPeriod] = useState("Monthly");

  // Derived values
  const totalSalary = salary + bonus;
  const yearsToSave = Math.max(0, retirementAge - age);
  const periodDivisor = { Annual: 1, Monthly: 12, Weekly: 52, Daily: 260 }[
    taxPeriod
  ];

  const currentMonthly =
    unitType === "percent"
      ? ((currentContrib / 100) * totalSalary) / 12
      : currentContrib / 12;

  const futureMonthly =
    unitType === "percent"
      ? ((futureContrib / 100) * totalSalary) / 12
      : futureContrib / 12;

  const employerMonthly = employerMatchEnabled
    ? unitType === "percent"
      ? ((employerMatch / 100) * totalSalary) / 12
      : employerMatch / 12
    : 0;

  const taxableIncome = Math.max(0, totalSalary - futureMonthly * 12);
  const personalAllowance = 12570;

  const incomeTax = useMemo(() => getIncomeTax(taxableIncome), [taxableIncome]);
  const nationalInsurance = useMemo(
    () => getNI(taxableIncome),
    [taxableIncome]
  );
  const netTakeHome =
    totalSalary - futureMonthly * 12 - incomeTax - nationalInsurance;

  const rawChartData = [
    {
      name: "Current",
      "Net Pay":
        (totalSalary -
          currentMonthly * 12 -
          getIncomeTax(totalSalary - currentMonthly * 12) -
          getNI(totalSalary - currentMonthly * 12)) /
        periodDivisor,
      NI: getNI(totalSalary - currentMonthly * 12) / periodDivisor,
      "Income Tax":
        getIncomeTax(totalSalary - currentMonthly * 12) / periodDivisor,
      Pension: (currentMonthly * 12) / periodDivisor,
    },
    {
      name: "Future",
      "Net Pay": netTakeHome / periodDivisor,
      NI: nationalInsurance / periodDivisor,
      "Income Tax": incomeTax / periodDivisor,
      Pension: (futureMonthly * 12) / periodDivisor,
    },
  ];

  const barchartData = rawChartData.map((item) => {
    const total =
      item["Net Pay"] + item["Pension"] + item["NI"] + item["Income Tax"];
    return { ...item, total };
  });

  // Firebase: Load on mount
  useEffect(() => {
    if (!user?.uid) return;

    const loadPensionScenarios = async () => {
      try {
        const ref = doc(db, "pensionScenarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          if (d.salary !== undefined) setSalary(d.salary);
          if (d.bonus !== undefined) setBonus(d.bonus);
          if (d.age !== undefined) setAge(d.age);
          if (d.retirementAge !== undefined) setRetirementAge(d.retirementAge);
          if (d.currentPot !== undefined) setCurrentPot(d.currentPot);
          if (d.pensionType !== undefined) setPensionType(d.pensionType);
          if (d.unitType !== undefined) setUnitType(d.unitType);
          if (d.currentContrib !== undefined) setCurrentContrib(d.currentContrib);
          if (d.futureContrib !== undefined) setFutureContrib(d.futureContrib);
          if (d.employerMatchEnabled !== undefined) setEmployerMatchEnabled(d.employerMatchEnabled);
          if (d.employerMatch !== undefined) setEmployerMatch(d.employerMatch);
          if (d.selectedReturnKey !== undefined) setSelectedReturnKey(d.selectedReturnKey);
          if (d.returnRates !== undefined) setReturnRates(d.returnRates);
          if (d.taxPeriod !== undefined) setTaxPeriod(d.taxPeriod);
        }
      } catch (error) {
        console.error("Error loading pension scenarios:", error);
      }
    };

    loadPensionScenarios();
  }, [user]);

  // Firebase: Save with debounce
  useEffect(() => {
    if (!user?.uid) return;

    const savePensionScenarios = debounce(async () => {
      try {
        const ref = doc(db, "pensionScenarios", user.uid);
        await setDoc(ref, {
          salary,
          bonus,
          age,
          retirementAge,
          currentPot,
          pensionType,
          unitType,
          currentContrib,
          futureContrib,
          employerMatchEnabled,
          employerMatch,
          selectedReturnKey,
          returnRates,
          taxPeriod,
        });
      } catch (error) {
        console.error("Error saving pension scenarios:", error);
      }
    }, 1000);

    savePensionScenarios();
    return () => savePensionScenarios.cancel();
  }, [
    user?.uid,
    salary,
    bonus,
    age,
    retirementAge,
    currentPot,
    pensionType,
    unitType,
    currentContrib,
    futureContrib,
    employerMatchEnabled,
    employerMatch,
    selectedReturnKey,
    returnRates,
    taxPeriod,
  ]);

  return (
    <div className="savings-tracker-container">
      <div className="full-width-card">
        <IncomeTaxInputs
          salary={salary}
          bonus={bonus}
          age={age}
          retirementAge={retirementAge}
          currentPot={currentPot}
          pensionType={pensionType}
          unitType={unitType}
          currentContrib={currentContrib}
          futureContrib={futureContrib}
          employerMatchEnabled={employerMatchEnabled}
          employerMatch={employerMatch}
          setSalary={setSalary}
          setBonus={setBonus}
          setAge={setAge}
          setRetirementAge={setRetirementAge}
          setCurrentPot={setCurrentPot}
          setPensionType={setPensionType}
          setUnitType={setUnitType}
          setCurrentContrib={setCurrentContrib}
          setFutureContrib={setFutureContrib}
          setEmployerMatchEnabled={setEmployerMatchEnabled}
          setEmployerMatch={setEmployerMatch}
        />
      </div>

      <div className="full-width-card">
        <PensionReturnsChart
          currentPot={currentPot}
          currentMonthly={currentMonthly}
          futureMonthly={futureMonthly}
          employerMonthly={employerMonthly}
          returnRates={returnRates}
          selectedReturnKey={selectedReturnKey}
          setReturnRates={setReturnRates}
          setSelectedReturnKey={setSelectedReturnKey}
          yearsToSave={yearsToSave}
          employerMatchEnabled={employerMatchEnabled}
        />
      </div>

      <div className="full-width-card">
        <IncomeTaxBreakdownTable
          totalSalary={totalSalary}
          personalAllowance={personalAllowance}
          currentMonthly={currentMonthly}
          futureMonthly={futureMonthly}
          employerMonthly={employerMonthly}
          employerMatchEnabled={employerMatchEnabled}
          incomeTax={incomeTax}
          nationalInsurance={nationalInsurance}
          netTakeHome={netTakeHome}
          taxPeriod={taxPeriod}
        />
      </div>
    </div>
  );
}
