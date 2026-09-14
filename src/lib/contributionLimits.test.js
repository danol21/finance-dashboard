import { describe, expect, it } from "vitest";
import { statusFor, computeLimitStatuses, worstContributionSuggestion } from "./contributionLimits";

describe("statusFor", () => {
  it("reports no limit set when the limit is zero or negative", () => {
    expect(statusFor(5000, 0, 6).key).toBe("none");
  });

  it("flags pace that would exceed the limit", () => {
    expect(statusFor(30000, 24500, 6).key).toBe("act");
  });

  it("watches pace that would fall meaningfully short with months remaining", () => {
    expect(statusFor(10000, 24500, 6).key).toBe("watch");
  });

  it("is on track once past the shortfall threshold with no overage", () => {
    expect(statusFor(23000, 24500, 6).key).toBe("none");
  });

  it("does not warn about a shortfall once the year is over", () => {
    expect(statusFor(10000, 24500, 0).key).toBe("none");
  });
});

describe("computeLimitStatuses", () => {
  it("only counts the employee side of 401(k)/403(b) toward the elective-deferral limit", () => {
    const accounts = [{ type: "401(k)", employeeMonthly: "2000", employerMonthly: "1000" }];
    const statuses = computeLimitStatuses({ limit401k: 24000, limitIRA: 0, limitHSA: 0 }, accounts);
    const k401 = statuses.find((s) => s.key === "limit401k");
    // 2000 * 12 = 24000, exactly at the limit -> not over.
    expect(k401.status.key).not.toBe("act");
  });

  it("combines Traditional and Roth IRA balances toward the shared IRA limit", () => {
    const accounts = [
      { type: "Traditional IRA", monthly: "400" },
      { type: "Roth IRA", monthly: "400" },
    ];
    const statuses = computeLimitStatuses({ limit401k: 0, limitIRA: 7000, limitHSA: 0 }, accounts);
    const ira = statuses.find((s) => s.key === "limitIRA");
    // 800 * 12 = 9600 > 7000.
    expect(ira.status.key).toBe("act");
  });
});

describe("worstContributionSuggestion", () => {
  it("returns null when every category is fine", () => {
    const accounts = [{ type: "401(k)", employeeMonthly: "1000", employerMonthly: "500" }];
    expect(worstContributionSuggestion({ limit401k: 0, limitIRA: 0, limitHSA: 0 }, accounts)).toBeNull();
  });

  it("prefers a flagged (act) status over a watch status", () => {
    const accounts = [
      { type: "401(k)", employeeMonthly: "3000", employerMonthly: "0" }, // way over
      { type: "HSA", monthly: "10" }, // way under
    ];
    const result = worstContributionSuggestion({ limit401k: 24000, limitIRA: 0, limitHSA: 8000 }, accounts);
    expect(result.status).toBe("flagged");
  });
});
