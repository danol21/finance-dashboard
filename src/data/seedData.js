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
    lastStructuralReview: "",
    contributionLimits: {
      limit401k: 24500,
      limitIRA: 7000,
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
    "Allocation drift": { status: "ok", note: "", updated: "" },
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
