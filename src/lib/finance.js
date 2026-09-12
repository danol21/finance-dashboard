export function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// 401(k)/403(b) accounts split employee vs. employer money — the elective-deferral
// limit only applies to the employee's own pre-tax + Roth contributions.
export function isElectiveDeferralType(type) {
  return type === "401(k)" || type === "403(b)";
}

export function effectiveMonthly(account) {
  if (isElectiveDeferralType(account.type)) {
    return num(account.employeeMonthly) + num(account.employerMonthly);
  }
  return num(account.monthly);
}

/**
 * Future value of a present sum plus a stream of monthly contributions,
 * compounded monthly at `annualRatePct` (real return, %).
 */
export function projectBalance({
  presentValue,
  monthlyContribution,
  annualRatePct,
  months,
}) {
  if (months <= 0) return presentValue;
  const r = annualRatePct / 100 / 12;
  if (r === 0) {
    return presentValue + monthlyContribution * months;
  }
  const growth = Math.pow(1 + r, months);
  const fvPresent = presentValue * growth;
  const fvContributions = monthlyContribution * ((growth - 1) / r);
  return fvPresent + fvContributions;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatCurrencyPrecise(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}
