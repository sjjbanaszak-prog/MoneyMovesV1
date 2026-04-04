import React, { useState, useMemo } from 'react';
import { Info, TrendingUp, TrendingDown, Calculator, HelpCircle, GitCompare, X } from 'lucide-react';
import { calculateIncomeTax, STUDENT_LOAN_THRESHOLDS } from './utils/incomeTaxUtils';
import './IncomeTaxCalculator.css';

const IncomeTaxCalculator = () => {
  // State management
  const [inputs, setInputs] = useState({
    annualIncome: 45000,
    taxCode: '1257L',
    hasStudentLoan: false,
    studentLoanPlan: 'plan2',
    pensionContribution: 5,
    pensionType: 'percentage',
    pensionScheme: 'salary_sacrifice',
    employerMatch: 3,
    hasEmployerMatch: true,
    bonusAmount: 0,
    hasBonusCommission: false,
    // Benefits in kind
    hasBenefits: false,
    benefitsList: [] // Array of benefit objects
  });

  // Scenario comparison state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [baseScenario, setBaseScenario] = useState(null);
  const [scenarioInputs, setScenarioInputs] = useState(null);
  const [showTooltip, setShowTooltip] = useState(null);

  // Scenario comparison handlers
  const handleStartComparison = () => {
    setBaseScenario({ ...inputs });
    setScenarioInputs({ ...inputs });
    setComparisonMode(true);
  };

  const handleCancelComparison = () => {
    setComparisonMode(false);
    setBaseScenario(null);
    setScenarioInputs(null);
  };

  const handleScenarioChange = (field, value) => {
    setScenarioInputs(prev => ({ ...prev, [field]: value }));
  };

  // Main calculation using utility function
  const calculations = useMemo(() => {
    return calculateIncomeTax(inputs);
  }, [inputs]);

  // Scenario calculations using utility function
  const scenarioCalculations = useMemo(() => {
    if (!comparisonMode || !scenarioInputs) return null;
    return calculateIncomeTax(scenarioInputs);
  }, [comparisonMode, scenarioInputs]);

  // Tooltip content
  const tooltips = {
    taxCode: "Your tax code determines how much tax-free income you get. 1257L is the standard code for 2025/26, giving you £12,570 tax-free allowance.",
    studentLoan: "Student loan repayments are automatically deducted based on your income and plan type. You only repay when earning above the threshold.",
    pension: "Salary sacrifice reduces your gross pay before tax and NI, maximizing savings. Net pay is deducted after NI but before tax. Qualifying earnings (auto-enrolment) applies contributions to earnings between £6,240-£50,270 only. Relief at source: you pay net, provider claims 20% from HMRC.",
    employerMatch: "Many employers match your pension contributions up to a certain percentage, effectively giving you free money for retirement.",
    personalAllowance: "The amount you can earn tax-free. This reduces by £1 for every £2 earned over £100,000.",
    effectiveRate: "Your overall tax rate including income tax, National Insurance, and student loan repayments as a percentage of gross income. This does NOT include pension contributions as they are savings, not taxes.",
    benefits: "Benefits in kind (BIK) are non-cash perks from your employer that are subject to income tax. Examples include company cars, private medical insurance, and gym memberships. These are added to your taxable income and taxed at your marginal rate (20%, 40%, or 45%).",
    companyCar: "Company car benefit is calculated as a percentage of the car's P11D value (list price) based on CO2 emissions. Electric cars are taxed at 3%, while petrol/diesel cars range from 16-37%. You'll need your car's official CO2 emissions figure.",
    p11d: "P11D value is the official list price of your company car when new, including VAT and any factory-fitted accessories. This information is on your P11D form or can be found in your car's documentation."
  };

  const Tooltip = ({ content }) => (
    <div className="tooltip">
      {content}
    </div>
  );

  // Render input column helper function
  const renderInputColumn = (columnInputs, isBase = false, onChange = null) => {
    const isEditable = !isBase;
    const handleChange = onChange || ((field, value) => setInputs(prev => ({ ...prev, [field]: value })));
    
    return (
      <div className={`itc-card ${isBase ? 'itc-card-base' : isEditable ? 'itc-card-scenario' : ''}`}>
        {comparisonMode && (
          <div className={`itc-card-badge ${isBase ? 'badge-base' : 'badge-scenario'}`}>
            {isBase ? 'BASE' : 'SCENARIO'}
          </div>
        )}

        <h2 className="itc-card-title">Income & Deductions</h2>

        {/* Annual Income */}
        <div className="itc-form-group">
          <label className="itc-form-label">Annual Gross Income</label>
          <div className="itc-input-wrapper">
            <span className="currency-symbol">£</span>
            <input
              type="number"
              value={columnInputs.annualIncome}
              onChange={(e) => handleChange('annualIncome', parseFloat(e.target.value) || 0)}
              disabled={!isEditable}
              className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
            />
          </div>
        </div>

        {/* Bonus/Commission */}
        <div className="itc-form-group">
          <label className={`itc-checkbox-label ${!isEditable ? 'itc-checkbox-label-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={columnInputs.hasBonusCommission}
              onChange={(e) => handleChange('hasBonusCommission', e.target.checked)}
              disabled={!isEditable}
              className={`itc-form-checkbox ${!isEditable ? 'itc-form-checkbox-disabled' : ''}`}
            />
            <span className="itc-form-label">I receive bonus/commission</span>
          </label>
          {columnInputs.hasBonusCommission && (
            <div className="itc-input-wrapper itc-input-nested">
              <span className="currency-symbol">£</span>
              <input
                type="number"
                value={columnInputs.bonusAmount}
                onChange={(e) => handleChange('bonusAmount', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
                placeholder="Annual bonus amount"
                className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
              />
            </div>
          )}
        </div>

        {/* Tax Code */}
        <div className="itc-form-group">
          <label className="itc-form-label-flex">
            Tax Code (Optional)
            <div
              onMouseEnter={() => setShowTooltip('taxCode')}
              onMouseLeave={() => setShowTooltip(null)}
              className="tooltip-trigger"
            >
              <HelpCircle size={14} color="#64748b" />
              {showTooltip === 'taxCode' && <Tooltip content={tooltips.taxCode} />}
            </div>
          </label>
          <input
            type="text"
            value={columnInputs.taxCode}
            onChange={(e) => handleChange('taxCode', e.target.value)}
            disabled={!isEditable}
            placeholder="e.g., 1257L"
            className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
          />
        </div>

        {/* Student Loan */}
        <div className="itc-form-group">
          <label className={`itc-checkbox-label ${!isEditable ? 'itc-checkbox-label-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={columnInputs.hasStudentLoan}
              onChange={(e) => handleChange('hasStudentLoan', e.target.checked)}
              disabled={!isEditable}
              className={`itc-form-checkbox ${!isEditable ? 'itc-form-checkbox-disabled' : ''}`}
            />
            <span className="itc-form-label">I'm repaying a student loan</span>
            <div
              onMouseEnter={() => setShowTooltip('studentLoan')}
              onMouseLeave={() => setShowTooltip(null)}
              className="tooltip-trigger"
            >
              <HelpCircle size={14} color="#64748b" />
              {showTooltip === 'studentLoan' && <Tooltip content={tooltips.studentLoan} />}
            </div>
          </label>
          {columnInputs.hasStudentLoan && (
            <select
              value={columnInputs.studentLoanPlan}
              onChange={(e) => handleChange('studentLoanPlan', e.target.value)}
              disabled={!isEditable}
              className={`itc-form-select itc-input-nested ${!isEditable ? 'itc-form-select-disabled' : ''}`}
            >
              <option value="plan1">Plan 1 (Before Sept 2012)</option>
              <option value="plan2">Plan 2 (Sept 2012 - July 2023)</option>
              <option value="plan4">Plan 4 (Scotland)</option>
              <option value="plan5">Plan 5 (After Aug 2023)</option>
              <option value="postgraduate">Postgraduate Loan</option>
            </select>
          )}
        </div>

        {/* Pension Contribution */}
        <div className="itc-form-group">
          <label className="itc-form-label-flex">
            Pension Contribution
            <div
              onMouseEnter={() => setShowTooltip('pension')}
              onMouseLeave={() => setShowTooltip(null)}
              className="tooltip-trigger"
            >
              <HelpCircle size={14} color="#64748b" />
              {showTooltip === 'pension' && <Tooltip content={tooltips.pension} />}
            </div>
          </label>
          <div className="itc-btn-toggle-group">
            <button
              onClick={() => handleChange('pensionType', 'percentage')}
              disabled={!isEditable}
              className={`itc-btn-toggle ${columnInputs.pensionType === 'percentage' ? 'itc-btn-toggle-active' : ''} ${!isEditable ? 'itc-btn-toggle-disabled' : ''}`}
            >
              Percentage
            </button>
            <button
              onClick={() => handleChange('pensionType', 'amount')}
              disabled={!isEditable}
              className={`itc-btn-toggle ${columnInputs.pensionType === 'amount' ? 'itc-btn-toggle-active' : ''} ${!isEditable ? 'itc-btn-toggle-disabled' : ''}`}
            >
              Fixed Amount
            </button>
          </div>
          <div className="itc-input-wrapper">
            <span className="currency-symbol">
              {columnInputs.pensionType === 'percentage' ? '%' : '£'}
            </span>
            <input
              type="number"
              value={columnInputs.pensionContribution}
              onChange={(e) => handleChange('pensionContribution', parseFloat(e.target.value) || 0)}
              disabled={!isEditable}
              placeholder={columnInputs.pensionType === 'percentage' ? '5' : '2250'}
              className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
            />
          </div>
        </div>

        {/* Pension Scheme Type */}
        <div className="itc-form-group">
          <label className="itc-form-label">Pension Scheme Type</label>
          <select
            value={columnInputs.pensionScheme}
            onChange={(e) => handleChange('pensionScheme', e.target.value)}
            disabled={!isEditable}
            className={`itc-form-select ${!isEditable ? 'itc-form-select-disabled' : ''}`}
          >
            <option value="salary_sacrifice">Salary Sacrifice</option>
            <option value="net_pay">Net Pay</option>
            <option value="qualifying_earnings">Qualifying Earnings (Auto-enrolment)</option>
            <option value="relief_at_source">Relief at Source</option>
          </select>
        </div>

        {/* Employer Match */}
        <div className="itc-form-group itc-form-group-last">
          <label className={`itc-checkbox-label ${!isEditable ? 'itc-checkbox-label-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={columnInputs.hasEmployerMatch}
              onChange={(e) => handleChange('hasEmployerMatch', e.target.checked)}
              disabled={!isEditable}
              className={`itc-form-checkbox ${!isEditable ? 'itc-form-checkbox-disabled' : ''}`}
            />
            <span className="itc-form-label">Employer pension match</span>
            <div
              onMouseEnter={() => setShowTooltip('employerMatch')}
              onMouseLeave={() => setShowTooltip(null)}
              className="tooltip-trigger"
            >
              <HelpCircle size={14} color="#64748b" />
              {showTooltip === 'employerMatch' && <Tooltip content={tooltips.employerMatch} />}
            </div>
          </label>
          {columnInputs.hasEmployerMatch && (
            <div className="itc-input-wrapper itc-input-nested">
              <span className="currency-symbol">%</span>
              <input
                type="number"
                value={columnInputs.employerMatch}
                onChange={(e) => handleChange('employerMatch', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
                placeholder="3"
                className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
              />
            </div>
          )}
        </div>

        {/* Employer Benefits */}
        <div className="itc-form-group">
          <label className={`itc-checkbox-label ${!isEditable ? 'itc-checkbox-label-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={columnInputs.hasBenefits}
              onChange={(e) => handleChange('hasBenefits', e.target.checked)}
              disabled={!isEditable}
              className={`itc-form-checkbox ${!isEditable ? 'itc-form-checkbox-disabled' : ''}`}
            />
            <span className="itc-form-label">I receive employer benefits (BIK)</span>
            <div
              onMouseEnter={() => setShowTooltip('benefits')}
              onMouseLeave={() => setShowTooltip(null)}
              className="tooltip-trigger"
            >
              <HelpCircle size={14} color="#64748b" />
              {showTooltip === 'benefits' && <Tooltip content={tooltips.benefits} />}
            </div>
          </label>

          {columnInputs.hasBenefits && (
            <div className="itc-benefits-container">
              {/* Benefit Selection Dropdown */}
              {isEditable && (
                <div className="itc-benefit-select-wrapper">
                  <select
                    className="itc-form-select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const newBenefit = { type: e.target.value, value: e.target.value === 'companyCar' ? {} : 0 };
                        handleChange('benefitsList', [...(columnInputs.benefitsList || []), newBenefit]);
                        e.target.value = ''; // Reset dropdown
                      }
                    }}
                  >
                    <option value="">Select a benefit...</option>
                    <option value="companyCar">Company Car</option>
                    <option value="privateMedical">Private Medical Insurance</option>
                    <option value="dentalInsurance">Dental Insurance</option>
                    <option value="travelInsurance">Travel Insurance</option>
                    <option value="lifeAssurance">Life Assurance</option>
                    <option value="incomeProtection">Income Protection</option>
                    <option value="criticalIllness">Critical Illness Cover</option>
                    <option value="gymMembership">Gym Membership</option>
                    <option value="technologyScheme">Technology Purchase Scheme</option>
                    <option value="otherBenefits">Other Benefits</option>
                  </select>
                </div>
              )}

              {/* Render Added Benefits */}
              {(columnInputs.benefitsList || []).map((benefit, index) => (
                <div key={index} className="itc-benefit-item">
                  {/* Benefit Header with Remove Button */}
                  <div className="itc-benefit-header">
                    <label className="itc-form-label itc-benefit-label">
                      {benefit.type === 'companyCar' && 'Company Car'}
                      {benefit.type === 'privateMedical' && 'Private Medical Insurance'}
                      {benefit.type === 'dentalInsurance' && 'Dental Insurance'}
                      {benefit.type === 'travelInsurance' && 'Travel Insurance'}
                      {benefit.type === 'lifeAssurance' && 'Life Assurance'}
                      {benefit.type === 'incomeProtection' && 'Income Protection'}
                      {benefit.type === 'criticalIllness' && 'Critical Illness Cover'}
                      {benefit.type === 'gymMembership' && 'Gym Membership'}
                      {benefit.type === 'technologyScheme' && 'Technology Purchase Scheme'}
                      {benefit.type === 'otherBenefits' && 'Other Benefits'}
                    </label>
                    {isEditable && (
                      <button
                        onClick={() => {
                          const newList = columnInputs.benefitsList.filter((_, i) => i !== index);
                          handleChange('benefitsList', newList);
                        }}
                        className="itc-benefit-remove"
                        title="Remove benefit"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Company Car Inputs */}
                  {benefit.type === 'companyCar' && (
                    <>
                      <div className="itc-input-wrapper itc-benefit-field">
                        <span className="currency-symbol">£</span>
                        <input
                          type="number"
                          value={benefit.value?.p11dValue || 0}
                          onChange={(e) => {
                            const newList = [...columnInputs.benefitsList];
                            newList[index] = {
                              ...benefit,
                              value: { ...benefit.value, p11dValue: parseFloat(e.target.value) || 0 }
                            };
                            handleChange('benefitsList', newList);
                          }}
                          disabled={!isEditable}
                          placeholder="Car P11D value (list price)"
                          className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
                        />
                      </div>

                      {benefit.value?.p11dValue > 0 && (
                        <>
                          <select
                            value={benefit.value?.fuelType || 'petrol'}
                            onChange={(e) => {
                              const newList = [...columnInputs.benefitsList];
                              newList[index] = {
                                ...benefit,
                                value: { ...benefit.value, fuelType: e.target.value }
                              };
                              handleChange('benefitsList', newList);
                            }}
                            disabled={!isEditable}
                            className={`itc-form-select itc-benefit-field ${!isEditable ? 'itc-form-select-disabled' : ''}`}
                          >
                            <option value="electric">Electric (0 g/km CO₂)</option>
                            <option value="hybrid">Hybrid (1-50 g/km CO₂)</option>
                            <option value="petrol">Petrol (51+ g/km CO₂)</option>
                            <option value="diesel">Diesel (51+ g/km CO₂)</option>
                          </select>

                          {benefit.value?.fuelType !== 'electric' && (
                            <div className="itc-input-wrapper itc-benefit-field">
                              <input
                                type="number"
                                value={benefit.value?.co2Emissions || 0}
                                onChange={(e) => {
                                  const newList = [...columnInputs.benefitsList];
                                  newList[index] = {
                                    ...benefit,
                                    value: { ...benefit.value, co2Emissions: parseFloat(e.target.value) || 0 }
                                  };
                                  handleChange('benefitsList', newList);
                                }}
                                disabled={!isEditable}
                                placeholder="CO₂ emissions (g/km)"
                                className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
                              />
                              <span className="currency-symbol">g/km</span>
                            </div>
                          )}

                          {benefit.value?.fuelType === 'hybrid' && (
                            <div className="itc-input-wrapper itc-benefit-field">
                              <input
                                type="number"
                                value={benefit.value?.electricRange || 0}
                                onChange={(e) => {
                                  const newList = [...columnInputs.benefitsList];
                                  newList[index] = {
                                    ...benefit,
                                    value: { ...benefit.value, electricRange: parseFloat(e.target.value) || 0 }
                                  };
                                  handleChange('benefitsList', newList);
                                }}
                                disabled={!isEditable}
                                placeholder="Electric range (miles)"
                                className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
                              />
                              <span className="currency-symbol">miles</span>
                            </div>
                          )}

                          <label className={`itc-checkbox-label ${!isEditable ? 'itc-checkbox-label-disabled' : ''}`}>
                            <input
                              type="checkbox"
                              checked={benefit.value?.hasFuelBenefit || false}
                              onChange={(e) => {
                                const newList = [...columnInputs.benefitsList];
                                newList[index] = {
                                  ...benefit,
                                  value: { ...benefit.value, hasFuelBenefit: e.target.checked }
                                };
                                handleChange('benefitsList', newList);
                              }}
                              disabled={!isEditable}
                              className={`itc-form-checkbox ${!isEditable ? 'itc-form-checkbox-disabled' : ''}`}
                            />
                            <span className="itc-form-label itc-small-label">Fuel provided for private use</span>
                          </label>

                          {/* Salary Sacrifice Checkbox for Company Car */}
                          <div className="itc-salary-sacrifice-row">
                            <input
                              type="checkbox"
                              id={`car-salary-sacrifice-${index}`}
                              checked={benefit.isSalarySacrifice || false}
                              onChange={(e) => {
                                const newList = [...columnInputs.benefitsList];
                                newList[index] = { ...benefit, isSalarySacrifice: e.target.checked };
                                handleChange('benefitsList', newList);
                              }}
                              disabled={!isEditable}
                              className="itc-salary-sacrifice-checkbox"
                            />
                            <label
                              htmlFor={`car-salary-sacrifice-${index}`}
                              className={`itc-salary-sacrifice-label ${!isEditable ? 'itc-salary-sacrifice-label-disabled' : ''}`}
                            >
                              Provided via salary sacrifice (reduces NI)
                            </label>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Technology Scheme Input */}
                  {benefit.type === 'technologyScheme' && (
                    <>
                      <div className="itc-input-wrapper">
                        <span className="currency-symbol">£</span>
                        <input
                          type="number"
                          value={benefit.value || 0}
                          onChange={(e) => {
                            const newList = [...columnInputs.benefitsList];
                            newList[index] = { ...benefit, value: parseFloat(e.target.value) || 0 };
                            handleChange('benefitsList', newList);
                          }}
                          disabled={!isEditable}
                          placeholder="Annual salary sacrifice amount"
                          className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
                        />
                      </div>
                      <p className="itc-benefit-note">
                        Salary sacrifice: saves NI, BIK tax recovered via tax code
                      </p>
                    </>
                  )}

                  {/* Standard Benefit Input (PMI, Dental, etc.) */}
                  {benefit.type !== 'companyCar' && benefit.type !== 'technologyScheme' && (
                    <>
                      <div className="itc-input-wrapper">
                        <span className="currency-symbol">£</span>
                        <input
                          type="number"
                          value={benefit.value || 0}
                          onChange={(e) => {
                            const newList = [...columnInputs.benefitsList];
                            newList[index] = { ...benefit, value: parseFloat(e.target.value) || 0 };
                            handleChange('benefitsList', newList);
                          }}
                          disabled={!isEditable}
                          placeholder="Annual value"
                          className={`itc-form-input ${!isEditable ? 'itc-form-input-disabled' : ''}`}
                        />
                      </div>

                      {/* Salary Sacrifice Checkbox */}
                      <div className="itc-salary-sacrifice-row">
                        <input
                          type="checkbox"
                          id={`salary-sacrifice-${index}`}
                          checked={benefit.isSalarySacrifice || false}
                          onChange={(e) => {
                            const newList = [...columnInputs.benefitsList];
                            newList[index] = { ...benefit, isSalarySacrifice: e.target.checked };
                            handleChange('benefitsList', newList);
                          }}
                          disabled={!isEditable}
                          className="itc-salary-sacrifice-checkbox"
                        />
                        <label
                          htmlFor={`salary-sacrifice-${index}`}
                          className={`itc-salary-sacrifice-label ${!isEditable ? 'itc-salary-sacrifice-label-disabled' : ''}`}
                        >
                          Provided via salary sacrifice (reduces NI)
                        </label>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Show message if no benefits added */}
              {(!columnInputs.benefitsList || columnInputs.benefitsList.length === 0) && (
                <p className="itc-benefit-empty">
                  {isEditable ? 'Select a benefit from the dropdown above to get started.' : 'No benefits added.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="income-tax-calculator">
      <div className="calculator-container">
        {/* Header */}
        <div className="calculator-header">
          <div className="calculator-title-section">
            <Calculator size={32} color="#10b981" />
            <h1 className="calculator-title">UK Income Tax Calculator</h1>
          </div>
          <div className="calculator-header-right">
            {!comparisonMode ? (
              <button onClick={handleStartComparison} className="btn-compare">
                <GitCompare size={18} />
                Compare Scenarios
              </button>
            ) : (
              <button onClick={handleCancelComparison} className="btn-exit-compare">
                <X size={18} />
                Exit Comparison
              </button>
            )}
            <div className="header-tax-year">2025/26 Tax Year</div>
          </div>
        </div>

        <p className="header-subtitle">
          {comparisonMode ? 'Comparing base scenario with new scenario' : 'Calculate your take-home pay for the 2025/26 tax year'}
        </p>

        {/* Comparison Mode Indicator */}
        {comparisonMode && (
          <div className="comparison-indicator">
            <Info size={20} color="#10b981" />
            <div>
              <p className="comparison-indicator-title">Comparison Mode Active</p>
              <p className="comparison-indicator-text">
                Base scenario is locked. Adjust the scenario inputs on the right to see how changes affect your take-home pay.
              </p>
            </div>
          </div>
        )}

        {/* Comparison Dashboard */}
        {comparisonMode && scenarioCalculations && (
          <div className="comparison-dashboard">
            {/* Take-Home Card */}
            <div className="comparison-card comparison-card-takehome">
              <div className="comparison-card-header">
                <TrendingUp size={20} color="#10b981" />
                <h3 className="comparison-card-title">Take-Home Pay</h3>
              </div>
              <div className="comparison-card-content">
                <div className="comparison-row">
                  <span className="comparison-label">Base:</span>
                  <span className="comparison-value-base">
                    £{calculations.takeHomePay.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="comparison-row">
                  <span className="comparison-label">Scenario:</span>
                  <span className="comparison-value-scenario">
                    £{scenarioCalculations.takeHomePay.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="comparison-divider" />
                <div className="comparison-row">
                  <span className="comparison-difference">Difference:</span>
                  <div className="comparison-diff-values">
                    <span className={`comparison-diff-amount ${scenarioCalculations.takeHomePay >= calculations.takeHomePay ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                      {scenarioCalculations.takeHomePay >= calculations.takeHomePay ? '↑' : '↓'} £
                      {Math.abs(scenarioCalculations.takeHomePay - calculations.takeHomePay).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`comparison-diff-percent ${scenarioCalculations.takeHomePay >= calculations.takeHomePay ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                      ({((Math.abs(scenarioCalculations.takeHomePay - calculations.takeHomePay) / calculations.takeHomePay) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Card */}
            <div className="comparison-card comparison-card-tax">
              <div className="comparison-card-header">
                <TrendingDown size={20} color="#f59e0b" />
                <h3 className="comparison-card-title">Total Taxes</h3>
              </div>
              <div className="comparison-card-content">
                <div className="comparison-row">
                  <span className="comparison-label">Base:</span>
                  <span className="comparison-value-base">
                    £{calculations.totalTaxes.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="comparison-row">
                  <span className="comparison-label">Scenario:</span>
                  <span className="comparison-value-scenario">
                    £{scenarioCalculations.totalTaxes.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="comparison-divider" />
                <div className="comparison-row">
                  <span className="comparison-difference">Difference:</span>
                  <div className="comparison-diff-values">
                    <span className={`comparison-diff-amount ${scenarioCalculations.totalTaxes <= calculations.totalTaxes ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                      {scenarioCalculations.totalTaxes <= calculations.totalTaxes ? '↓' : '↑'} £
                      {Math.abs(scenarioCalculations.totalTaxes - calculations.totalTaxes).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`comparison-diff-percent ${scenarioCalculations.totalTaxes <= calculations.totalTaxes ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                      ({((Math.abs(scenarioCalculations.totalTaxes - calculations.totalTaxes) / calculations.totalTaxes) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pension Card */}
            <div className="comparison-card comparison-card-pension">
              <div className="comparison-card-header">
                <TrendingUp size={20} color="#8b5cf6" />
                <h3 className="comparison-card-title">Total Pension</h3>
              </div>
              <div className="comparison-card-content">
                <div className="comparison-row">
                  <span className="comparison-label">Base:</span>
                  <span className="comparison-value-base">
                    £{calculations.totalPensionContribution.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="comparison-row">
                  <span className="comparison-label">Scenario:</span>
                  <span className="comparison-value-scenario">
                    £{scenarioCalculations.totalPensionContribution.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="comparison-divider" />
                <div className="comparison-row">
                  <span className="comparison-difference">Difference:</span>
                  <div className="comparison-diff-values">
                    <span className={`comparison-diff-amount ${scenarioCalculations.totalPensionContribution >= calculations.totalPensionContribution ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                      {scenarioCalculations.totalPensionContribution >= calculations.totalPensionContribution ? '↑' : '↓'} £
                      {Math.abs(scenarioCalculations.totalPensionContribution - calculations.totalPensionContribution).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`comparison-diff-percent ${scenarioCalculations.totalPensionContribution >= calculations.totalPensionContribution ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                      ({calculations.totalPensionContribution > 0 ? ((Math.abs(scenarioCalculations.totalPensionContribution - calculations.totalPensionContribution) / calculations.totalPensionContribution) * 100).toFixed(1) : '0.0'}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Chart - Vertical Bars */}
        {comparisonMode && scenarioCalculations && (
          <div className="comparison-chart">
            <h3 className="chart-header">
              <TrendingUp size={20} color="#10b981" />
              Visual Comparison
            </h3>

            <div className="itc-chart-container">
              {/* Take-Home Pay Bars */}
              <div className="chart-metric">
                <div className="chart-bars-container">
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar chart-bar-base"
                      style={{
                        height: `${(calculations.takeHomePay / Math.max(calculations.takeHomePay, scenarioCalculations.takeHomePay)) * 280}px`
                      }}
                    >
                      <span className="chart-bar-value">
                        £{(calculations.takeHomePay / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <span className="chart-bar-label chart-bar-label-base">BASE</span>
                  </div>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar chart-bar-scenario"
                      style={{
                        height: `${(scenarioCalculations.takeHomePay / Math.max(calculations.takeHomePay, scenarioCalculations.takeHomePay)) * 280}px`
                      }}
                    >
                      <span className="chart-bar-value">
                        £{(scenarioCalculations.takeHomePay / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <span className="chart-bar-label chart-bar-label-scenario">SCENARIO</span>
                  </div>
                </div>
                <div className="chart-metric-info">
                  <div className="chart-metric-name">Take-Home</div>
                  <div className={`chart-metric-diff ${scenarioCalculations.takeHomePay >= calculations.takeHomePay ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                    {scenarioCalculations.takeHomePay >= calculations.takeHomePay ? '↑' : '↓'} £
                    {Math.abs(scenarioCalculations.takeHomePay - calculations.takeHomePay).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* Income Tax Bars */}
              <div className="chart-metric">
                <div className="chart-bars-container">
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar chart-bar-base"
                      style={{
                        height: `${(calculations.incomeTax / Math.max(calculations.incomeTax, scenarioCalculations.incomeTax, 1)) * 280}px`
                      }}
                    >
                      <span className="chart-bar-value">
                        £{(calculations.incomeTax / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <span className="chart-bar-label chart-bar-label-base">BASE</span>
                  </div>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar chart-bar-scenario"
                      style={{
                        height: `${(scenarioCalculations.incomeTax / Math.max(calculations.incomeTax, scenarioCalculations.incomeTax, 1)) * 280}px`
                      }}
                    >
                      <span className="chart-bar-value">
                        £{(scenarioCalculations.incomeTax / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <span className="chart-bar-label chart-bar-label-scenario">SCENARIO</span>
                  </div>
                </div>
                <div className="chart-metric-info">
                  <div className="chart-metric-name">Income Tax</div>
                  <div className={`chart-metric-diff ${scenarioCalculations.incomeTax <= calculations.incomeTax ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                    {scenarioCalculations.incomeTax <= calculations.incomeTax ? '↓' : '↑'} £
                    {Math.abs(scenarioCalculations.incomeTax - calculations.incomeTax).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* National Insurance Bars */}
              <div className="chart-metric">
                <div className="chart-bars-container">
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar chart-bar-base"
                      style={{
                        height: `${(calculations.nationalInsurance / Math.max(calculations.nationalInsurance, scenarioCalculations.nationalInsurance, 1)) * 280}px`
                      }}
                    >
                      <span className="chart-bar-value">
                        £{(calculations.nationalInsurance / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <span className="chart-bar-label chart-bar-label-base">BASE</span>
                  </div>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar chart-bar-scenario"
                      style={{
                        height: `${(scenarioCalculations.nationalInsurance / Math.max(calculations.nationalInsurance, scenarioCalculations.nationalInsurance, 1)) * 280}px`
                      }}
                    >
                      <span className="chart-bar-value">
                        £{(scenarioCalculations.nationalInsurance / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <span className="chart-bar-label chart-bar-label-scenario">SCENARIO</span>
                  </div>
                </div>
                <div className="chart-metric-info">
                  <div className="chart-metric-name">National Insurance</div>
                  <div className={`chart-metric-diff ${scenarioCalculations.nationalInsurance <= calculations.nationalInsurance ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                    {scenarioCalculations.nationalInsurance <= calculations.nationalInsurance ? '↓' : '↑'} £
                    {Math.abs(scenarioCalculations.nationalInsurance - calculations.nationalInsurance).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* Total Pension Bars */}
              <div className="chart-metric">
                <div className="chart-bars-container">
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar chart-bar-base"
                      style={{
                        height: `${(calculations.totalPensionContribution / Math.max(calculations.totalPensionContribution, scenarioCalculations.totalPensionContribution, 1)) * 280}px`
                      }}
                    >
                      <span className="chart-bar-value">
                        £{(calculations.totalPensionContribution / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <span className="chart-bar-label chart-bar-label-base">BASE</span>
                  </div>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar chart-bar-scenario"
                      style={{
                        height: `${(scenarioCalculations.totalPensionContribution / Math.max(calculations.totalPensionContribution, scenarioCalculations.totalPensionContribution, 1)) * 280}px`
                      }}
                    >
                      <span className="chart-bar-value">
                        £{(scenarioCalculations.totalPensionContribution / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <span className="chart-bar-label chart-bar-label-scenario">SCENARIO</span>
                  </div>
                </div>
                <div className="chart-metric-info">
                  <div className="chart-metric-name">Total Pension</div>
                  <div className={`chart-metric-diff ${scenarioCalculations.totalPensionContribution >= calculations.totalPensionContribution ? 'comparison-diff-positive' : 'comparison-diff-negative'}`}>
                    {scenarioCalculations.totalPensionContribution >= calculations.totalPensionContribution ? '↑' : '↓'} £
                    {Math.abs(scenarioCalculations.totalPensionContribution - calculations.totalPensionContribution).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="main-grid">
          {/* Conditional Rendering */}
          {!comparisonMode ? (
            renderInputColumn(inputs, false, (field, value) => setInputs(prev => ({ ...prev, [field]: value })))
          ) : (
            <>
              {renderInputColumn(baseScenario, true, null)}
              {renderInputColumn(scenarioInputs, false, handleScenarioChange)}
            </>
          )}

          {/* Results Section - Only shown in normal mode */}
          {!comparisonMode && (
            <div className="itc-card">
              <h2 className="itc-card-title">Your Take-Home Pay</h2>

              {/* Summary Card */}
              <div className="results-summary">
                <p className="results-main-value">Annual Take-Home</p>
                <p className="results-amount">
                  £{calculations.takeHomePay.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                </p>
                <p className="results-monthly">
                  £{calculations.monthlyTakeHome.toLocaleString('en-GB', { maximumFractionDigits: 0 })} per month
                </p>
              </div>

              {/* Breakdown */}
              <div className="results-breakdown">
                <div className="breakdown-item">
                  <div className="breakdown-item-label">
                    <TrendingUp size={16} color="#10b981" />
                    <span className="breakdown-label-text">Gross Income</span>
                  </div>
                  <div className="breakdown-item-right">
                    <div className="breakdown-value breakdown-value-green">
                      £{calculations.grossIncome.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="breakdown-item-monthly">
                      £{(calculations.grossIncome / 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/mo
                    </div>
                  </div>
                </div>

                {calculations.qualifyingEarnings !== null && (
                  <div className="qualifying-earnings-badge">
                    <Info size={14} />
                    Qualifying Earnings: £{calculations.qualifyingEarnings.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </div>
                )}

                <div className="breakdown-item">
                  <div className="breakdown-item-label">
                    <Info size={16} color="#3b82f6" />
                    <span className="breakdown-label-text">Personal Allowance</span>
                    <div
                      onMouseEnter={() => setShowTooltip('personalAllowance')}
                      onMouseLeave={() => setShowTooltip(null)}
                      className="tooltip-trigger"
                    >
                      <HelpCircle size={14} color="#64748b" />
                      {showTooltip === 'personalAllowance' && <Tooltip content={tooltips.personalAllowance} />}
                    </div>
                  </div>
                  <div className="breakdown-item-right">
                    <div className="breakdown-value breakdown-value-positive">
                      £{calculations.personalAllowance.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="breakdown-item-monthly">
                      £{(calculations.personalAllowance / 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/mo
                    </div>
                  </div>
                </div>

                {/* Benefits in Kind */}
                {inputs.hasBenefits && calculations.totalBenefits > 0 && (
                  <div className="breakdown-item">
                    <div className="breakdown-item-label">
                      <TrendingUp size={16} color="#f59e0b" />
                      <span className="breakdown-label-text">Benefits in Kind</span>
                      <div
                        onMouseEnter={() => setShowTooltip('benefits')}
                        onMouseLeave={() => setShowTooltip(null)}
                        className="tooltip-trigger"
                      >
                        <HelpCircle size={14} color="#64748b" />
                        {showTooltip === 'benefits' && <Tooltip content={tooltips.benefits} />}
                      </div>
                    </div>
                    <div className="breakdown-item-right">
                      <div className="breakdown-value breakdown-value-amber">
                        +£{calculations.totalBenefits.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="breakdown-item-monthly">
                        £{(calculations.totalBenefits / 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/mo
                      </div>
                    </div>
                  </div>
                )}

                {calculations.totalTechSchemeSalarySacrifice > 0 && (
                  <div className="breakdown-item">
                    <div className="breakdown-item-label">
                      <TrendingDown size={16} color="#f59e0b" />
                      <span className="breakdown-label-text">Purchase Schemes</span>
                    </div>
                    <div className="breakdown-item-right">
                      <div className="breakdown-value breakdown-value-negative">
                        -£{calculations.totalTechSchemeSalarySacrifice.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="breakdown-item-monthly">
                        £{(calculations.totalTechSchemeSalarySacrifice / 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/mo
                      </div>
                    </div>
                  </div>
                )}

                <div className="breakdown-item">
                  <div className="breakdown-item-label">
                    <TrendingDown size={16} color="#ef4444" />
                    <span className="breakdown-label-text">Income Tax</span>
                  </div>
                  <div className="breakdown-item-right">
                    <div className="breakdown-value breakdown-value-negative">
                      -£{calculations.incomeTax.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="breakdown-item-monthly">
                      £{(calculations.incomeTax / 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/mo
                    </div>
                  </div>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-item-label">
                    <TrendingDown size={16} color="#ef4444" />
                    <span className="breakdown-label-text">National Insurance</span>
                  </div>
                  <div className="breakdown-item-right">
                    <div className="breakdown-value breakdown-value-negative">
                      -£{calculations.nationalInsurance.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="breakdown-item-monthly">
                      £{(calculations.nationalInsurance / 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/mo
                    </div>
                  </div>
                </div>

                {inputs.hasStudentLoan && calculations.studentLoanRepayment > 0 && (
                  <div className="breakdown-item">
                    <div className="breakdown-item-label">
                      <TrendingDown size={16} color="#ef4444" />
                      <span className="breakdown-label-text">Student Loan</span>
                    </div>
                    <div className="breakdown-item-right">
                      <div className="breakdown-value breakdown-value-negative">
                        -£{calculations.studentLoanRepayment.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="breakdown-item-monthly">
                        £{(calculations.studentLoanRepayment / 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/mo
                      </div>
                    </div>
                  </div>
                )}

                {calculations.employeePension > 0 && (
                  <div className="breakdown-item">
                    <div className="breakdown-item-label">
                      <TrendingDown size={16} color="#3b82f6" />
                      <span className="breakdown-label-text">Pension (Employee)</span>
                    </div>
                    <div className="breakdown-item-right">
                      <div className="breakdown-value breakdown-value-positive">
                        -£{calculations.employeePension.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="breakdown-item-monthly">
                        £{(calculations.employeePension / 12).toLocaleString('en-GB', { maximumFractionDigits: 0 })}/mo
                      </div>
                    </div>
                  </div>
                )}

                <div className="breakdown-divider" />

                <div className="effective-rate-item">
                  <div className="breakdown-item-label">
                    <span className="breakdown-label-text breakdown-label-strong">Effective Tax Rate</span>
                    <div
                      onMouseEnter={() => setShowTooltip('effectiveRate')}
                      onMouseLeave={() => setShowTooltip(null)}
                      className="tooltip-trigger"
                    >
                      <HelpCircle size={14} color="#64748b" />
                      {showTooltip === 'effectiveRate' && <Tooltip content={tooltips.effectiveRate} />}
                    </div>
                  </div>
                  <span className="effective-rate-value">
                    {calculations.effectiveTaxRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pension Breakdown Card */}
        {calculations.totalPensionContribution > 0 && (
          <div className="itc-card">
            <h2 className="itc-card-title">Pension Summary</h2>

            <div className="pension-grid">
              <div className="pension-box">
                <p className="pension-label">Your Contribution</p>
                <p className="pension-value pension-value-employee">
                  £{calculations.employeePension.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                </p>
              </div>

              {inputs.hasEmployerMatch && (
                <div className="pension-box">
                  <p className="pension-label">Employer Match</p>
                  <p className="pension-value pension-value-employer">
                    £{calculations.employerPension.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}

              {inputs.pensionScheme === 'relief_at_source' && calculations.pensionTaxRelief > 0 && (
                <div className="pension-box">
                  <p className="pension-label">Tax Relief</p>
                  <p className="pension-value pension-value-relief">
                    £{calculations.pensionTaxRelief.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}

              <div className="pension-box pension-box-total">
                <p className="pension-label pension-label-total">Total Annual Pension</p>
                <p className="pension-value pension-value-total">
                  £{calculations.totalPensionContribution.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <div className="pension-info-box">
              <div className="pension-info-content">
                <Info size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p className="pension-scheme-title">
                    Pension Scheme: {
                      inputs.pensionScheme === 'salary_sacrifice' ? 'Salary Sacrifice' : 
                      inputs.pensionScheme === 'net_pay' ? 'Net Pay' : 
                      inputs.pensionScheme === 'qualifying_earnings' ? 'Qualifying Earnings (Auto-enrolment)' : 
                      'Relief at Source'
                    }
                  </p>
                  <p className="pension-scheme-description">
                    {inputs.pensionScheme === 'salary_sacrifice' && 
                      'You save on both Income Tax and National Insurance as contributions are deducted from your gross salary before tax.'}
                    {inputs.pensionScheme === 'net_pay' && 
                      'Contributions are deducted from your gross salary before Income Tax, but after National Insurance.'}
                    {inputs.pensionScheme === 'qualifying_earnings' && 
                      'Auto-enrolment scheme: Contributions calculated only on earnings between £6,240 and £50,270. Reduces Income Tax but not National Insurance.'}
                    {inputs.pensionScheme === 'relief_at_source' && 
                      'Your provider claims 20% tax relief from HMRC. Higher rate taxpayers can claim additional relief through Self Assessment.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="itc-info-box">
          <div className="itc-info-box-content">
            <Info size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p className="itc-info-box-text">
                <strong>2025/26 Tax Year:</strong> This calculator uses the latest rates for the 2025/26 tax year (6 April 2025 - 5 April 2026). 
                Personal allowance: £12,570. Basic rate (20%): £12,571-£50,270. Higher rate (40%): £50,271-£125,140. Additional rate (45%): over £125,140. 
                National Insurance: 8% on £12,571-£50,270, then 2% above. All calculations are estimates and should not be considered financial advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeTaxCalculator;
