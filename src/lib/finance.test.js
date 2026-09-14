import { describe, expect, it } from "vitest";
import {
  num,
  isElectiveDeferralType,
  effectiveMonthly,
  projectBalance,
  projectBalanceSeries,
  equityAllocationAt,
  annualFeeCost,
  feeSavingsImpact,
} from "./finance";

describe("num", () => {
  it("parses numeric strings", () => {
    expect(num("1234.5")).toBe(1234.5);
  });

  it("falls back to 0 for empty/invalid input", () => {
    expect(num("")).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num("not a number")).toBe(0);
  });
});

describe("isElectiveDeferralType", () => {
  it("is true only for 401(k)/403(b)", () => {
    expect(isElectiveDeferralType("401(k)")).toBe(true);
    expect(isElectiveDeferralType("403(b)")).toBe(true);
    expect(isElectiveDeferralType("Traditional IRA")).toBe(false);
    expect(isElectiveDeferralType("Brokerage")).toBe(false);
  });
});

describe("effectiveMonthly", () => {
  it("sums employee + employer for elective-deferral accounts", () => {
    expect(effectiveMonthly({ type: "401(k)", employeeMonthly: "500", employerMonthly: "200" })).toBe(700);
  });

  it("uses the plain monthly field for everything else", () => {
    expect(effectiveMonthly({ type: "Brokerage", monthly: "300" })).toBe(300);
  });
});

describe("projectBalance", () => {
  it("returns the present value unchanged when there are no months to project", () => {
    expect(projectBalance({ presentValue: 1000, months: 0 })).toBe(1000);
  });

  it("compounds a lump sum with no contributions", () => {
    // 12% annual (1% monthly) for 12 months, no contributions.
    const result = projectBalance({
      presentValue: 1000,
      otherMonthly: 0,
      employeeMonthly: 0,
      employerMonthly: 0,
      annualRatePct: 12,
      months: 12,
      electiveDeferralLimit: 0,
    });
    expect(result).toBeCloseTo(1000 * Math.pow(1.01, 12), 6);
  });

  it("caps employee elective deferrals at the annual limit and resumes in January", () => {
    // $1000/mo employee contribution against a $3000 annual cap, starting in
    // January: caps after 3 months, then nothing until the next Jan resets it.
    const result = projectBalance({
      presentValue: 0,
      otherMonthly: 0,
      employeeMonthly: 1000,
      employerMonthly: 0,
      annualRatePct: 0,
      months: 14,
      electiveDeferralLimit: 3000,
      startMonthOfYear: 1,
    });
    // 3 months of $1000 in year one (cap hit), then 2 months of $1000 in year two.
    expect(result).toBe(5000);
  });

  it("never caps employer contributions or other accounts", () => {
    const result = projectBalance({
      presentValue: 0,
      otherMonthly: 500,
      employeeMonthly: 1000,
      employerMonthly: 300,
      annualRatePct: 0,
      months: 12,
      electiveDeferralLimit: 3000,
      startMonthOfYear: 1,
    });
    // Employee: capped at 3000 total. Employer + other: uncapped at 800/mo * 12.
    expect(result).toBe(3000 + 800 * 12);
  });

  it("treats a zero/negative limit as no cap on the employee side", () => {
    const result = projectBalance({
      presentValue: 0,
      otherMonthly: 0,
      employeeMonthly: 1000,
      employerMonthly: 0,
      annualRatePct: 0,
      months: 12,
      electiveDeferralLimit: 0,
      startMonthOfYear: 1,
    });
    expect(result).toBe(12000);
  });
});

describe("projectBalanceSeries", () => {
  it("returns one point per age from startAge to endAge, matching projectBalance", () => {
    const series = projectBalanceSeries({
      presentValue: 10000,
      employeeMonthly: 500,
      employerMonthly: 100,
      otherMonthly: 200,
      annualRatePct: 6,
      startAge: 40,
      endAge: 45,
      electiveDeferralLimit: 20000,
      startMonthOfYear: 1,
    });
    expect(series).toHaveLength(6);
    expect(series[0]).toEqual({ age: 40, balance: 10000 });
    const expectedLast = projectBalance({
      presentValue: 10000,
      employeeMonthly: 500,
      employerMonthly: 100,
      otherMonthly: 200,
      annualRatePct: 6,
      months: 60,
      electiveDeferralLimit: 20000,
      startMonthOfYear: 1,
    });
    expect(series[series.length - 1].balance).toBeCloseTo(expectedLast, 6);
  });

  it("returns an empty array when endAge is before startAge", () => {
    expect(projectBalanceSeries({ presentValue: 0, startAge: 50, endAge: 40 })).toEqual([]);
  });
});

describe("equityAllocationAt", () => {
  const glidePath = { deRiskStartAge: 54, preEquity: 90, troughEquity: 60, driftEndAge: 75, postEquity: 75 };
  const retirementAge = 60;

  it("stays flat at preEquity before the de-risk start age", () => {
    expect(equityAllocationAt(40, glidePath, retirementAge)).toBe(90);
    expect(equityAllocationAt(54, glidePath, retirementAge)).toBe(90);
  });

  it("hits exactly the trough value at retirement age", () => {
    expect(equityAllocationAt(60, glidePath, retirementAge)).toBe(60);
  });

  it("interpolates linearly down to the trough", () => {
    // Halfway between de-risk start (54) and retirement (60).
    expect(equityAllocationAt(57, glidePath, retirementAge)).toBeCloseTo(75, 6);
  });

  it("interpolates linearly back up after retirement", () => {
    // Halfway between retirement (60) and drift-end (75).
    expect(equityAllocationAt(67.5, glidePath, retirementAge)).toBeCloseTo(67.5, 6);
  });

  it("stays flat at postEquity after the drift-end age", () => {
    expect(equityAllocationAt(80, glidePath, retirementAge)).toBe(75);
  });
});

describe("annualFeeCost", () => {
  it("multiplies balance by the expense ratio percentage", () => {
    expect(annualFeeCost(10000, 0.5)).toBeCloseTo(50, 6);
  });
});

describe("feeSavingsImpact", () => {
  it("is zero when there's nothing left to project", () => {
    expect(feeSavingsImpact({ presentValue: 1000, months: 0, annualRatePct: 7, feeDeltaPct: 0.5 })).toBe(0);
  });

  it("is positive when the fee delta represents a savings", () => {
    const impact = feeSavingsImpact({ presentValue: 100000, months: 120, annualRatePct: 7, feeDeltaPct: 0.5 });
    expect(impact).toBeGreaterThan(0);
  });
});
