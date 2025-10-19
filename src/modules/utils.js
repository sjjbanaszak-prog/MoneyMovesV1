// /modules/utils.js

export function simulateGrowth(
  initialPot,
  years,
  monthlyContribution,
  annualReturn
) {
  const data = [];
  let balance = initialPot;
  for (let year = 0; year <= years; year++) {
    data.push({ year, balance: Math.round(balance) });
    balance = (balance + monthlyContribution * 12) * (1 + annualReturn);
  }
  return data;
}

export function getIncomeTax(taxableIncome) {
  const personalAllowance = 12570;
  const basicThreshold = 50270;
  const higherThreshold = 125140;
  let tax = 0;

  if (taxableIncome > personalAllowance) {
    const abovePA = taxableIncome - personalAllowance;
    if (taxableIncome < basicThreshold) tax = abovePA * 0.2;
    else if (taxableIncome <= higherThreshold)
      tax =
        (basicThreshold - personalAllowance) * 0.2 +
        (taxableIncome - basicThreshold) * 0.4;
    else
      tax =
        (basicThreshold - personalAllowance) * 0.2 +
        (higherThreshold - basicThreshold) * 0.4 +
        (taxableIncome - higherThreshold) * 0.45;
  }

  return tax;
}

export function getNI(niIncome) {
  const personalAllowance = 12570;
  const basicThreshold = 50270;
  let ni = 0;

  if (niIncome > personalAllowance) {
    const basicBand = Math.min(niIncome, basicThreshold) - personalAllowance;
    ni += basicBand * 0.08;
    if (niIncome > basicThreshold) {
      ni += (niIncome - basicThreshold) * 0.02;
    }
  }

  return ni;
}
