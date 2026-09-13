// Reference data only — commonly-cited expense ratios as of ~early 2026.
// These drift over time (funds cut fees, providers launch new share classes);
// verify the current figure on the provider's site or fund prospectus before
// acting on a comparison shown in the app.
export const FUND_LIBRARY = [
  { ticker: "FZROX", name: "Fidelity ZERO Total Market Index", category: "us_total_market", expenseRatio: 0.0 },
  { ticker: "FSKAX", name: "Fidelity Total Market Index", category: "us_total_market", expenseRatio: 0.015 },
  { ticker: "FXAIX", name: "Fidelity 500 Index", category: "us_total_market", expenseRatio: 0.015 },
  { ticker: "VTSAX", name: "Vanguard Total Stock Market Index (Admiral)", category: "us_total_market", expenseRatio: 0.04 },
  { ticker: "VTI", name: "Vanguard Total Stock Market ETF", category: "us_total_market", expenseRatio: 0.03 },
  { ticker: "SWTSX", name: "Schwab Total Stock Market Index", category: "us_total_market", expenseRatio: 0.03 },
  { ticker: "ITOT", name: "iShares Core S&P Total US Stock Market ETF", category: "us_total_market", expenseRatio: 0.03 },

  { ticker: "FTIHX", name: "Fidelity Total International Index", category: "international", expenseRatio: 0.06 },
  {
    ticker: "FZILX",
    name: "Fidelity ZERO International Index",
    category: "international",
    expenseRatio: 0.0,
    caveat:
      "FZILX is a Fidelity-proprietary fund: it can't be transferred in-kind to another brokerage (selling it can trigger capital gains in a taxable account), and it samples the index rather than fully replicating it. Weigh that portability/tracking tradeoff against the fee savings before moving taxable-account money into it.",
  },
  { ticker: "VXUS", name: "Vanguard Total International Stock ETF", category: "international", expenseRatio: 0.05 },
  { ticker: "VTIAX", name: "Vanguard Total International Stock Index (Admiral)", category: "international", expenseRatio: 0.11 },
  { ticker: "SWISX", name: "Schwab International Index", category: "international", expenseRatio: 0.06 },
  { ticker: "IXUS", name: "iShares Core MSCI Total International Stock ETF", category: "international", expenseRatio: 0.07 },
];

export function findFund(ticker) {
  if (!ticker) return null;
  const clean = ticker.trim().toUpperCase();
  return FUND_LIBRARY.find((f) => f.ticker === clean) ?? null;
}

export function cheapestInCategory(category, excludeTicker) {
  return (
    FUND_LIBRARY.filter((f) => f.category === category && f.ticker !== excludeTicker).sort(
      (a, b) => a.expenseRatio - b.expenseRatio
    )[0] ?? null
  );
}
