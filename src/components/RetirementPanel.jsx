import { useRef, useState } from "react";
import {
  num,
  effectiveMonthly,
  isElectiveDeferralType,
  projectBalance,
  projectBalanceSeries,
  formatCurrency,
  formatCurrencyPrecise,
} from "../lib/finance";

export default function RetirementPanel({ settings, onChange, accounts }) {
  const [hoverAge, setHoverAge] = useState(null);
  const totalBalance = accounts.reduce((sum, a) => sum + num(a.balance), 0);
  const totalMonthly = accounts.reduce((sum, a) => sum + effectiveMonthly(a), 0);

  const selfAge = num(settings.selfCurrentAge);
  const targetAge = num(settings.targetAge);
  const yearsToGo = Math.max(targetAge - selfAge, 0);
  const months = Math.round(yearsToGo * 12);
  const spouseCurrentAge = settings.selfCurrentAge !== "" ? selfAge - num(settings.spouseYoungerBy) : "";

  const employeeMonthly = accounts
    .filter((a) => isElectiveDeferralType(a.type))
    .reduce((sum, a) => sum + num(a.employeeMonthly ?? a.monthly), 0);
  const employerMonthly = accounts
    .filter((a) => isElectiveDeferralType(a.type))
    .reduce((sum, a) => sum + num(a.employerMonthly), 0);
  const otherMonthly = accounts
    .filter((a) => !isElectiveDeferralType(a.type))
    .reduce((sum, a) => sum + num(a.monthly), 0);

  const projected = projectBalance({
    presentValue: totalBalance,
    employeeMonthly,
    employerMonthly,
    otherMonthly,
    annualRatePct: num(settings.realReturn),
    months,
    electiveDeferralLimit: num(settings.contributionLimits?.limit401k),
  });

  const manualGoal = settings.nestEggGoal !== "" ? num(settings.nestEggGoal) : null;
  const withdrawalRate = num(settings.withdrawalRate);
  const annualSpending = settings.annualSpending !== "" ? num(settings.annualSpending) : null;
  const otherAnnualIncome = num(settings.otherAnnualIncome);
  // Social Security, a pension, etc. covers part of annual spending without
  // needing to be withdrawn from the portfolio — only the gap has to come
  // from savings, so it's what the derived goal should size for.
  const spendingFromPortfolio =
    annualSpending !== null ? Math.max(annualSpending - otherAnnualIncome, 0) : null;
  const derivedGoal =
    spendingFromPortfolio !== null && withdrawalRate > 0 ? spendingFromPortfolio / (withdrawalRate / 100) : null;

  const effectiveGoal = manualGoal ?? derivedGoal;
  const goalGap = effectiveGoal !== null ? projected - effectiveGoal : null;
  const goalsDiffer = manualGoal !== null && derivedGoal !== null;
  const goalComparisonGap = goalsDiffer ? derivedGoal - manualGoal : null;

  const chartStartAge = selfAge > 0 ? selfAge : 0;
  const growthSeries =
    selfAge > 0 && yearsToGo > 0
      ? projectBalanceSeries({
          presentValue: totalBalance,
          employeeMonthly,
          employerMonthly,
          otherMonthly,
          annualRatePct: num(settings.realReturn),
          startAge: chartStartAge,
          endAge: targetAge,
          electiveDeferralLimit: num(settings.contributionLimits?.limit401k),
        })
      : [];

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    onChange({ ...settings, [field]: value });
  };

  return (
    <section className="panel">
      <h2
        className="panel-title"
        title="Projects your balance forward to retirement using your current accounts, contributions, and an assumed rate of return."
      >
        Retirement Projection
      </h2>

      <div className="retire-grid">
        <div className="field">
          <label htmlFor="target-age" title="The age you're aiming to stop working. Drives how many years of growth the projection below assumes.">
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
            title="Drag to change your target retirement age (55–65)."
          />
        </div>

        <div className="field">
          <label htmlFor="self-age" title="Your age today — used to work out how many years are left until your target retirement age.">
            Your current age
          </label>
          <input
            id="self-age"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 41"
            value={settings.selfCurrentAge}
            onChange={set("selfCurrentAge")}
            title="Your age today."
          />
        </div>

        <div className="field">
          <label htmlFor="spouse-offset" title="For reference only — doesn't affect the projection, just shown as a convenience.">
            Spouse's age offset (years younger)
          </label>
          <input
            id="spouse-offset"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 4"
            value={settings.spouseYoungerBy}
            onChange={set("spouseYoungerBy")}
            title="How many years younger your spouse is than you."
          />
          {spouseCurrentAge !== "" && (
            <span className="field-hint">Spouse is currently ~{spouseCurrentAge}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="real-return" title="Your assumed annual investment growth rate AFTER inflation. A higher number makes the projection more optimistic — this is a guess, not a guarantee.">
            Assumed real return (%)
          </label>
          <input
            id="real-return"
            type="number"
            step="0.1"
            value={settings.realReturn}
            onChange={set("realReturn")}
            title="Annual growth rate assumption, after inflation, used to project your balance forward."
          />
        </div>

        <div className="field">
          <label htmlFor="nest-egg" title="Type a specific dollar target here to override the 'derived' goal calculated from your spending and withdrawal rate below. Leave blank to just use the derived goal.">
            Nest-egg goal (optional, manual)
          </label>
          <input
            id="nest-egg"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 2000000"
            value={settings.nestEggGoal}
            onChange={set("nestEggGoal")}
            title="A specific savings target, if you have one in mind, instead of letting it be calculated from spending ÷ withdrawal rate."
          />
        </div>

        <div className="field">
          <label htmlFor="withdrawal-rate" title="What % of your savings you plan to spend each year in retirement. Used with 'Annual retirement spending' below to work out how big a nest egg you'd need.">
            Target withdrawal rate (%)
          </label>
          <input
            id="withdrawal-rate"
            type="number"
            step="0.1"
            value={settings.withdrawalRate}
            onChange={set("withdrawalRate")}
            title="The % of your total savings you'd draw down each year once retired."
          />
          <span className="field-hint">
            4% is a conservative planning anchor for a diversified, 35+ year horizon — not
            necessarily the rate to withdraw at; can be revisited closer to retirement.
          </span>
        </div>

        <div className="field">
          <label htmlFor="annual-spending" title="How much you expect to spend per year once retired. Combined with the withdrawal rate above to calculate the 'derived nest-egg goal' shown below.">
            Annual retirement spending (optional)
          </label>
          <input
            id="annual-spending"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 80000"
            value={settings.annualSpending}
            onChange={set("annualSpending")}
            title="Your expected yearly spending once retired, in today's dollars."
          />
        </div>

        <div className="field">
          <label
            htmlFor="other-income"
            title="Guaranteed income you expect in retirement that doesn't come out of this portfolio — Social Security, a pension, rental income, etc. Reduces how much the derived nest-egg goal below needs to cover."
          >
            Other retirement income/yr (optional)
          </label>
          <input
            id="other-income"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 30000"
            value={settings.otherAnnualIncome}
            onChange={set("otherAnnualIncome")}
            title="Expected annual Social Security, pension, or other guaranteed income once retired, in today's dollars — subtracted from annual spending before sizing the derived goal."
          />
        </div>
      </div>

      <div className="retire-results">
        <div className="stat" title="How many years from now until your target retirement age.">
          <span className="stat-label">Years to go</span>
          <span className="stat-value">{yearsToGo || "—"}</span>
        </div>
        <div className="stat" title="What you have saved right now across all accounts, plus how much you're putting in per month today.">
          <span className="stat-label">Current total (balance + monthly)</span>
          <span className="stat-value">{formatCurrency(totalBalance)}</span>
          <span className="stat-sub">{formatCurrencyPrecise(totalMonthly)}/mo contributed</span>
        </div>
        <div className="stat stat-primary" title="Your estimated balance at your target retirement age, if your current contributions and assumed growth rate continue unchanged.">
          <span className="stat-label">Projected balance at retirement</span>
          <span className="stat-value stat-value-lg">{formatCurrency(projected)}</span>
        </div>
        {derivedGoal !== null && (
          <div
            className="stat"
            title="The nest egg size that would let you cover your target annual spending, minus any Social Security/pension income, at your target withdrawal rate — without a manual override."
          >
            <span className="stat-label">Derived nest-egg goal (spending ÷ rate)</span>
            <span className="stat-value">{formatCurrency(derivedGoal)}</span>
            <span className="stat-sub">
              {otherAnnualIncome > 0
                ? `${formatCurrency(spendingFromPortfolio)}/yr from portfolio (${formatCurrency(annualSpending)} spend − ${formatCurrency(otherAnnualIncome)} other) ÷ ${withdrawalRate}%`
                : `${formatCurrency(annualSpending)}/yr ÷ ${withdrawalRate}%`}
            </span>
          </div>
        )}
        {goalComparisonGap !== null && (
          <div
            className={`stat ${goalComparisonGap >= 0 ? "stat-positive" : "stat-negative"}`}
            title="You've set both a manual nest-egg goal and spending/withdrawal-rate inputs — this shows how far apart the two goals are, since only one (the manual one) is actually used above."
          >
            <span className="stat-label">
              Derived vs. manual goal — {goalComparisonGap >= 0 ? "derived is higher" : "derived is lower"}
            </span>
            <span className="stat-value">{formatCurrency(Math.abs(goalComparisonGap))}</span>
          </div>
        )}
        {goalGap !== null && (
          <div
            className={`stat ${goalGap >= 0 ? "stat-positive" : "stat-negative"}`}
            title={
              goalGap >= 0
                ? "Your projected balance is ahead of your goal by this much."
                : "Your projected balance falls short of your goal by this much — consider raising contributions, lowering the goal, or extending your target retirement age."
            }
          >
            <span className="stat-label">{goalGap >= 0 ? "Surplus vs. goal" : "Shortfall vs. goal"}</span>
            <span className="stat-value">{formatCurrency(Math.abs(goalGap))}</span>
            <span className="stat-sub">
              vs. {manualGoal !== null ? "manual" : "derived"} goal of {formatCurrency(effectiveGoal)}
            </span>
          </div>
        )}
      </div>

      {growthSeries.length > 1 && (
        <GrowthChart series={growthSeries} goal={effectiveGoal} hoverAge={hoverAge} onHoverAge={setHoverAge} />
      )}

      <p className="field-hint growth-caveat">
        This projection sums account balances at face value — it doesn't distinguish pre-tax
        (Traditional 401(k)/IRA), Roth, and taxable brokerage dollars, which aren't worth the same
        per dollar spent in retirement. Treat the number as directional, not a spendable total.
      </p>
    </section>
  );
}

function GrowthChart({ series, goal, hoverAge, onHoverAge }) {
  const svgRef = useRef(null);
  const ages = series.map((p) => p.age);
  const startAge = ages[0];
  const endAge = ages[ages.length - 1];
  const maxBalance = Math.max(...series.map((p) => p.balance), goal ?? 0) * 1.08 || 1;

  const plotLeft = 60;
  const plotRight = 744;
  const plotTop = 20;
  const plotBottom = 240;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const xScale = (age) => plotLeft + ((age - startAge) / Math.max(endAge - startAge, 1)) * plotWidth;
  const yScale = (balance) => plotBottom - (balance / maxBalance) * plotHeight;

  const linePoints = series.map((p) => `${xScale(p.age).toFixed(1)},${yScale(p.balance).toFixed(1)}`).join(" ");
  const areaPoints = `${plotLeft},${plotBottom} ${linePoints} ${plotRight},${plotBottom}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxBalance);
  const range = endAge - startAge;
  const xTickStep = range > 20 ? 5 : range > 8 ? 2 : 1;
  const xTicks = [];
  for (let age = Math.ceil(startAge / xTickStep) * xTickStep; age <= endAge; age += xTickStep) {
    if (age >= startAge) xTicks.push(age);
  }

  const formatCompact = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);

  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const rawAge = startAge + ((loc.x - plotLeft) / plotWidth) * (endAge - startAge);
    const clamped = Math.min(Math.max(Math.round(rawAge), startAge), endAge);
    onHoverAge(clamped);
  };

  const hoverPoint = hoverAge != null ? series.find((p) => p.age === hoverAge) : null;

  return (
    <div className="growth-chart-frame">
      <svg
        ref={svgRef}
        viewBox="0 0 780 300"
        role="img"
        aria-label={`Projected balance growth from ${formatCurrency(series[0].balance)} at age ${startAge} to ${formatCurrency(
          series[series.length - 1].balance
        )} at age ${endAge}.`}
        onMouseMove={handleMove}
        onMouseLeave={() => onHoverAge(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={plotLeft}
              y1={yScale(v)}
              x2={plotRight}
              y2={yScale(v)}
              stroke="var(--border-subtle, #2a3140)"
              strokeWidth="1"
            />
            <text x={plotLeft - 10} y={yScale(v) + 4} textAnchor="end" className="growth-axis-label">
              {formatCompact(v)}
            </text>
          </g>
        ))}

        {xTicks.map((age) => (
          <text key={age} x={xScale(age)} y={plotBottom + 20} textAnchor="middle" className="growth-axis-label">
            {age}
          </text>
        ))}

        <polygon points={areaPoints} fill="var(--gold-soft, rgba(199,154,75,0.16))" />
        <polyline points={linePoints} fill="none" stroke="var(--gold, #c79a4b)" strokeWidth="2.5" />

        {goal != null && goal > 0 && goal <= maxBalance && (
          <g>
            <line
              x1={plotLeft}
              y1={yScale(goal)}
              x2={plotRight}
              y2={yScale(goal)}
              stroke="var(--text-secondary, #a3aab8)"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text x={plotRight} y={yScale(goal) - 6} textAnchor="end" className="growth-goal-label">
              Goal: {formatCompact(goal)}
            </text>
          </g>
        )}

        <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="var(--text-muted, #6b7280)" strokeWidth="1" />

        {hoverPoint && (
          <g>
            <line
              x1={xScale(hoverPoint.age)}
              y1={plotTop}
              x2={xScale(hoverPoint.age)}
              y2={plotBottom}
              stroke="var(--text-secondary, #a3aab8)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <circle cx={xScale(hoverPoint.age)} cy={yScale(hoverPoint.balance)} r="4" fill="var(--gold, #c79a4b)" />
            {(() => {
              const nearRightEdge = xScale(hoverPoint.age) > plotLeft + plotWidth * 0.65;
              const boxWidth = 148;
              const boxX = nearRightEdge ? xScale(hoverPoint.age) - boxWidth - 10 : xScale(hoverPoint.age) + 10;
              const boxY = Math.max(yScale(hoverPoint.balance) - 34, plotTop);
              return (
                <g>
                  <rect x={boxX} y={boxY} width={boxWidth} height="40" rx="5" className="growth-tooltip-bg" />
                  <text x={boxX + 10} y={boxY + 16} className="growth-tooltip-text">
                    Age {hoverPoint.age}
                  </text>
                  <text x={boxX + 10} y={boxY + 30} className="growth-tooltip-text-muted">
                    {formatCurrency(hoverPoint.balance)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}
