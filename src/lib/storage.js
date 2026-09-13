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
      triggers: parsed.triggers ?? [],
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
