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
 * Future value of a present sum plus monthly contributions, compounded
 * monthly at `annualRatePct` (real return, %). Simulated month-by-month
 * (rather than a closed-form annuity) because the employee 401(k)/403(b)
 * contribution isn't constant: it stops for the rest of the calendar year
 * once `electiveDeferralLimit` is reached, then resumes each January.
 * Employer money and every other account's monthly contribution keep
 * accruing every month, uncapped.
 */
export function projectBalance({
  presentValue,
  otherMonthly,
  employeeMonthly,
  employerMonthly,
  annualRatePct,
  months,
  electiveDeferralLimit,
  startMonthOfYear = new Date().getMonth() + 1,
}) {
  if (months <= 0) return presentValue;
  const r = annualRatePct / 100 / 12;
  const uncappedMonthly = employerMonthly + otherMonthly;

  let balance = presentValue;
  let yearCumulativeEmployee = employeeMonthly * Math.max(startMonthOfYear - 1, 0);
  let monthOfYear = startMonthOfYear;

  for (let i = 0; i < months; i++) {
    if (i > 0 && monthOfYear === 1) {
      yearCumulativeEmployee = 0;
    }
    const room =
      electiveDeferralLimit > 0
        ? Math.max(electiveDeferralLimit - yearCumulativeEmployee, 0)
        : employeeMonthly;
    const cappedEmployee = Math.min(employeeMonthly, room);
    yearCumulativeEmployee += cappedEmployee;

    balance = balance * (1 + r) + cappedEmployee + uncappedMonthly;
    monthOfYear = monthOfYear === 12 ? 1 : monthOfYear + 1;
  }

  return balance;
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
