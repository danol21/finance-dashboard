import { num, annualFeeCost, feeSavingsImpact, formatCurrency, formatCurrencyPrecise } from "../lib/finance";
import { findFund, cheapestInCategory } from "../data/fundLibrary";

export default function FundFeePanel({ accounts, snapshotHoldings = [], settings }) {
  const selfAge = num(settings.selfCurrentAge);
  const targetAge = num(settings.targetAge);
  const months = Math.max(Math.round((targetAge - selfAge) * 12), 0);

  // Manual accounts carry one fund ticker each; synced accounts can hold many
  // funds, so those come in pre-exploded to one row per holding.
  const manualRows = accounts
    .filter((a) => !a.synced && a.fund)
    .map((a) => ({ id: a.id, ticker: a.fund, balance: num(a.balance), label: a.name || a.type }));
  const syncedRows = snapshotHoldings.map((h) => ({
    id: h.id,
    ticker: h.symbol,
    balance: h.balance,
    label: h.accountLabel,
  }));

  const rows = [...manualRows, ...syncedRows]
    .map((r) => ({ row: r, fund: findFund(r.ticker) }))
    .filter((r) => r.fund && r.row.balance > 0);

  const totalTaggedBalance = rows.reduce((sum, r) => sum + r.row.balance, 0);
  const totalAnnualFee = rows.reduce((sum, r) => sum + annualFeeCost(r.row.balance, r.fund.expenseRatio), 0);
  const blendedER = totalTaggedBalance > 0 ? (totalAnnualFee / totalTaggedBalance) * 100 : 0;

  const opportunities = rows
    .map((r) => {
      const cheapest = cheapestInCategory(r.fund.category, r.fund.ticker);
      if (!cheapest || cheapest.expenseRatio >= r.fund.expenseRatio) return null;
      const feeDeltaPct = r.fund.expenseRatio - cheapest.expenseRatio;
      const impact = feeSavingsImpact({
        presentValue: r.row.balance,
        months,
        annualRatePct: num(settings.realReturn),
        feeDeltaPct,
      });
      return { ...r, cheapest, feeDeltaPct, impact };
    })
    .filter(Boolean)
    .sort((a, b) => b.impact - a.impact);

  return (
    <section className="panel">
      <h2
        className="panel-title"
        title="Every investment fund charges a small yearly fee, usually a percentage of your balance. This checks the funds you own for that fee and flags a cheaper option in the same category, if one exists."
      >
        What Your Investments Are Costing You in Fees
      </h2>
      <p className="fund-caption">
        Every fund charges a yearly fee (called an "expense ratio") that comes straight out of
        your returns — you never see a bill, it's just quietly deducted. To check yours, type each
        account's fund ticker symbol (the short code like FZROX or FTIHX, found on your account
        statement or provider's website) into the Fund column of the Accounts table below. Fee
        numbers here are commonly-cited approximate figures — double check the current number on
        the provider's site before acting on it.
      </p>

      {rows.length === 0 ? (
        <p className="empty-state">No accounts tagged with a recognized fund ticker yet.</p>
      ) : (
        <>
          <div className="retire-results">
            <div className="stat" title="The total balance across only the holdings we recognize by ticker — untagged or unrecognized holdings aren't included, so this can be less than your full portfolio.">
              <span className="stat-label">Balance we can check</span>
              <span className="stat-value">{formatCurrency(totalTaggedBalance)}</span>
            </div>
            <div className="stat" title="The average yearly fee % across everything you own that we recognize, weighted by balance — lower is better. Broad index funds like FZROX/FTIHX typically charge close to 0%.">
              <span className="stat-label">Average yearly fee (%)</span>
              <span className="stat-value">{blendedER.toFixed(3)}%</span>
            </div>
            <div className="stat stat-primary" title="Roughly what these fees add up to in real dollars per year, based on your current balances.">
              <span className="stat-label">What that costs you per year</span>
              <span className="stat-value stat-value-lg">{formatCurrencyPrecise(totalAnnualFee)}</span>
            </div>
          </div>

          <div className="fund-holdings">
            {rows.map((r) => (
              <div key={r.row.id} className="fund-row" title={`${r.fund.name} in ${r.row.label} — a ${r.fund.expenseRatio.toFixed(3)}% yearly fee costs about ${formatCurrencyPrecise(annualFeeCost(r.row.balance, r.fund.expenseRatio))}/yr on this balance.`}>
                <span className="fund-ticker">{r.fund.ticker}</span>
                <span className="fund-name">{r.fund.name}</span>
                <span className="fund-account">{r.row.label}</span>
                <span className="fund-er">{r.fund.expenseRatio.toFixed(3)}% fee/yr</span>
                <span className="fund-fee">
                  {formatCurrencyPrecise(annualFeeCost(r.row.balance, r.fund.expenseRatio))}/yr
                </span>
              </div>
            ))}
          </div>

          {opportunities.length > 0 && (
            <div className="fund-opportunities">
              <h3 className="fund-opportunities-title">You could pay less for the same thing</h3>
              {opportunities.map((o) => (
                <div key={o.row.id} className="fund-opportunity-card">
                  <p className="fund-opportunity-summary">
                    Your <strong>{o.row.label}</strong> account holds{" "}
                    <strong>{o.fund.ticker}</strong>, which charges {o.fund.expenseRatio.toFixed(3)}%
                    per year. A similar fund, <strong>{o.cheapest.ticker}</strong> ({o.cheapest.name}),
                    invests in roughly the same thing but only charges {o.cheapest.expenseRatio.toFixed(3)}% —{" "}
                    {o.feeDeltaPct.toFixed(3)} percentage points less.
                  </p>
                  {months > 0 && (
                    <p className="fund-opportunity-impact">
                      What that could be worth by age {targetAge} if you switched today:{" "}
                      <strong className="impact-positive">+{formatCurrency(o.impact)}</strong>{" "}
                      (assuming your balance and contributions stay the same, and the fee savings
                      grow at the {num(settings.realReturn)}% yearly rate you set in Retirement
                      Savings Forecast above — this is a rough estimate, not a promise).
                    </p>
                  )}
                  {o.cheapest.caveat && <p className="fund-opportunity-caveat">{o.cheapest.caveat}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
