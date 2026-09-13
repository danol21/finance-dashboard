import { num, equityAllocationAt } from "../lib/finance";

export default function GlidePathPanel({ settings, glidePath, onChange }) {
  const retirementAge = num(settings.targetAge);
  const selfCurrentAge = settings.selfCurrentAge !== "" ? num(settings.selfCurrentAge) : null;

  const gp = {
    deRiskStartAge: num(glidePath.deRiskStartAge),
    preEquity: num(glidePath.preEquity),
    troughEquity: num(glidePath.troughEquity),
    driftEndAge: num(glidePath.driftEndAge),
    postEquity: num(glidePath.postEquity),
  };

  const set = (field) => (e) => {
    onChange({ ...glidePath, [field]: e.target.value });
  };

  const xMin = Math.min(45, selfCurrentAge ? selfCurrentAge - 2 : 45, gp.deRiskStartAge - 3);
  const xMax = Math.max(85, gp.driftEndAge + 5);

  const plotLeft = 46;
  const plotRight = 744;
  const plotTop = 20;
  const plotBottom = 260;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const xScale = (age) => plotLeft + ((age - xMin) / (xMax - xMin)) * plotWidth;
  const yScale = (pct) => plotBottom - (pct / 100) * plotHeight;

  const points = [];
  for (let age = Math.floor(xMin); age <= Math.ceil(xMax); age++) {
    points.push([xScale(age), yScale(equityAllocationAt(age, gp, retirementAge))]);
  }
  const linePoints = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPoints = `${plotLeft},${plotBottom} ${linePoints} ${plotRight},${plotBottom}`;

  const yTicks = [0, 20, 40, 60, 80, 100];
  const xTickStep = xMax - xMin > 50 ? 10 : 5;
  const xTicks = [];
  for (let age = Math.ceil(xMin / xTickStep) * xTickStep; age <= xMax; age += xTickStep) {
    xTicks.push(age);
  }

  const markers = [
    { age: gp.deRiskStartAge, label: "De-risk starts", key: "start" },
    { age: retirementAge, label: "Retirement (trough)", key: "trough" },
    { age: gp.driftEndAge, label: "Drift-back complete", key: "end" },
  ];
  if (selfCurrentAge !== null && selfCurrentAge >= xMin && selfCurrentAge <= xMax) {
    markers.push({ age: selfCurrentAge, label: "Today", key: "today", isToday: true });
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Glide Path (Bond Tent)</h2>

      <div className="retire-grid glide-grid">
        <div className="field">
          <label htmlFor="gp-start">De-risk start age</label>
          <input
            id="gp-start"
            type="number"
            value={glidePath.deRiskStartAge}
            onChange={set("deRiskStartAge")}
          />
        </div>
        <div className="field">
          <label htmlFor="gp-pre">Pre-de-risk equity (%)</label>
          <input
            id="gp-pre"
            type="number"
            step="1"
            value={glidePath.preEquity}
            onChange={set("preEquity")}
          />
        </div>
        <div className="field">
          <label htmlFor="gp-trough">Trough equity at retirement (%)</label>
          <input
            id="gp-trough"
            type="number"
            step="1"
            value={glidePath.troughEquity}
            onChange={set("troughEquity")}
          />
        </div>
        <div className="field">
          <label htmlFor="gp-end-age">Drift-back complete by age</label>
          <input
            id="gp-end-age"
            type="number"
            value={glidePath.driftEndAge}
            onChange={set("driftEndAge")}
          />
        </div>
        <div className="field">
          <label htmlFor="gp-post">Target equity by then (%)</label>
          <input
            id="gp-post"
            type="number"
            step="1"
            value={glidePath.postEquity}
            onChange={set("postEquity")}
          />
        </div>
      </div>

      <div className="glide-chart-frame">
        <svg
          viewBox="0 0 780 300"
          role="img"
          aria-label={`Equity allocation glide path: flat at ${gp.preEquity}% until age ${gp.deRiskStartAge}, declining to ${gp.troughEquity}% equity at retirement (age ${retirementAge}), then rising back to ${gp.postEquity}% equity by age ${gp.driftEndAge}.`}
        >
          {yTicks.map((pct) => (
            <g key={pct}>
              <line
                x1={plotLeft}
                y1={yScale(pct)}
                x2={plotRight}
                y2={yScale(pct)}
                stroke="var(--border-subtle, #2a3140)"
                strokeWidth="1"
              />
              <text x={plotLeft - 10} y={yScale(pct) + 4} textAnchor="end" className="glide-axis-label">
                {pct}%
              </text>
            </g>
          ))}

          {xTicks.map((age) => (
            <text
              key={age}
              x={xScale(age)}
              y={plotBottom + 20}
              textAnchor="middle"
              className="glide-axis-label"
            >
              {age}
            </text>
          ))}

          <polygon points={areaPoints} fill="var(--gold-soft, rgba(199,154,75,0.16))" />
          <polyline points={linePoints} fill="none" stroke="var(--gold, #c79a4b)" strokeWidth="2.5" />

          {markers.map((m) => (
            <g key={m.key}>
              <line
                x1={xScale(m.age)}
                y1={plotTop}
                x2={xScale(m.age)}
                y2={plotBottom}
                stroke={m.isToday ? "var(--text-secondary, #a3aab8)" : "var(--gold-dim, #8f7239)"}
                strokeWidth={m.isToday ? 1.5 : 1.2}
                strokeDasharray={m.isToday ? "2 3" : "4 3"}
              />
              <text
                x={xScale(m.age)}
                y={plotTop - 6}
                textAnchor="middle"
                className={`glide-marker-label ${m.isToday ? "glide-marker-today" : ""}`}
              >
                {m.label}
              </text>
            </g>
          ))}

          <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="var(--text-muted, #6b7280)" strokeWidth="1" />
        </svg>
      </div>
      <p className="glide-caption">
        Equity allocation by age: flat at {gp.preEquity}% until {gp.deRiskStartAge}, tenting down to{" "}
        {gp.troughEquity}% at retirement (age {retirementAge}), then drifting back up to {gp.postEquity}%
        by age {gp.driftEndAge} as the bond floor is spent down. Build the bond sleeve inside tax-advantaged
        accounts (401(k)) to avoid realizing gains in the taxable brokerage.
      </p>
    </section>
  );
}
