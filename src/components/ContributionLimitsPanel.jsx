import { num, effectiveMonthly, formatCurrency } from "../lib/finance";

const LIMIT_CATEGORIES = [
  {
    key: "limit401k",
    label: "401(k) elective deferral",
    matchTypes: ["401(k)", "403(b)"],
    employeeOnly: true,
    secondary: {
      key: "limit415c",
      label: "415(c) combined (employee + employer)",
    },
  },
  {
    key: "limitIRA",
    label: "IRA (Traditional + Roth combined)",
    matchTypes: ["Traditional IRA", "Roth IRA"],
  },
  {
    key: "limitHSA",
    label: "Family HSA",
    matchTypes: ["HSA"],
  },
];

const SHORTFALL_THRESHOLD = 0.85;

function statusFor(annualPace, limit, monthsRemaining) {
  if (limit <= 0) return { key: "none", emoji: "🟢", label: "No limit set" };
  if (annualPace > limit) {
    return { key: "act", emoji: "🔴", label: "Projected to exceed limit" };
  }
  if (monthsRemaining > 0 && annualPace < limit * SHORTFALL_THRESHOLD) {
    return { key: "watch", emoji: "🟡", label: "On pace to fall meaningfully short" };
  }
  return { key: "none", emoji: "🟢", label: "On track" };
}

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
      <h2 className="panel-title">Contribution Limits</h2>
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
                <span className={`rating-badge rating-${status.key}`} title={status.label}>
                  <span className="rating-dot" />
                  {status.emoji}
                </span>
              </div>

              <div className="field limit-field">
                <label htmlFor={`limit-${cat.key}`}>
                  {now.getFullYear()} limit ($){cat.employeeOnly ? " — employee only" : ""}
                </label>
                <input
                  id={`limit-${cat.key}`}
                  type="number"
                  inputMode="decimal"
                  value={limits[cat.key] ?? ""}
                  onChange={set(cat.key)}
                  placeholder="0"
                />
              </div>

              <div className="limit-summary">
                <span>
                  Paced at <strong>{formatCurrency(annualPace)}</strong>
                  {limitValue > 0 ? ` (${pct.toFixed(0)}% of limit)` : ""}
                </span>
                <span className="limit-status-label">{status.label}</span>
              </div>

              {secondary && (
                <div className="limit-secondary">
                  <div className="field limit-field limit-field-secondary">
                    <label htmlFor={`limit-${secondary.key}`}>
                      {now.getFullYear()} {secondary.label} ($)
                    </label>
                    <input
                      id={`limit-${secondary.key}`}
                      type="number"
                      inputMode="decimal"
                      value={limits[secondary.key] ?? ""}
                      onChange={set(secondary.key)}
                      placeholder="0"
                    />
                  </div>
                  <span className="limit-secondary-summary">
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
