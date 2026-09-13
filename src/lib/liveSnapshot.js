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
    const contribution = syncedContributions[account.accountId] ?? {};
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
      notes: `Synced automatically — ${holdings.length} holding${holdings.length === 1 ? "" : "s"}. Balance and fund come from Truthifi; contribution amount is yours to maintain.`,
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

// Manual accounts are dropped once a synced account with the same name exists,
// so the two never double-count in totals. Matching is by name only — rename
// a manual account to stop it being treated as the synced version's duplicate.
export function mergeAccounts(manualAccounts, syncedAccounts) {
  const syncedNames = new Set(syncedAccounts.map((a) => a.name.trim().toLowerCase()));
  const manualKept = manualAccounts.filter((a) => !syncedNames.has((a.name ?? "").trim().toLowerCase()));
  return [...manualKept, ...syncedAccounts];
}
