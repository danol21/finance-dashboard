import { num } from "./finance";

// Shared with ContributionLimitsPanel and Structural Health so the two can
// never silently disagree — Structural Health used to only reflect
// Contribution Limits status if someone had separately logged a matching
// Trigger Log finding, which meant a real over-the-limit warning here could
// sit unflagged in Structural Health until someone noticed and logged it by
// hand.
export const LIMIT_CATEGORIES = [
  {
    key: "limit401k",
    label: "401(k)/403(b) — your own contributions",
    matchTypes: ["401(k)", "403(b)"],
    employeeOnly: true,
    secondary: {
      key: "limit415c",
      label: "Combined 401(k)/403(b) cap (you + employer match)",
    },
  },
  {
    key: "limitIRA",
    label: "IRA (Traditional + Roth added together)",
    matchTypes: ["Traditional IRA", "Roth IRA"],
  },
  {
    key: "limitHSA",
    label: "Health Savings Account (Family)",
    matchTypes: ["HSA"],
  },
];

export const SHORTFALL_THRESHOLD = 0.85;

export function statusFor(annualPace, limit, monthsRemaining) {
  if (limit <= 0) return { key: "none", emoji: "🟢", label: "No limit set yet" };
  if (annualPace > limit) {
    return { key: "act", emoji: "🔴", label: "On track to go over the limit — lower it" };
  }
  if (monthsRemaining > 0 && annualPace < limit * SHORTFALL_THRESHOLD) {
    return { key: "watch", emoji: "🟡", label: "On track to put in a lot less than you're allowed" };
  }
  return { key: "none", emoji: "🟢", label: "Right on track" };
}

// Employee-only monthly figure: for 401(k)/403(b) accounts the elective-deferral
// limit applies to the employee's own pre-tax + Roth money, not employer
// match/Safe Harbor contributions.
function employeeMonthly(account) {
  return num(account.employeeMonthly ?? account.monthly);
}

export function computeLimitStatuses(limits, accounts) {
  const now = new Date();
  const monthsRemaining = 12 - (now.getMonth() + 1);
  return LIMIT_CATEGORIES.map((cat) => {
    const matching = accounts.filter((a) => cat.matchTypes.includes(a.type));
    const limitValue = num(limits[cat.key]);
    const monthlyTotal = matching.reduce(
      (sum, a) => sum + (cat.employeeOnly ? employeeMonthly(a) : num(a.monthly)),
      0
    );
    const annualPace = monthlyTotal * 12;
    return { key: cat.key, label: cat.label, status: statusFor(annualPace, limitValue, monthsRemaining) };
  });
}

// Worst status across all three limit categories, translated into a
// Structural Health status ("flagged"/"watch"), plus a plain-language reason
// naming which limit is the problem. Returns null when everything's fine, so
// it never overrides a user's own "On track" with a needless suggestion.
export function worstContributionSuggestion(limits, accounts) {
  const statuses = computeLimitStatuses(limits, accounts);
  const flagged = statuses.find((s) => s.status.key === "act");
  if (flagged) {
    return { status: "flagged", reason: `${flagged.label} is on track to go over this year's limit` };
  }
  const watch = statuses.find((s) => s.status.key === "watch");
  if (watch) {
    return { status: "watch", reason: `${watch.label} is on pace to put in a lot less than you're allowed` };
  }
  return null;
}
