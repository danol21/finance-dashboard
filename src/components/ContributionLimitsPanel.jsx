import { num, effectiveMonthly, formatCurrency } from "../lib/finance";
import { LIMIT_CATEGORIES, statusFor } from "../lib/contributionLimits";

// Employee-only monthly figure: for 401(k)/403(b) accounts the elective-deferral
// limit applies to the employee's own pre-tax + Roth money, not employer
// match/Safe Harbor contributions.
function employeeMonthly(account) {
  return num(account.employeeMonthly ?? account.monthly);
}

export default function ContributionLimitsPanel({ limits, accounts, onChange }) {
  const now = new Date();
  const monthsRemaining = 12 - (now.getMonth() + 1);

  const set = (key) => (e) => {
    onChange({ ...limits, [key]: e.target.value });
  };

  return (
    <section className="panel">
      <h2
        className="panel-title"
        title="Tracks how close you're pacing to each year's IRS contribution cap, based on your current monthly contributions annualized."
      >
        Contribution Limits
      </h2>
      <div className="limits-grid">
        {LIMIT_CATEGORIES.map((cat) => {
          const matching = accounts.filter((a) => cat.matchTypes.includes(a.type));
          const limitValue = num(limits[cat.key]);
          const monthlyTotal = matching.reduce(
            (sum, a) => sum + (cat.employeeOnly ? employeeMonthly(a) : num(a.monthly)),
            0
          );
          const annualPace = monthlyTotal * 12;
          const status = statusFor(annualPace, limitValue, monthsRemaining);
          const pct = limitValue > 0 ? Math.min((annualPace / limitValue) * 100, 999) : 0;

          const secondary = cat.secondary;
          const secondaryLimit = secondary ? num(limits[secondary.key]) : 0;
          const secondaryAnnualPace = secondary
            ? matching.reduce((sum, a) => sum + effectiveMonthly(a), 0) * 12
            : 0;
          const secondaryPct =
            secondary && secondaryLimit > 0
              ? Math.min((secondaryAnnualPace / secondaryLimit) * 100, 999)
              : 0;

          return (
            <div key={cat.key} className={`limit-card limit-${status.key}`}>
              <div className="limit-card-header">
                <span className="limit-card-title">{cat.label}</span>
                <span
                  className={`rating-badge rating-${status.key}`}
                  title={`${status.label} — based on your current monthly contribution rate kept up for the rest of the year.`}
                >
                  <span className="rating-dot" />
                  {status.emoji}
                </span>
              </div>

              <div className="field limit-field">
                <label
                  htmlFor={`limit-${cat.key}`}
                  title={
                    cat.employeeOnly
                      ? "The IRS cap on your own contributions only — employer match doesn't count against this one."
                      : "The IRS cap on total contributions to this account type for the year."
                  }
                >
                  {now.getFullYear()} limit ($){cat.employeeOnly ? " — employee only" : ""}
                </label>
                <input
                  id={`limit-${cat.key}`}
                  type="number"
                  inputMode="decimal"
                  value={limits[cat.key] ?? ""}
                  onChange={set(cat.key)}
                  placeholder="0"
                  title="Edit if the IRS updates this year's limit, or it was entered wrong."
                />
              </div>

              <div className="limit-summary">
                <span title="Your current monthly contribution to this account type, multiplied by 12 — i.e. what you'd end the year at if nothing changes.">
                  Paced at <strong>{formatCurrency(annualPace)}</strong>
                  {limitValue > 0 ? ` (${pct.toFixed(0)}% of limit)` : ""}
                </span>
                <span className="limit-status-label">{status.label}</span>
              </div>

              {secondary && (
                <div className="limit-secondary">
                  <div className="field limit-field limit-field-secondary">
                    <label
                      htmlFor={`limit-${secondary.key}`}
                      title="A separate, higher IRS cap that includes BOTH your contribution and your employer's match combined."
                    >
                      {now.getFullYear()} {secondary.label} ($)
                    </label>
                    <input
                      id={`limit-${secondary.key}`}
                      type="number"
                      inputMode="decimal"
                      value={limits[secondary.key] ?? ""}
                      onChange={set(secondary.key)}
                      placeholder="0"
                      title="Edit if the IRS updates this year's limit, or it was entered wrong."
                    />
                  </div>
                  <span
                    className="limit-secondary-summary"
                    title="Your contribution plus your employer's match, annualized — checked against the higher combined cap above, separately from the employee-only limit."
                  >
                    Combined (employee + employer): <strong>{formatCurrency(secondaryAnnualPace)}</strong>
                    {secondaryLimit > 0 ? ` (${secondaryPct.toFixed(0)}% of ${formatCurrency(secondaryLimit)})` : ""}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
