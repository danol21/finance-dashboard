export function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// 401(k)/403(b) accounts split employee vs. employer money — the elective-deferral
// limit only applies to the employee's own pre-tax + Roth contributions.
export function isElectiveDeferralType(type) {
  return type === "401(k)" || type === "403(b)";
}

// An account can be funded by irregular lump sums (e.g. a Backdoor Roth IRA
// filled from quarterly bonuses) instead of a steady monthly amount.
export function isLumpSumMode(account) {
  return account.contributionMode === "lumpSum";
}

// Sum of an account's logged lump-sum deposits dated within `year`.
export function lumpSumTotalForYear(account, year = new Date().getFullYear()) {
  return (account.lumpSums ?? []).reduce((sum, entry) => {
    if (!entry.date) return sum;
    return new Date(entry.date).getFullYear() === year ? sum + num(entry.amount) : sum;
  }, 0);
}

// This year's lump sums spread evenly over 12 months, so growth-projection
// panels that expect a steady monthly figure still get a sensible number
// instead of treating a lump-sum account as contributing $0/mo.
function lumpSumAverageMonthly(account) {
  return lumpSumTotalForYear(account) / 12;
}

// Employee/primary contribution for an account, in monthly terms.
export function employeeMonthlyAmount(account) {
  if (isLumpSumMode(account)) return lumpSumAverageMonthly(account);
  return num(account.employeeMonthly ?? account.monthly);
}

// Non-401(k)/403(b) account's contribution, in monthly terms.
export function nonElectiveMonthlyAmount(account) {
  if (isLumpSumMode(account)) return lumpSumAverageMonthly(account);
  return num(account.monthly);
}

export function effectiveMonthly(account) {
  if (isElectiveDeferralType(account.type)) {
    return employeeMonthlyAmount(account) + num(account.employerMonthly);
  }
  return nonElectiveMonthlyAmount(account);
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
