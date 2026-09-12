import {
  num,
  effectiveMonthly,
  employeeMonthlyAmount,
  nonElectiveMonthlyAmount,
  isLumpSumMode,
  lumpSumTotalForYear,
  formatCurrency,
} from "../lib/finance";

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

// `allowPaceWatch` is false when a category is funded entirely by logged lump
// sums rather than a steady monthly amount — there's no "monthly pace" to
// judge, only an actual running total, so the shortfall warning doesn't apply.
function statusFor(annualTotal, limit, monthsRemaining, allowPaceWatch) {
  if (limit <= 0) return { key: "none", emoji: "🟢", label: "No limit set" };
  if (annualTotal > limit) {
    return {
      key: "act",
      emoji: "🔴",
      label: allowPaceWatch ? "Projected to exceed limit" : "Already over the limit",
    };
  }
  if (allowPaceWatch && monthsRemaining > 0 && annualTotal < limit * SHORTFALL_THRESHOLD) {
    return { key: "watch", emoji: "🟡", label: "On pace to fall meaningfully short" };
  }
  return {
    key: "none",
    emoji: "🟢",
    label: allowPaceWatch ? "On track" : annualTotal >= limit ? "Limit reached" : "Funded, room remaining",
  };
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

          const hasLumpSum = matching.some(isLumpSumMode);
          const hasMonthly = matching.some((a) => !isLumpSumMode(a));

          // For a lump-sum account this isn't a pace — employeeMonthlyAmount /
          // nonElectiveMonthlyAmount return this year's logged total divided
          // by 12, so multiplying back by 12 below recovers the actual total.
          const monthlyTotal = matching.reduce(
            (sum, a) =>
              sum + (cat.employeeOnly ? employeeMonthlyAmount(a) : nonElectiveMonthlyAmount(a)),
            0
          );
          const annualPace = monthlyTotal * 12;
          const lumpSumFundedTotal = matching
            .filter(isLumpSumMode)
            .reduce((sum, a) => sum + lumpSumTotalForYear(a), 0);
          const roomLeft = limitValue > 0 ? limitValue - annualPace : null;

          const status = statusFor(annualPace, limitValue, monthsRemaining, hasMonthly);
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
                  {hasMonthly ? "Paced at " : "Funded so far: "}
                  <strong>{formatCurrency(annualPace)}</strong>
                  {limitValue > 0 ? ` (${pct.toFixed(0)}% of limit)` : ""}
                </span>
                {roomLeft !== null && (
                  <span className="limit-room-left">
                    {roomLeft >= 0
                      ? `${formatCurrency(roomLeft)} room left`
                      : `${formatCurrency(-roomLeft)} over the limit`}
                  </span>
                )}
                <span className="limit-status-label">{status.label}</span>
              </div>

              {hasLumpSum && hasMonthly && (
                <p className="limit-lumpsum-note">
                  Of which from logged lump sums: <strong>{formatCurrency(lumpSumFundedTotal)}</strong>
                </p>
              )}

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
