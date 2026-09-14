import { describe, expect, it } from "vitest";
import { namesMatch, isDuplicateOfSynced, mergeAccounts, deriveSyncedAccounts } from "./liveSnapshot";

describe("namesMatch", () => {
  it("matches names that are identical apart from case/punctuation", () => {
    expect(namesMatch("Individual - TOD", "individual tod")).toBe(true);
  });

  it("matches when one name is a substring of the other", () => {
    expect(namesMatch("Individual - TOD", "Individual - TOD Brokerage")).toBe(true);
  });

  it("does not match unrelated names", () => {
    expect(namesMatch("Traditional IRA", "Roth IRA")).toBe(false);
  });

  it("never matches empty/blank names", () => {
    expect(namesMatch("", "Roth IRA")).toBe(false);
    expect(namesMatch("Roth IRA", "")).toBe(false);
  });
});

describe("mergeAccounts / isDuplicateOfSynced", () => {
  const synced = [{ id: "synced-1", name: "Fidelity Traditional IRA" }];

  it("drops a manual account whose name matches a synced account", () => {
    const manual = [{ id: "m1", name: "Traditional IRA" }];
    expect(isDuplicateOfSynced(manual[0], synced)).toBe(true);
    expect(mergeAccounts(manual, synced)).toEqual(synced);
  });

  it("keeps a manual account with no synced match, alongside the synced ones", () => {
    const manual = [{ id: "m2", name: "UK Pension" }];
    const result = mergeAccounts(manual, synced);
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([...manual, ...synced]));
  });
});

describe("deriveSyncedAccounts", () => {
  it("returns nothing when there's no snapshot", () => {
    expect(deriveSyncedAccounts(null)).toEqual([]);
    expect(deriveSyncedAccounts({ accounts: [] })).toEqual([]);
  });

  it("sums holdings into a total balance and infers the account type from its name", () => {
    const snapshot = {
      accounts: [
        {
          accountId: "acc-1",
          name: "My Roth IRA",
          holdings: [{ symbol: "FZROX", balance: 1000 }, { symbol: "FTIHX", balance: 500 }],
        },
      ],
    };
    const [account] = deriveSyncedAccounts(snapshot);
    expect(account.type).toBe("Roth IRA");
    expect(account.balance).toBe("1500");
    expect(account.fund).toBe("FZROX, FTIHX");
  });

  it("lets a manual contribution override the auto-derived estimate", () => {
    const snapshot = {
      accounts: [{ accountId: "acc-1", name: "My 401(k)", holdings: [] }],
      contributions: { "acc-1": { employeeMonthly: "500", employerMonthly: "200" } },
    };
    const [account] = deriveSyncedAccounts(snapshot, { "acc-1": { employeeMonthly: "999" } });
    expect(account.employeeMonthly).toBe("999");
    expect(account.employerMonthly).toBe("200");
  });
});
