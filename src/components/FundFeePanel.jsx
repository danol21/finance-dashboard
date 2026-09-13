import { num, annualFeeCost, feeSavingsImpact, formatCurrency, formatCurrencyPrecise } from "../lib/finance";
import { findFund, cheapestInCategory } from "../data/fundLibrary";

export default function FundFeePanel({ accounts, settings }) {
  const selfAge = num(settings.selfCurrentAge);
  const targetAge = num(settings.targetAge);
  const months = Math.max(Math.round((targetAge - selfAge) * 12), 0);

  const rows = accounts
    .map((a) => ({ account: a, fund: findFund(a.fund) }))
    .filter((r) => r.fund && num(r.account.balance) > 0);

  const totalTaggedBalance = rows.reduce((sum, r) => sum + num(r.account.balance), 0);
  const totalAnnualFee = rows.reduce(
    (sum, r) => sum + annualFeeCost(num(r.account.balance), r.fund.expenseRatio),
    0
  );
  const blendedER = totalTaggedBalance > 0 ? (totalAnnualFee / totalTaggedBalance) * 100 : 0;

  const opportunities = rows
    .map((r) => {
      const cheapest = cheapestInCategory(r.fund.category, r.fund.ticker);
      if (!cheapest || cheapest.expenseRatio >= r.fund.expenseRatio) return null;
      const feeDeltaPct = r.fund.expenseRatio - cheapest.expenseRatio;
      const impact = feeSavingsImpact({
        presentValue: num(r.account.balance),
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
      <h2 className="panel-title">Fund &amp; Fee Review</h2>
      <p className="fund-caption">
        Tag each account's fund with its ticker in the Accounts table (e.g. FZROX, FTIHX) to see
        its expense-ratio drag and whether a cheaper same-category equivalent exists. Expense
        ratios here are commonly-cited approximate figures — verify the current value on the
        provider's site before acting.
      </p>

      {rows.length === 0 ? (
        <p className="empty-state">No accounts tagged with a recognized fund ticker yet.</p>
      ) : (
        <>
          <div className="retire-results">
            <div className="stat">
              <span className="stat-label">Tagged balance</span>
              <span className="stat-value">{formatCurrency(totalTaggedBalance)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Blended expense ratio</span>
              <span className="stat-value">{blendedER.toFixed(3)}%</span>
            </div>
            <div className="stat stat-primary">
              <span className="stat-label">Est. annual fee cost</span>
              <span className="stat-value stat-value-lg">{formatCurrencyPrecise(totalAnnualFee)}</span>
            </div>
          </div>

          <div className="fund-holdings">
            {rows.map((r) => (
              <div key={r.account.id} className="fund-row">
                <span className="fund-ticker">{r.fund.ticker}</span>
                <span className="fund-name">{r.fund.name}</span>
                <span className="fund-account">{r.account.name || r.account.type}</span>
                <span className="fund-er">{r.fund.expenseRatio.toFixed(3)}% ER</span>
                <span className="fund-fee">
                  {formatCurrencyPrecise(annualFeeCost(num(r.account.balance), r.fund.expenseRatio))}/yr
                </span>
              </div>
            ))}
          </div>

          {opportunities.length > 0 && (
            <div className="fund-opportunities">
              <h3 className="fund-opportunities-title">Cheaper equivalents available</h3>
              {opportunities.map((o) => (
                <div key={o.account.id} className="fund-opportunity-card">
                  <p className="fund-opportunity-summary">
                    <strong>{o.account.name || o.account.type}</strong> holds{" "}
                    <strong>{o.fund.ticker}</strong> ({o.fund.expenseRatio.toFixed(3)}% ER). A
                    same-category fund, <strong>{o.cheapest.ticker}</strong> ({o.cheapest.name}),
                    runs {o.cheapest.expenseRatio.toFixed(3)}% ER — {o.feeDeltaPct.toFixed(3)} pts
                    cheaper.
                  </p>
                  {months > 0 && (
                    <p className="fund-opportunity-impact">
                      Est. impact by age {targetAge} if switched today:{" "}
                      <strong className="impact-positive">+{formatCurrency(o.impact)}</strong>{" "}
                      (balance and contributions held constant; fee savings compounding at your
                      assumed {num(settings.realReturn)}% real return).
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
