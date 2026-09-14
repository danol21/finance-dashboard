// Turns a fetched Live Portfolio Snapshot into rows matching the app's account
// schema, so Retirement Projection / Fund & Fee Review / Contribution Limits
// can use real, automatically-synced balances instead of manual entry for any
// account Truthifi already covers. Contribution *rates* are never in the
// snapshot (Truthifi has no visibility into pacing), so those are kept
// separately in data.syncedContributions and merged back in here.

import { isElectiveDeferralType } from "./finance";

const TYPE_RULES = [
  { pattern: /roth/i, type: "Roth IRA" },
  { pattern: /traditional ira|\bira\b/i, type: "Traditional IRA" },
  { pattern: /401\s*\(?k\)?/i, type: "401(k)" },
  { pattern: /403\s*\(?b\)?/i, type: "403(b)" },
  { pattern: /\bhsa\b/i, type: "HSA" },
];

function inferAccountType(name) {
  const hit = TYPE_RULES.find((rule) => rule.pattern.test(name ?? ""));
  return hit ? hit.type : "Brokerage";
}

export function syncedAccountId(accountId) {
  return `synced-${accountId}`;
}

export function deriveSyncedAccounts(snapshot, syncedContributions = {}) {
  if (!snapshot?.accounts?.length) return [];

  return snapshot.accounts.map((account) => {
    const holdings = account.holdings ?? [];
    const totalBalance = holdings.reduce((sum, h) => sum + (h.balance ?? 0), 0);
    const type = inferAccountType(account.name);
    // The monthly automation derives a contribution estimate from recent
    // transaction history where the pattern is regular enough to trust (see
    // the routine prompt) — a manual override in the Accounts table, if the
    // user sets one, always wins over that estimate.
    const autoContribution = snapshot.contributions?.[account.accountId] ?? {};
    const manualOverride = syncedContributions[account.accountId] ?? {};
    const contribution = { ...autoContribution, ...manualOverride };
    const fundSummary = holdings
      .map((h) => h.symbol)
      .filter(Boolean)
      .join(", ");

    const base = {
      id: syncedAccountId(account.accountId),
      accountId: account.accountId,
      name: account.name,
      institution: "Synced via Truthifi",
      type,
      fund: fundSummary,
      balance: String(totalBalance),
      notes: `Synced automatically — ${holdings.length} holding${holdings.length === 1 ? "" : "s"}. Balance and fund come from Truthifi; contribution amount is auto-estimated monthly from transaction history where the pattern is regular, and always overridable here.`,
      synced: true,
    };

    if (isElectiveDeferralType(type)) {
      return {
        ...base,
        employeeMonthly: contribution.employeeMonthly ?? "",
        employerMonthly: contribution.employerMonthly ?? "",
      };
    }
    return { ...base, monthly: contribution.monthly ?? "" };
  });
}

// Fund & Fee Review needs one row per HOLDING (a single account can hold many
// funds), unlike deriveSyncedAccounts above which aggregates per account for
// the balance-total panels.
export function deriveSnapshotHoldingRows(snapshot) {
  if (!snapshot?.accounts?.length) return [];
  return snapshot.accounts.flatMap((account) =>
    (account.holdings ?? []).map((h) => ({
      id: `${account.accountId}-${h.symbol}`,
      symbol: h.symbol,
      balance: h.balance ?? 0,
      accountLabel: account.name,
    }))
  );
}

// Manual accounts are dropped once a synced account with a matching name
// exists, so the two never double-count in totals. Names rarely match
// character-for-character — Truthifi's institution nickname often has extra
// words a hand-typed name doesn't ("Individual - TOD" vs "Individual - TOD
// Brokerage") — so matching normalizes punctuation/case and treats either
// name containing the other as the same account, not just exact equality.
function normalizeAccountName(name) {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Exported so every place that displays or totals manual accounts alongside
// synced ones (the Accounts table's own rendering, its own totals row, and
// this file's mergeAccounts) uses the exact same rule — otherwise a manual
// account can silently double-count in one place while correctly hidden in
// another, which is what happened when only mergeAccounts used this check.
export function namesMatch(manualName, syncedName) {
  const a = normalizeAccountName(manualName);
  const b = normalizeAccountName(syncedName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function isDuplicateOfSynced(manualAccount, syncedAccounts) {
  return syncedAccounts.some((s) => namesMatch(manualAccount.name, s.name));
}

export function mergeAccounts(manualAccounts, syncedAccounts) {
  const manualKept = manualAccounts.filter((a) => !isDuplicateOfSynced(a, syncedAccounts));
  return [...manualKept, ...syncedAccounts];
}
