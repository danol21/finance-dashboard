import { num, effectiveMonthly, projectBalance, formatCurrency, formatCurrencyPrecise } from "../lib/finance";

export default function RetirementPanel({ settings, onChange, accounts }) {
  const totalBalance = accounts.reduce((sum, a) => sum + num(a.balance), 0);
  const totalMonthly = accounts.reduce((sum, a) => sum + effectiveMonthly(a), 0);

  const selfAge = num(settings.selfCurrentAge);
  const targetAge = num(settings.targetAge);
  const yearsToGo = Math.max(targetAge - selfAge, 0);
  const months = Math.round(yearsToGo * 12);
  const spouseCurrentAge = settings.selfCurrentAge !== "" ? selfAge - num(settings.spouseYoungerBy) : "";

  const projected = projectBalance({
    presentValue: totalBalance,
    monthlyContribution: totalMonthly,
    annualRatePct: num(settings.realReturn),
    months,
  });

  const goal = num(settings.nestEggGoal);
  const goalGap = settings.nestEggGoal !== "" ? projected - goal : null;

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    onChange({ ...settings, [field]: value });
  };

  return (
    <section className="panel">
      <h2 className="panel-title">Retirement Projection</h2>

      <div className="retire-grid">
        <div className="field">
          <label htmlFor="target-age">
            Target retirement age <span className="field-value">{settings.targetAge}</span>
          </label>
          <input
            id="target-age"
            type="range"
            min={55}
            max={65}
            step={1}
            value={settings.targetAge}
            onChange={set("targetAge")}
          />
        </div>

        <div className="field">
          <label htmlFor="self-age">Your current age</label>
          <input
            id="self-age"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 41"
            value={settings.selfCurrentAge}
            onChange={set("selfCurrentAge")}
          />
        </div>

        <div className="field">
          <label htmlFor="spouse-offset">Spouse's age offset (years younger)</label>
          <input
            id="spouse-offset"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 4"
            value={settings.spouseYoungerBy}
            onChange={set("spouseYoungerBy")}
          />
          {spouseCurrentAge !== "" && (
            <span className="field-hint">Spouse is currently ~{spouseCurrentAge}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="real-return">Assumed real return (%)</label>
          <input
            id="real-return"
            type="number"
            step="0.1"
            value={settings.realReturn}
            onChange={set("realReturn")}
          />
        </div>

        <div className="field">
          <label htmlFor="nest-egg">Nest-egg goal (optional)</label>
          <input
            id="nest-egg"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 2000000"
            value={settings.nestEggGoal}
            onChange={set("nestEggGoal")}
          />
        </div>
      </div>

      <div className="retire-results">
        <div className="stat">
          <span className="stat-label">Years to go</span>
          <span className="stat-value">{yearsToGo || "—"}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Current total (balance + monthly)</span>
          <span className="stat-value">{formatCurrency(totalBalance)}</span>
          <span className="stat-sub">{formatCurrencyPrecise(totalMonthly)}/mo contributed</span>
        </div>
        <div className="stat stat-primary">
          <span className="stat-label">Projected balance at retirement</span>
          <span className="stat-value stat-value-lg">{formatCurrency(projected)}</span>
        </div>
        {goalGap !== null && (
          <div className={`stat ${goalGap >= 0 ? "stat-positive" : "stat-negative"}`}>
            <span className="stat-label">{goalGap >= 0 ? "Surplus vs. goal" : "Shortfall vs. goal"}</span>
            <span className="stat-value">{formatCurrency(Math.abs(goalGap))}</span>
          </div>
        )}
      </div>
    </section>
  );
}
