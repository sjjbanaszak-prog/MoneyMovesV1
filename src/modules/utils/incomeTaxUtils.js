/**
 * Income Tax Calculation Utilities
 *
 * UK HMRC 2025/26 Tax Year (6 April 2025 - 5 April 2026)
 *
 * This module provides accurate calculations for:
 * - Income Tax (20%, 40%, 45% rates)
 * - National Insurance Contributions (Class 1)
 * - Student Loan Repayments (Plans 1, 2, 4, 5, Postgraduate)
 * - Pension Contributions (all 4 UK schemes)
 * - Take-Home Pay calculations
 *
 * All calculations align with current HMRC guidance.
 */

// ============================================================================
// TAX YEAR CONSTANTS (2025/26)
// ============================================================================

/**
 * Income Tax rates and thresholds for 2025/26
 * @constant
 */
export const TAX_RATES = {
  personalAllowance: 12570,           // Standard personal allowance
  basicRateLimit: 37700,              // £12,571 - £50,270 (basic rate band width)
  higherRateThreshold: 50270,         // Higher rate starts here
  additionalRateThreshold: 125140,    // Additional rate starts here
  basicRate: 0.20,                    // 20% basic rate
  higherRate: 0.40,                   // 40% higher rate
  additionalRate: 0.45                // 45% additional rate
};

/**
 * National Insurance Class 1 rates and thresholds for 2025/26
 * @constant
 */
export const NI_RATES = {
  primaryThreshold: 12570,            // NI starts being paid here
  upperEarningsLimit: 50270,          // Main rate applies up to here
  mainRate: 0.08,                     // 8% on earnings £12,571 - £50,270
  additionalRate: 0.02                // 2% on earnings above £50,270
};

/**
 * Student Loan repayment thresholds and rates for 2025/26
 * @constant
 */
export const STUDENT_LOAN_THRESHOLDS = {
  plan1: { threshold: 26065, rate: 0.09 },        // Plan 1 (before Sept 2012)
  plan2: { threshold: 28470, rate: 0.09 },        // Plan 2 (Sept 2012 - July 2023)
  plan4: { threshold: 32745, rate: 0.09 },        // Plan 4 (Scotland)
  plan5: { threshold: 25000, rate: 0.09 },        // Plan 5 (After Aug 2023)
  postgraduate: { threshold: 21000, rate: 0.06 }  // Postgraduate loan
};

/**
 * Qualifying Earnings limits for auto-enrolment pensions
 * @constant
 */
export const QUALIFYING_EARNINGS = {
  lowerLimit: 6240,     // Lower earnings threshold
  upperLimit: 50270     // Upper earnings threshold
};

// ============================================================================
// PER TAX YEAR RATE TABLES (2022/23 – 2026/27)
// ============================================================================

/**
 * Rate tables keyed by tax year string (e.g. '2026/27').
 *
 * NI notes:
 *  2022/23 — PT raised from £9,880 to £12,570 on 6 Jul 2022; HMRC annualised PT = £11,908.
 *            Main rate was 13.25% (6 Apr–5 Nov) then 12% (6 Nov–5 Apr); blended ≈ 12.73%.
 *            Additional rate was 3.25% then 2%; blended ≈ 2.73%.
 *  2023/24 — Main rate was 12% (6 Apr–5 Jan 2024) then cut to 10% (6 Jan–5 Apr 2024); blended ≈ 11.5%.
 *  2024/25 onwards — 8% employee main rate (from 6 April 2024).
 *
 * Student loan Plan 5 was introduced August 2023 (not applicable for 2022/23).
 */
export const TAX_YEAR_DATA = {
  '2022/23': {
    taxRates: {
      personalAllowance:       12570,
      basicRateLimit:          37700,
      higherRateThreshold:     50270,
      additionalRateThreshold: 150000, // £150k threshold, before April 2023 reduction
      basicRate:    0.20,
      higherRate:   0.40,
      additionalRate: 0.45,
    },
    niRates: {
      // PT raised from £9,880 to £12,570 on 6 Jul 2022; HMRC annualised equivalent = £11,908
      primaryThreshold:   11908,
      upperEarningsLimit: 50270,
      // 13.25% (213 days) then 12% (150 days) → blended 12.73%
      mainRate:           0.1273,
      // 3.25% (213 days) then 2% (150 days) → blended 2.73%
      additionalRate:     0.0273,
    },
    studentLoanThresholds: {
      plan1:        { threshold: 20195, rate: 0.09 },
      plan2:        { threshold: 27295, rate: 0.09 },
      plan4:        { threshold: 25375, rate: 0.09 },
      plan5:        null, // not yet introduced
      postgraduate: { threshold: 21000, rate: 0.06 },
    },
    qualifyingEarnings: { lowerLimit: 6240, upperLimit: 50270 },
  },
  '2023/24': {
    taxRates: {
      personalAllowance:       12570,
      basicRateLimit:          37700,
      higherRateThreshold:     50270,
      additionalRateThreshold: 125140, // reduced from £150k
      basicRate:    0.20,
      higherRate:   0.40,
      additionalRate: 0.45,
    },
    niRates: {
      primaryThreshold:   12570,
      upperEarningsLimit: 50270,
      // 12% (275 days, Apr–Dec 2023) then 10% (90 days, Jan–Mar 2024) → blended 11.5%
      mainRate:           0.115,
      additionalRate:     0.02,
    },
    studentLoanThresholds: {
      plan1:        { threshold: 22015, rate: 0.09 },
      plan2:        { threshold: 27295, rate: 0.09 },
      plan4:        { threshold: 27660, rate: 0.09 },
      plan5:        { threshold: 25000, rate: 0.09 }, // introduced Aug 2023
      postgraduate: { threshold: 21000, rate: 0.06 },
    },
    qualifyingEarnings: { lowerLimit: 6240, upperLimit: 50270 },
  },
  '2024/25': {
    taxRates: {
      personalAllowance:       12570,
      basicRateLimit:          37700,
      higherRateThreshold:     50270,
      additionalRateThreshold: 125140,
      basicRate:    0.20,
      higherRate:   0.40,
      additionalRate: 0.45,
    },
    niRates: {
      primaryThreshold:   12570,
      upperEarningsLimit: 50270,
      mainRate:           0.08, // cut from 10% to 8% April 2024
      additionalRate:     0.02,
    },
    studentLoanThresholds: {
      plan1:        { threshold: 24990, rate: 0.09 },
      plan2:        { threshold: 27295, rate: 0.09 },
      plan4:        { threshold: 31395, rate: 0.09 },
      plan5:        { threshold: 25000, rate: 0.09 },
      postgraduate: { threshold: 21000, rate: 0.06 },
    },
    qualifyingEarnings: { lowerLimit: 6240, upperLimit: 50270 },
  },
  '2025/26': {
    taxRates: {
      personalAllowance:       12570,
      basicRateLimit:          37700,
      higherRateThreshold:     50270,
      additionalRateThreshold: 125140,
      basicRate:    0.20,
      higherRate:   0.40,
      additionalRate: 0.45,
    },
    niRates: {
      primaryThreshold:   12570,
      upperEarningsLimit: 50270,
      mainRate:           0.08,
      additionalRate:     0.02,
    },
    studentLoanThresholds: {
      plan1:        { threshold: 26065, rate: 0.09 },
      plan2:        { threshold: 28470, rate: 0.09 },
      plan4:        { threshold: 32745, rate: 0.09 },
      plan5:        { threshold: 25000, rate: 0.09 },
      postgraduate: { threshold: 21000, rate: 0.06 },
    },
    qualifyingEarnings: { lowerLimit: 6240, upperLimit: 50270 },
  },
  '2026/27': {
    taxRates: {
      personalAllowance:       12570,
      basicRateLimit:          37700,
      higherRateThreshold:     50270,
      additionalRateThreshold: 125140,
      basicRate:    0.20,
      higherRate:   0.40,
      additionalRate: 0.45,
    },
    niRates: {
      primaryThreshold:   12570,
      upperEarningsLimit: 50270,
      mainRate:           0.08,
      additionalRate:     0.02,
    },
    studentLoanThresholds: {
      plan1:        { threshold: 26065, rate: 0.09 },
      plan2:        { threshold: 28470, rate: 0.09 },
      plan4:        { threshold: 32745, rate: 0.09 },
      plan5:        { threshold: 25000, rate: 0.09 },
      postgraduate: { threshold: 21000, rate: 0.06 },
    },
    qualifyingEarnings: { lowerLimit: 6240, upperLimit: 50270 },
  },
};

/**
 * Benefits in Kind constants for 2025/26
 * @constant
 */
export const BENEFITS_IN_KIND = {
  fuelBenefit: 27800,  // Fixed fuel benefit charge for 2025/26
  vanBenefit: 3960,    // Van benefit for 2025/26

  // Company car CO2 emission bands (g/km) and corresponding percentages
  companyCar: {
    electric: 0.03,      // 0 g/km CO2: 3%
    hybrid: {
      range130Plus: 0.03,   // 130+ miles: 3%
      range70to129: 0.06,   // 70-129 miles: 6%
      range40to69: 0.09,    // 40-69 miles: 9%
      range30to39: 0.13,    // 30-39 miles: 13%
      rangeBelow30: 0.15    // Below 30 miles: 15%
    },
    petrolDiesel: {
      base: 0.16,           // 51-54 g/km: 16%
      increment: 0.01,      // +1% per 5 g/km
      maxPercentage: 0.37   // Maximum 37% (170+ g/km)
    }
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse UK tax code to extract personal allowance
 *
 * Common tax codes:
 * - 1257L: Standard code (£12,570 allowance)
 * - BR: Basic rate (no allowance, all income taxed at 20%)
 * - K codes: Negative allowance (e.g., company benefits)
 * - 0T: No allowance
 *
 * @param {string} code - UK tax code (e.g., "1257L", "BR", "K100")
 * @returns {Object} Parsed tax code details
 * @returns {number} returns.allowance - Personal allowance amount
 * @returns {boolean} [returns.isBasicRate] - True if BR code
 * @returns {number} [returns.extraIncome] - Extra taxable income for K codes
 *
 * @example
 * parseTaxCode("1257L")  // { allowance: 12570 }
 * parseTaxCode("BR")     // { allowance: 0, isBasicRate: true }
 * parseTaxCode("K100")   // { allowance: 0, extraIncome: 1000 }
 */
export const parseTaxCode = (code) => {
  if (!code || typeof code !== 'string') {
    return { allowance: 12570 };
  }

  const cleanCode = code.trim().toUpperCase();
  const numericPart = parseInt(cleanCode.replace(/[^0-9]/g, '')) || 0;
  const letterPart = cleanCode.replace(/[0-9]/g, '');

  // BR code: Basic Rate - no allowance, all income taxed at 20%
  if (letterPart === 'BR') return { allowance: 0, isBasicRate: true };

  // K code: Indicates negative allowance (untaxed income to collect).
  // K always appears as the first character; suffix letters (e.g. X = week 1/month 1 basis)
  // must not prevent recognition — check the code starts with K, not that letterPart === 'K'.
  if (cleanCode.charAt(0) === 'K') return { allowance: 0, extraIncome: numericPart * 10 };

  // 0T code: No allowance
  if (cleanCode.includes('0T')) return { allowance: 0 };

  // Standard code: multiply numeric part by 10
  const allowance = numericPart > 0 ? numericPart * 10 : 12570;
  return { allowance };
};

/**
 * Calculate personal allowance with tapering for high earners
 *
 * HMRC Rule: Personal allowance reduces by £1 for every £2 earned over £100,000
 * Allowance reaches £0 at £125,140 income
 *
 * @param {number} income - Annual gross income
 * @param {string} taxCode - UK tax code
 * @returns {number} Adjusted personal allowance
 *
 * @example
 * calculatePersonalAllowance(50000, "1257L")   // 12570 (full allowance)
 * calculatePersonalAllowance(110000, "1257L")  // 7570 (reduced by £5,000)
 * calculatePersonalAllowance(130000, "1257L")  // 0 (fully tapered)
 */
export const calculatePersonalAllowance = (income, taxCode) => {
  const parsedCode = parseTaxCode(taxCode);
  const { allowance, isBasicRate, extraIncome } = parsedCode;

  // BR code or K code: no personal allowance
  if (isBasicRate) return 0;
  if (extraIncome) return 0;

  const validIncome = parseFloat(income) || 0;
  const validAllowance = parseFloat(allowance) || 0;

  // High earner taper: £1 reduction for every £2 over £100k
  if (validIncome > 100000) {
    const reduction = Math.floor((validIncome - 100000) / 2);
    return Math.max(0, validAllowance - reduction);
  }

  return validAllowance;
};

/**
 * Calculate qualifying earnings for auto-enrolment pensions
 *
 * HMRC Rule: Only earnings between £6,240 and £50,270 count as qualifying earnings
 *
 * @param {number} grossIncome - Annual gross income
 * @returns {number} Qualifying earnings amount
 *
 * @example
 * calculateQualifyingEarnings(30000)  // 23760 (£30,000 - £6,240)
 * calculateQualifyingEarnings(60000)  // 44030 (£50,270 - £6,240)
 * calculateQualifyingEarnings(5000)   // 0 (below lower limit)
 */
export const calculateQualifyingEarnings = (grossIncome) => {
  const cappedIncome = Math.min(
    Math.max(grossIncome, QUALIFYING_EARNINGS.lowerLimit),
    QUALIFYING_EARNINGS.upperLimit
  );
  return Math.max(0, cappedIncome - QUALIFYING_EARNINGS.lowerLimit);
};

/**
 * Calculate company car benefit in kind value
 *
 * Based on HMRC rules for 2025/26:
 * - Electric (0 g/km): 3%
 * - Hybrid (1-50 g/km): 3-15% based on electric range
 * - Petrol/Diesel (51+ g/km): 16-37% based on CO2 emissions
 *
 * @param {Object} carDetails - Company car details
 * @param {number} carDetails.p11dValue - List price of the car
 * @param {string} carDetails.fuelType - "electric", "hybrid", "petrol", or "diesel"
 * @param {number} [carDetails.co2Emissions=0] - CO2 emissions in g/km (rounded down to nearest 5)
 * @param {number} [carDetails.electricRange=0] - Electric range in miles (for hybrids only)
 * @param {boolean} [carDetails.hasFuelBenefit=false] - Employer provides fuel for private use
 *
 * @returns {Object} Car benefit calculations
 * @returns {number} returns.carBenefit - Annual car benefit value
 * @returns {number} returns.fuelBenefit - Annual fuel benefit value (if applicable)
 * @returns {number} returns.totalCarBenefit - Total annual benefit (car + fuel)
 * @returns {number} returns.bikPercentage - BIK percentage used
 *
 * @example
 * calculateCompanyCarBenefit({ p11dValue: 35000, fuelType: "electric" })
 * // { carBenefit: 1050, fuelBenefit: 0, totalCarBenefit: 1050, bikPercentage: 3 }
 */
export const calculateCompanyCarBenefit = (carDetails) => {
  if (!carDetails || !carDetails.p11dValue || carDetails.p11dValue <= 0) {
    return { carBenefit: 0, fuelBenefit: 0, totalCarBenefit: 0, bikPercentage: 0 };
  }

  const { p11dValue, fuelType, co2Emissions = 0, electricRange = 0, hasFuelBenefit = false } = carDetails;
  let bikPercentage = 0;

  // Round CO2 down to nearest 5 g/km
  const roundedCO2 = Math.floor(co2Emissions / 5) * 5;

  // Determine BIK percentage based on fuel type and emissions
  if (fuelType === 'electric' || roundedCO2 === 0) {
    // Pure electric: 3%
    bikPercentage = BENEFITS_IN_KIND.companyCar.electric;
  } else if (fuelType === 'hybrid' && roundedCO2 >= 1 && roundedCO2 <= 50) {
    // Hybrid: 3-15% based on electric range
    if (electricRange >= 130) {
      bikPercentage = BENEFITS_IN_KIND.companyCar.hybrid.range130Plus;
    } else if (electricRange >= 70) {
      bikPercentage = BENEFITS_IN_KIND.companyCar.hybrid.range70to129;
    } else if (electricRange >= 40) {
      bikPercentage = BENEFITS_IN_KIND.companyCar.hybrid.range40to69;
    } else if (electricRange >= 30) {
      bikPercentage = BENEFITS_IN_KIND.companyCar.hybrid.range30to39;
    } else {
      bikPercentage = BENEFITS_IN_KIND.companyCar.hybrid.rangeBelow30;
    }
  } else if (roundedCO2 >= 51) {
    // Petrol/Diesel: 16-37% based on CO2
    const { base, increment, maxPercentage } = BENEFITS_IN_KIND.companyCar.petrolDiesel;

    // Calculate percentage: 16% at 51-54 g/km, +1% per 5 g/km thereafter
    const increments = Math.floor((roundedCO2 - 51) / 5);
    bikPercentage = Math.min(base + (increments * increment), maxPercentage);
  } else {
    // Default to base rate if emissions are between 1-50 but not hybrid
    bikPercentage = BENEFITS_IN_KIND.companyCar.petrolDiesel.base;
  }

  // Calculate car benefit
  const carBenefit = p11dValue * bikPercentage;

  // Calculate fuel benefit (if applicable)
  const fuelBenefit = hasFuelBenefit ? BENEFITS_IN_KIND.fuelBenefit * bikPercentage : 0;

  return {
    carBenefit: Math.round(carBenefit),
    fuelBenefit: Math.round(fuelBenefit),
    totalCarBenefit: Math.round(carBenefit + fuelBenefit),
    bikPercentage: Math.round(bikPercentage * 100) // Return as percentage (e.g., 3, 16, 37)
  };
};

/**
 * Calculate total benefits in kind value from array of benefits
 *
 * Aggregates all employer-provided benefits that are subject to income tax
 *
 * @param {Array} benefitsList - Array of benefit objects
 * @param {string} benefitsList[].type - Benefit type (companyCar, privateMedical, etc.)
 * @param {number|Object} benefitsList[].value - Benefit value or object (for company car)
 *
 * @returns {Object} Benefits calculation breakdown
 * @returns {number} returns.totalBenefitsValue - Total annual benefits value (added to taxable income)
 * @returns {Array} returns.benefitItems - Array of calculated benefit items
 *
 * @example
 * calculateBenefitsInKind([
 *   { type: 'companyCar', value: { p11dValue: 35000, fuelType: "electric" } },
 *   { type: 'privateMedical', value: 1200 },
 *   { type: 'technologyScheme', value: 1000, isSalarySacrifice: true }
 * ])
 */
export const calculateBenefitsInKind = (benefitsList = []) => {
  if (!Array.isArray(benefitsList)) {
    return { totalBenefitsValue: 0, totalBenefitsSalarySacrifice: 0, totalTechSchemeSalarySacrifice: 0, benefitItems: [] };
  }

  const benefitItems = [];
  let totalBenefitsValue = 0;  // Traditional BIK (not salary sacrifice)
  let totalBenefitsSalarySacrifice = 0;  // BIK provided via salary sacrifice (still taxable via K code)
  let totalTechSchemeSalarySacrifice = 0;  // Technology scheme (pure salary sacrifice, not taxable)

  benefitsList.forEach((benefit) => {
    let calculatedValue = 0;
    let isSalarySacrifice = false;

    switch (benefit.type) {
      case 'companyCar':
        if (benefit.value && benefit.value.p11dValue > 0) {
          const carResult = calculateCompanyCarBenefit(benefit.value);
          calculatedValue = carResult.totalCarBenefit;
          // Check if this benefit is provided via salary sacrifice
          isSalarySacrifice = benefit.isSalarySacrifice || false;

          if (isSalarySacrifice) {
            totalBenefitsSalarySacrifice += calculatedValue;
          }

          benefitItems.push({
            type: 'companyCar',
            name: 'Company Car',
            value: calculatedValue,
            details: carResult,
            isSalarySacrifice: isSalarySacrifice
          });
        }
        break;

      case 'technologyScheme':
        // Technology scheme: Pure salary sacrifice (not a BIK)
        // Reduces gross income, not subject to BIK tax
        calculatedValue = parseFloat(benefit.value) || 0;
        isSalarySacrifice = true;
        totalTechSchemeSalarySacrifice += calculatedValue;
        benefitItems.push({
          type: 'technologyScheme',
          name: 'Technology Scheme',
          value: calculatedValue,
          isSalarySacrifice: true,
          description: 'Salary sacrifice - reduces gross pay'
        });
        break;

      case 'privateMedical':
      case 'dentalInsurance':
      case 'travelInsurance':
      case 'lifeAssurance':
      case 'incomeProtection':
      case 'criticalIllness':
      case 'gymMembership':
      case 'otherBenefits':
        calculatedValue = parseFloat(benefit.value) || 0;
        // Check if this benefit is provided via salary sacrifice
        isSalarySacrifice = benefit.isSalarySacrifice || false;
        const nameMap = {
          privateMedical: 'Private Medical Insurance',
          dentalInsurance: 'Dental Insurance',
          travelInsurance: 'Travel Insurance',
          lifeAssurance: 'Life Assurance',
          incomeProtection: 'Income Protection',
          criticalIllness: 'Critical Illness Cover',
          gymMembership: 'Gym Membership',
          otherBenefits: 'Other Benefits'
        };

        if (isSalarySacrifice) {
          totalBenefitsSalarySacrifice += calculatedValue;
        }

        benefitItems.push({
          type: benefit.type,
          name: nameMap[benefit.type],
          value: calculatedValue,
          isSalarySacrifice: isSalarySacrifice
        });
        break;

      default:
        break;
    }

    // Only add to taxable BIK if not salary sacrifice
    if (!isSalarySacrifice && calculatedValue > 0) {
      totalBenefitsValue += calculatedValue;
    }
  });

  return {
    totalBenefitsValue: Math.round(totalBenefitsValue),  // Traditional BIK (added to taxable income only)
    totalBenefitsSalarySacrifice: Math.round(totalBenefitsSalarySacrifice),  // Salary sacrifice BIK (reduces NIable, but value still taxable)
    totalTechSchemeSalarySacrifice: Math.round(totalTechSchemeSalarySacrifice),  // Pure salary sacrifice (not taxable)
    benefitItems
  };
};

// ============================================================================
// CORE CALCULATION FUNCTION
// ============================================================================

/**
 * Perform comprehensive income tax and take-home pay calculations
 *
 * Handles all UK pension schemes:
 * 1. Salary Sacrifice: Reduces gross pay before tax and NI (most tax-efficient)
 * 2. Net Pay: Deducted after NI but before tax (no NI savings)
 * 3. Relief at Source: You pay net, provider claims 20% from HMRC
 * 4. Qualifying Earnings: Auto-enrolment, contributions on £6,240-£50,270 only
 *
 * @param {Object} inputData - Income and deduction parameters
 * @param {number} inputData.annualIncome - Base annual salary
 * @param {number} [inputData.bonusAmount=0] - Annual bonus/commission
 * @param {boolean} [inputData.hasBonusCommission=false] - Include bonus in calculations
 * @param {string} [inputData.taxCode="1257L"] - UK tax code
 * @param {boolean} [inputData.hasStudentLoan=false] - Has student loan
 * @param {string} [inputData.studentLoanPlan="plan2"] - Student loan plan type
 * @param {number} [inputData.pensionContribution=0] - Pension contribution (% or £)
 * @param {string} [inputData.pensionType="percentage"] - "percentage" or "amount"
 * @param {string} [inputData.pensionScheme="salary_sacrifice"] - Pension scheme type
 * @param {number} [inputData.employerMatch=0] - Employer match percentage
 * @param {boolean} [inputData.hasEmployerMatch=false] - Employer matches contributions
 * @param {Object} [inputData.benefits={}] - Employer benefits in kind
 * @param {Object} [inputData.benefits.companyCar] - Company car details (P11D value, fuel type, CO2, etc.)
 * @param {number} [inputData.benefits.privateMedical=0] - Private medical insurance annual premium
 * @param {number} [inputData.benefits.dentalInsurance=0] - Dental insurance annual premium
 * @param {number} [inputData.benefits.lifeAssurance=0] - Life assurance annual premium
 * @param {number} [inputData.benefits.gymMembership=0] - Gym membership annual cost
 * @param {number} [inputData.benefits.otherBenefits=0] - Other taxable benefits annual value
 *
 * @returns {Object} Comprehensive calculation results
 * @returns {number} returns.grossIncome - Total income before deductions
 * @returns {number} returns.taxableIncome - Income subject to tax (includes benefits in kind)
 * @returns {number} returns.personalAllowance - Tax-free allowance
 * @returns {number} returns.incomeTax - Annual income tax
 * @returns {number} returns.nationalInsurance - Annual NI contributions
 * @returns {number} returns.studentLoanRepayment - Annual student loan repayment
 * @returns {number} returns.employeePension - Employee pension contribution
 * @returns {number} returns.employerPension - Employer pension contribution
 * @returns {number} returns.pensionTaxRelief - Tax relief on pension (relief at source)
 * @returns {number} returns.totalPensionContribution - Total pension (employee + employer + relief)
 * @returns {number} returns.totalDeductions - Total deductions from gross (tax + NI + student loan + pension)
 * @returns {number} returns.totalTaxes - Total taxes only (income tax + NI + student loan, excludes pension)
 * @returns {number} returns.takeHomePay - Annual take-home pay
 * @returns {number} returns.monthlyTakeHome - Monthly take-home pay
 * @returns {number} returns.effectiveTaxRate - Effective tax rate as percentage (tax + NI + student loan only, excludes pension)
 * @returns {number|null} returns.qualifyingEarnings - Qualifying earnings (auto-enrolment only)
 * @returns {number} returns.totalBenefits - Total annual benefits in kind value
 * @returns {Object} returns.benefitsBreakdown - Individual benefit values breakdown
 *
 * @example
 * calculateIncomeTax({
 *   annualIncome: 45000,
 *   taxCode: "1257L",
 *   pensionContribution: 5,
 *   pensionType: "percentage",
 *   pensionScheme: "salary_sacrifice",
 *   employerMatch: 3,
 *   hasEmployerMatch: true
 * })
 * // Returns full calculation breakdown
 */
export const calculateIncomeTax = (inputData) => {
  // Resolve tax year rate tables
  const taxYear = inputData.taxYear || '2026/27';
  const yearData = TAX_YEAR_DATA[taxYear] || TAX_YEAR_DATA['2026/27'];
  const TR  = yearData.taxRates;
  const NIR = yearData.niRates;
  const SLT = yearData.studentLoanThresholds;
  const QE  = yearData.qualifyingEarnings;

  // Parse and validate inputs
  const annualIncome = parseFloat(inputData.annualIncome) || 0;
  const bonusAmount = parseFloat(inputData.bonusAmount) || 0;
  const pensionContribution = parseFloat(inputData.pensionContribution) || 0;
  const employerMatch = parseFloat(inputData.employerMatch) || 0;

  // Calculate gross income (before any salary sacrifice)
  const grossIncome = annualIncome + (inputData.hasBonusCommission ? bonusAmount : 0);

  // ============================================================================
  // BENEFITS IN KIND CALCULATION
  // ============================================================================

  // Calculate total benefits in kind
  const benefitsResult = calculateBenefitsInKind(inputData.benefitsList || []);
  const totalBenefits = benefitsResult.totalBenefitsValue;  // Traditional BIK (taxable, doesn't affect NI)
  const totalBenefitsSalarySacrifice = benefitsResult.totalBenefitsSalarySacrifice;  // Salary sacrifice BIK (reduces NI, still taxable)
  const totalTechSchemeSalarySacrifice = benefitsResult.totalTechSchemeSalarySacrifice;  // Pure salary sacrifice (not taxable)
  const benefitsBreakdown = benefitsResult.benefitItems;

  // ============================================================================
  // PENSION CALCULATIONS
  // ============================================================================

  // IMPORTANT: Pension percentages are calculated on ORIGINAL gross income
  // Technology scheme salary sacrifice is applied to tax/NI calculations only
  // Both pension and tech scheme are then deducted together from taxable income

  // Pension contributions are calculated on base salary only (excluding bonus/commission)
  const salaryForPension = annualIncome;

  // Calculate qualifying earnings for auto-enrolment pensions
  // Use base salary only (excluding bonus) for qualifying earnings calculation
  let qualifyingEarnings = salaryForPension;
  if (inputData.pensionScheme === 'qualifying_earnings') {
    const cappedQE = Math.min(Math.max(salaryForPension, QE.lowerLimit), QE.upperLimit);
    qualifyingEarnings = Math.max(0, cappedQE - QE.lowerLimit);
  }

  // Calculate employee pension contribution
  // ALWAYS calculated on base salary only (excluding bonus/commission)
  let employeePension = 0;
  if (inputData.pensionScheme === 'qualifying_earnings') {
    // Auto-enrolment: contribution based on qualifying earnings
    if (inputData.pensionType === 'percentage') {
      employeePension = (qualifyingEarnings * pensionContribution) / 100;
    } else {
      employeePension = pensionContribution;
    }
  } else {
    // Other schemes: contribution based on base salary only
    if (inputData.pensionType === 'percentage') {
      employeePension = (salaryForPension * pensionContribution) / 100;
    } else {
      employeePension = pensionContribution;
    }
  }

  // Calculate employer pension contribution
  // Also based on base salary only (excluding bonus/commission)
  let employerPension = 0;
  if (inputData.hasEmployerMatch) {
    if (inputData.pensionScheme === 'qualifying_earnings') {
      employerPension = (qualifyingEarnings * employerMatch) / 100;
    } else {
      employerPension = (salaryForPension * employerMatch) / 100;
    }
  }

  // ============================================================================
  // TAXABLE INCOME CALCULATION
  // ============================================================================

  // Start with ORIGINAL gross income
  let taxableIncome = grossIncome;
  let niableIncome = grossIncome;

  // 1. Apply technology scheme salary sacrifice (reduces both taxable and NIable income)
  taxableIncome -= totalTechSchemeSalarySacrifice;
  niableIncome -= totalTechSchemeSalarySacrifice;

  // 2. Apply salary sacrifice BIK (reduces NIable income only, value added back to taxable later)
  niableIncome -= totalBenefitsSalarySacrifice;

  // 3. Apply pension deductions based on scheme type
  // Pension salary sacrifice: reduces both taxable and NIable income
  if (inputData.pensionScheme === 'salary_sacrifice') {
    taxableIncome -= employeePension;
    niableIncome -= employeePension;
  }
  // Net pay and qualifying earnings: reduces taxable income only
  else if (inputData.pensionScheme === 'net_pay' || inputData.pensionScheme === 'qualifying_earnings') {
    taxableIncome -= employeePension;
  }
  // Relief at source: no reduction to taxable income (tax relief claimed separately)

  // 4. Add traditional BIK to taxable income (not salary sacrifice)
  taxableIncome += totalBenefits;

  // 5. Add salary sacrifice BIK to taxable income (value is still taxable)
  taxableIncome += totalBenefitsSalarySacrifice;

  // 6. Parse tax code to get any extra income (K codes)
  const parsedTaxCode = parseTaxCode(inputData.taxCode);
  const kCodeExtraIncome = parsedTaxCode.extraIncome || 0;

  // 7. Add K code extra income to taxable income
  // K codes represent untaxed income (like benefits) that HMRC wants to collect tax on
  taxableIncome += kCodeExtraIncome;

  // Determine income for personal allowance calculation
  // Benefits count towards income for personal allowance taper
  const incomeForAllowance = (inputData.pensionScheme === 'salary_sacrifice' ||
                               inputData.pensionScheme === 'net_pay' ||
                               inputData.pensionScheme === 'qualifying_earnings')
                              ? taxableIncome
                              : grossIncome + totalBenefits + totalBenefitsSalarySacrifice + kCodeExtraIncome;

  // Calculate personal allowance (with high earner taper)
  const personalAllowance = calculatePersonalAllowance(incomeForAllowance, inputData.taxCode);

  // Calculate taxable income after personal allowance
  const taxableAfterAllowance = Math.max(0, taxableIncome - personalAllowance);

  // ============================================================================
  // INCOME TAX CALCULATION
  // ============================================================================

  let incomeTax = 0;
  if (taxableAfterAllowance > 0) {
    // Basic rate band
    if (taxableAfterAllowance <= TR.basicRateLimit) {
      incomeTax = taxableAfterAllowance * TR.basicRate;
    }
    // Higher rate band
    else if (taxableAfterAllowance <= (TR.additionalRateThreshold - personalAllowance)) {
      const basicTax = TR.basicRateLimit * TR.basicRate;
      const higherTax = (taxableAfterAllowance - TR.basicRateLimit) * TR.higherRate;
      incomeTax = basicTax + higherTax;
    }
    // Additional rate band
    else {
      const basicTax = TR.basicRateLimit * TR.basicRate;
      const higherTax = ((TR.additionalRateThreshold - personalAllowance) - TR.basicRateLimit) * TR.higherRate;
      const additionalTax = (taxableAfterAllowance - (TR.additionalRateThreshold - personalAllowance)) * TR.additionalRate;
      incomeTax = basicTax + higherTax + additionalTax;
    }
  }

  // ============================================================================
  // NATIONAL INSURANCE CALCULATION
  // ============================================================================

  let nationalInsurance = 0;
  if (niableIncome > NIR.primaryThreshold) {
    if (niableIncome <= NIR.upperEarningsLimit) {
      nationalInsurance = (niableIncome - NIR.primaryThreshold) * NIR.mainRate;
    } else {
      const mainNI = (NIR.upperEarningsLimit - NIR.primaryThreshold) * NIR.mainRate;
      const additionalNI = (niableIncome - NIR.upperEarningsLimit) * NIR.additionalRate;
      nationalInsurance = mainNI + additionalNI;
    }
  }

  // ============================================================================
  // STUDENT LOAN REPAYMENT CALCULATION
  // ============================================================================

  let studentLoanRepayment = 0;
  if (inputData.hasStudentLoan && grossIncome > 0) {
    const plan = SLT[inputData.studentLoanPlan];
    if (plan && grossIncome > plan.threshold) {
      studentLoanRepayment = (grossIncome - plan.threshold) * plan.rate;
    }
  }

  // ============================================================================
  // PENSION TAX RELIEF (Relief at Source only)
  // ============================================================================

  let pensionTaxRelief = 0;
  if (inputData.pensionScheme === 'relief_at_source' && employeePension > 0) {
    // Basic rate relief: 20% for all
    pensionTaxRelief = employeePension * 0.20;

    // Higher rate relief: additional 20% if higher rate taxpayer
    if (taxableAfterAllowance > TR.basicRateLimit) {
      const higherRateAmount = Math.min(employeePension, taxableAfterAllowance - TR.basicRateLimit);
      pensionTaxRelief += higherRateAmount * 0.20;

      // Additional rate relief: additional 5% if additional rate taxpayer
      if (taxableAfterAllowance > (TR.additionalRateThreshold - personalAllowance)) {
        const additionalRateAmount = Math.min(employeePension, taxableAfterAllowance - (TR.additionalRateThreshold - personalAllowance));
        pensionTaxRelief += additionalRateAmount * 0.05;
      }
    }
  }

  // ============================================================================
  // FINAL CALCULATIONS
  // ============================================================================

  const totalPensionContribution = employeePension + employerPension + pensionTaxRelief;
  const totalDeductions = incomeTax + nationalInsurance + studentLoanRepayment + employeePension + totalTechSchemeSalarySacrifice + totalBenefitsSalarySacrifice;
  const takeHomePay = grossIncome - totalDeductions;

  // Total taxes: only includes actual taxes (income tax, NI, student loan)
  // Does NOT include pension contributions or purchase schemes (which are salary sacrifice/savings)
  const totalTaxes = incomeTax + nationalInsurance + studentLoanRepayment;
  const effectiveTaxRate = grossIncome > 0 ? (totalTaxes / grossIncome) * 100 : 0;

  return {
    grossIncome,
    taxableIncome,
    personalAllowance,
    incomeTax,
    nationalInsurance,
    studentLoanRepayment,
    employeePension,
    employerPension,
    pensionTaxRelief,
    totalPensionContribution,
    totalDeductions,      // Total deductions from gross (includes pension + purchase schemes)
    totalTaxes,           // Total taxes only (excludes pension and purchase schemes)
    takeHomePay,
    effectiveTaxRate,
    monthlyTakeHome: takeHomePay / 12,
    qualifyingEarnings: inputData.pensionScheme === 'qualifying_earnings' ? qualifyingEarnings : null,
    totalBenefits: totalBenefits + totalBenefitsSalarySacrifice,  // Total BIK for display (traditional + salary sacrifice)
    totalTechSchemeSalarySacrifice,  // Technology scheme salary sacrifice (shown in Purchase Schemes)
    kCodeExtraIncome,  // K code extra income added to taxable income
    benefitsBreakdown     // Individual benefit values
  };
};

// Export performCalculations as an alias for backwards compatibility
export const performCalculations = calculateIncomeTax;
