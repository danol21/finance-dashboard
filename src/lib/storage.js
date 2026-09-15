import { seedData } from "../data/seedData";
import { isElectiveDeferralType } from "./finance";

const STORAGE_KEY = "ledger-dashboard-data";

// Existing 401(k)/403(b) accounts predate the employee/employer split and only
// carry a single combined "monthly" figure. Preserve that total as the employee
// share by default (nothing changes for the elective-deferral check until the
// user fills in the real split), rather than silently losing the old figure.
function migrateAccount(account) {
  if (!isElectiveDeferralType(account.type)) return account;
  if (account.employeeMonthly !== undefined || account.employerMonthly !== undefined) {
    return account;
  }
  return { ...account, employeeMonthly: account.monthly ?? "", employerMonthly: "" };
}

// Triggers auto-synced before the "Cash management" and "Performance" categories
// existed were filed under whatever the old keyword matching produced. Category
// is only computed once at sync time (see FindingsSync), so it never
// self-corrects — recognize the two known-affected findings by their distinctive
// note text and fix them up, one time, without touching anything a user may
// have manually recategorized since (which would no longer match these exact
// from/note pairs).
const CATEGORY_FIXUPS = [
  {
    fromCategory: "Tax opportunity",
    toCategory: "Cash management",
    noteStartsWith: "Cash-or-cash-equivalents (money market sweep) made up roughly 18",
    replaceNote:
      "Updated 2026-09-13: after linking the 401(k), cash-or-cash-equivalents (money market sweep) make up roughly 4.5% of combined tax-advantaged value (Traditional IRA + Roth IRA + 401(k)) — down from an initial ~18-19% estimate that only saw the two Fidelity IRAs, since the 401(k) is fully invested. The underlying issue is unchanged: the Traditional IRA is still 100% cash and a meaningful slice of the Roth IRA is uninvested cash from recent Roth conversions.\n\nSuggested action: Confirm whether recent Roth-conversion cash has settled and reinvest it per the FZROX/FTIHX target allocation. Now a lower-priority item given the diluted overall percentage, but still worth clearing since it's uninvested tax-advantaged space. Recheck next month.",
  },
  {
    fromCategory: "Rebalance",
    toCategory: "Performance",
    noteStartsWith: "Aggregate trailing-12-month portfolio return trailed",
  },
];

function migrateTrigger(trigger) {
  const fixup = CATEGORY_FIXUPS.find(
    (f) => trigger.category === f.fromCategory && (trigger.note ?? "").startsWith(f.noteStartsWith)
  );
  if (!fixup) return trigger;
  return {
    ...trigger,
    category: fixup.toCategory,
    note: fixup.replaceNote ?? trigger.note,
  };
}

// One-time seeded reminders, inserted if not already present (matched by id,
// so a user who deletes one won't have it silently reappear — deleting IS the
// "I've handled this" action for a reminder).
const SEEDED_REMINDERS = [
  {
    id: "reminder-401k-2027-reset",
    dueDate: "2027-01-01",
    title: "Reset 401(k) contribution % for 2027",
    note: "Update the 401(k) contribution % directly in the ADP/Voya self-service app — back up from the 2026 year-end reduction (1% pre-tax / 1% Roth) to the 2027 target (~11% pre-tax / ~3% Roth, pending IRS confirmation of the 2027 limit). Must be in before the first paycheck of the year on Jan 15, 2027.",
    completed: false,
  },
  {
    id: "reminder-nov15-bonus-401k-check",
    dueDate: "2026-11-16",
    title: "Recheck 401(k) pacing after the Nov 15 bonus paycheck",
    note: "The Q3 bonus lands on this check. At the current 1% pre-tax / 1% Roth election, confirm the bonus's own 401(k) withholding hasn't pushed YTD elective deferrals close enough to the $24,500 cap to risk losing Safe Harbor match on the Dec 15/31 checks — adjust December down if needed.",
    completed: false,
  },
  // 2027 quarterly check-ins: the 11%/3% (14%) starting election for 2027 is
  // a target-case estimate (assumes each quarterly bonus lands at its 19%/4
  // target) intentionally rounded DOWN to the nearest whole percent — Voya
  // only accepts whole-number elections, and undershooting is correctable
  // (bump the % later) while overshooting risks re-hitting the $24,500 cap
  // early and losing Safe Harbor match again, same as happened in 2026 (no
  // true-up provision on this plan). Each date below is ~1.5 months after
  // the quarter it's paying out for, matching the confirmed Q3'26-bonus ->
  // Nov 15'26-paycheck lag. Recompute at each one: (24,500 - YTD deferred so
  // far) / (remaining projected pay for the rest of the year) = new %.
  {
    id: "reminder-2027-feb-bonus-401k-check",
    dueDate: "2027-02-16",
    title: "Recheck 401(k) pacing after the Q4 2026 bonus paycheck",
    note: "First checkpoint on the 2027 pace (started the year at 11% pre-tax / 3% Roth). Compare actual YTD elective deferrals to (24,500 - YTD) / (remaining 2027 pay) and adjust the % up if this bonus came in below its ~4.75%-of-salary target, so you don't drift short of the $24,500 cap by December.",
    completed: false,
  },
  {
    id: "reminder-2027-may-bonus-401k-check",
    dueDate: "2027-05-16",
    title: "Recheck 401(k) pacing after the Q1 2027 bonus paycheck",
    note: "Second checkpoint on the 2027 pace. Recompute (24,500 - YTD deferred) / (remaining 2027 pay) and adjust the % — up if bonuses have been running below the ~19%/yr target so far, down if they've been running above it and you're at risk of capping out before December.",
    completed: false,
  },
  {
    id: "reminder-2027-aug-bonus-401k-check",
    dueDate: "2027-08-16",
    title: "Recheck 401(k) pacing after the Q2 2027 bonus paycheck",
    note: "Third checkpoint on the 2027 pace. Recompute (24,500 - YTD deferred) / (remaining 2027 pay) and adjust the % — up if bonuses have been running below the ~19%/yr target so far, down if they've been running above it and you're at risk of capping out before December.",
    completed: false,
  },
  {
    id: "reminder-2027-nov-bonus-401k-check",
    dueDate: "2027-11-16",
    title: "Recheck 401(k) pacing after the Q3 2027 bonus paycheck",
    note: "Final checkpoint before year-end — only the Dec 15/31 paychecks are left after this one. Recompute (24,500 - YTD deferred) / (remaining 2027 pay, i.e. those two checks) and set the % precisely so December lands at or just under $24,500, without capping out early and losing Safe Harbor match on the last check(s).",
    completed: false,
  },
];

function ensureSeededReminders(reminders) {
  const existingIds = new Set(reminders.map((r) => r.id));
  const toAdd = SEEDED_REMINDERS.filter((r) => !existingIds.has(r.id));
  return [...reminders, ...toAdd];
}

export function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...structuredClone(seedData), reminders: ensureSeededReminders(seedData.reminders) };
    }
    const parsed = JSON.parse(raw);
    return {
      settings: {
        ...seedData.settings,
        ...parsed.settings,
        contributionLimits: {
          ...seedData.settings.contributionLimits,
          ...parsed.settings?.contributionLimits,
        },
        glidePath: {
          ...seedData.settings.glidePath,
          ...parsed.settings?.glidePath,
        },
      },
      accounts: (parsed.accounts ?? []).map(migrateAccount),
      health: { ...seedData.health, ...parsed.health },
      triggers: (parsed.triggers ?? []).map(migrateTrigger),
      checklist: { ...seedData.checklist, ...parsed.checklist },
      reviewedFindingIds: parsed.reviewedFindingIds ?? [],
      syncedContributions: { ...seedData.syncedContributions, ...parsed.syncedContributions },
      reminders: ensureSeededReminders(parsed.reminders ?? []),
    };
  } catch (err) {
    console.error("Failed to load saved data, falling back to seed.", err);
    return structuredClone(seedData);
  }
}

export function saveData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save data to localStorage.", err);
  }
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
