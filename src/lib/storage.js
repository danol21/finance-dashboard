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

export function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(seedData);
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
