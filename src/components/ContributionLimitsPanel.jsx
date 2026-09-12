import { num, formatCurrency } from "../lib/finance";

const LIMIT_CATEGORIES = [
  {
    key: "limit401k",
    label: "401(k) elective deferral",
    matchTypes: ["401(k)", "403(b)"],
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
          const limitValue = num(limits[cat.key]);
          const monthlyTotal = accounts
            .filter((a) => cat.matchTypes.includes(a.type))
            .reduce((sum, a) => sum + num(a.monthly), 0);
          const annualPace = monthlyTotal * 12;
          const status = statusFor(annualPace, limitValue, monthsRemaining);
          const pct = limitValue > 0 ? Math.min((annualPace / limitValue) * 100, 999) : 0;

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
                <label htmlFor={`limit-${cat.key}`}>{now.getFullYear()} limit ($)</label>
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
