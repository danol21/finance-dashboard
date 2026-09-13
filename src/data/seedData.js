// Placeholder/demo data only — real balances and personal figures live exclusively
// in the browser's localStorage and must never be added here. Safe to commit.
export const seedData = {
  settings: {
    targetAge: 60,
    selfCurrentAge: "",
    spouseCurrentAge: "",
    spouseYoungerBy: 4,
    realReturn: 7,
    nestEggGoal: "",
    withdrawalRate: 4.0,
    annualSpending: "",
    lastStructuralReview: "",
    glidePath: {
      deRiskStartAge: 54,
      preEquity: 90,
      troughEquity: 60,
      driftEndAge: 75,
      postEquity: 75,
    },
    contributionLimits: {
      limit401k: 24500,
      limitIRA: 7500,
      limitHSA: 8750,
      limit415c: 72000,
    },
  },
  accounts: [
    {
      id: "seed-1",
      name: "Example Brokerage",
      institution: "Example Financial",
      type: "Brokerage",
      balance: "0",
      monthly: "0",
      notes: "",
    },
    {
      id: "seed-2",
      name: "Example 401(k)",
      institution: "Example Retirement Co.",
      type: "401(k)",
      balance: "0",
      employeeMonthly: "0",
      employerMonthly: "0",
      notes: "",
    },
  ],
  health: {
    "Fee drag": { status: "ok", note: "", updated: "" },
    "Allocation drift": {
      status: "watch",
      note: "Glide path: bond tent, not linear decline. Begin de-risking at 54–55 to reach ~60/40 stocks/bonds at retirement (60) — tent troughs at the retirement date, which is why build-up starts ~5 years early. Post-retirement, drift back up to 70–80% equity by the mid-70s as the bond floor is spent down. Build the bond sleeve inside the 401(k) to avoid realizing gains in the taxable brokerage. Revisit specifics at 54–55, 58, and 60 based on CAPE valuation at that time.",
      updated: "2026-09-13",
    },
    "Tax efficiency": { status: "ok", note: "", updated: "" },
    "Contribution room": { status: "ok", note: "", updated: "" },
  },
  triggers: [
    {
      id: "seed-t1",
      date: "",
      category: "Other",
      note: "Example entry — replace or delete.",
      rating: "watch",
      resolved: false,
    },
  ],
  checklist: {
    "Fee drag": { completed: false, lastCompleted: "" },
    "Allocation drift": { completed: false, lastCompleted: "" },
    "Tax efficiency": { completed: false, lastCompleted: "" },
    "Contribution room": { completed: false, lastCompleted: "" },
  },
  reviewedFindingIds: [],
};
