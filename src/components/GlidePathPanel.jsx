import { num } from "../lib/finance";
import { smoothPathD, smoothAreaD } from "../lib/svgPath";

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
  // Extra headroom above the plot (vs. a single label row) so two staggered
  // rows of marker labels have room to not clip against the top edge — see
  // the label-collision handling below.
  const plotTop = 36;
  const plotBottom = 260;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const xScale = (age) => plotLeft + ((age - xMin) / (xMax - xMin)) * plotWidth;
  const yScale = (pct) => plotBottom - (pct / 100) * plotHeight;

  // This is exactly 4 straight-line segments (flat, ramp down, ramp up, flat)
  // with 3 corners — so the curve only needs the 5 vertices, not one point
  // per year. Using just the vertices (rather than ~40 densely-packed yearly
  // points) gives the spline's rounding a much larger radius to work with at
  // each corner, so it actually reads as a smooth curve instead of a barely-
  // perceptible softening of a sharp V.
  const points = [
    [xScale(xMin), yScale(gp.preEquity)],
    [xScale(gp.deRiskStartAge), yScale(gp.preEquity)],
    [xScale(retirementAge), yScale(gp.troughEquity)],
    [xScale(gp.driftEndAge), yScale(gp.postEquity)],
    [xScale(xMax), yScale(gp.postEquity)],
  ];
  const linePath = smoothPathD(points);
  const areaPath = smoothAreaD(points, plotLeft, plotRight, plotBottom);

  const yTicks = [0, 20, 40, 60, 80, 100];
  const xTickStep = xMax - xMin > 50 ? 10 : 5;
  const xTicks = [];
  for (let age = Math.ceil(xMin / xTickStep) * xTickStep; age <= xMax; age += xTickStep) {
    xTicks.push(age);
  }

  const rawMarkers = [
    { age: gp.deRiskStartAge, label: "Start playing it safer", key: "start" },
    { age: retirementAge, label: "Retirement (safest point)", key: "trough" },
    { age: gp.driftEndAge, label: "Back to normal mix", key: "end" },
  ];
  if (selfCurrentAge !== null && selfCurrentAge >= xMin && selfCurrentAge <= xMax) {
    rawMarkers.push({ age: selfCurrentAge, label: "Today", key: "today", isToday: true });
  }

  // Marker labels can land close enough together (e.g. de-risking starting
  // just a few years before retirement) that centering each one on its own
  // age-line makes adjacent labels overlap — and these labels vary a lot in
  // length ("Today" vs. "Retirement (safest point)"), so a fixed pixel gap
  // isn't enough; estimate each label's rendered width from its character
  // count. Alternate labels onto a second, higher row whenever the gap since
  // the last-placed label is smaller than both labels' half-widths (plus
  // padding) combined, resetting back to the top row once there's room.
  const AVG_CHAR_WIDTH_PX = 6.2; // rough glyph width at the marker label's ~11px font
  const LABEL_PADDING_PX = 10;
  const estLabelWidth = (label) => label.length * AVG_CHAR_WIDTH_PX;
  const { placed: markers } = [...rawMarkers]
    .sort((a, b) => a.age - b.age)
    .reduce(
      (acc, m) => {
        const x = xScale(m.age);
        const width = estLabelWidth(m.label);
        const minGap = acc.lastWidth / 2 + width / 2 + LABEL_PADDING_PX;
        const row = x - acc.lastX < minGap ? acc.nextRow : 0;
        return {
          placed: [...acc.placed, { ...m, row }],
          lastX: x,
          lastWidth: width,
          nextRow: row === 0 ? 1 : 0,
        };
      },
      { placed: [], lastX: -Infinity, lastWidth: 0, nextRow: 0 }
    );

  return (
    <section className="panel">
      <h2
        className="panel-title"
        title="Stocks tend to grow more over time but can drop suddenly; bonds/cash grow more slowly but are steadier. This is a plan for shifting the mix between the two as retirement gets closer, so a bad stock-market year right before you retire doesn't wreck your plans — then easing back into stocks during a retirement that could last decades."
      >
        Playing It Safer As You Age (Risk Plan)
      </h2>
      <p className="fund-caption">
        The idea: stay mostly in stocks while retirement is far off, shift toward safer bonds/cash
        as you approach retirement (so a market crash right before you stop working doesn't wreck
        your plans), then gradually add stocks back since a long retirement still needs growth.
        Investing folks sometimes call this a "glide path" or "bond tent" — same thing.
      </p>

      <div className="retire-grid glide-grid">
        <div className="field">
          <label htmlFor="gp-start" title="The age you start moving some money out of stocks and into safer bonds/cash, ahead of retirement.">
            Age you start playing it safer
          </label>
          <input
            id="gp-start"
            type="number"
            value={glidePath.deRiskStartAge}
            onChange={set("deRiskStartAge")}
            title="Age to start gradually shifting out of stocks."
          />
        </div>
        <div className="field">
          <label htmlFor="gp-pre" title="What % of your portfolio is in stocks before you start playing it safer — usually high, since retirement is still far off and there's time to recover from a downturn.">
            % in stocks before then
          </label>
          <input
            id="gp-pre"
            type="number"
            step="1"
            value={glidePath.preEquity}
            onChange={set("preEquity")}
            title="% of your portfolio in stocks before you start playing it safer."
          />
        </div>
        <div className="field">
          <label htmlFor="gp-trough" title="Your lowest planned % in stocks, reached right when you retire — your most protected point, since a market drop right before you start withdrawing money does the most damage.">
            % in stocks right when you retire (safest point)
          </label>
          <input
            id="gp-trough"
            type="number"
            step="1"
            value={glidePath.troughEquity}
            onChange={set("troughEquity")}
            title="% of your portfolio in stocks at the moment you retire — your most cautious point."
          />
        </div>
        <div className="field">
          <label htmlFor="gp-end-age" title="The age by which you finish gradually adding stocks back after retirement, since a retirement lasting decades still needs some growth.">
            Age you're back to a normal mix
          </label>
          <input
            id="gp-end-age"
            type="number"
            value={glidePath.driftEndAge}
            onChange={set("driftEndAge")}
            title="Age by which your % in stocks finishes rising back up after retirement."
          />
        </div>
        <div className="field">
          <label htmlFor="gp-post" title="Your % in stocks once you're back to a normal mix — usually higher than right at retirement, to keep growing through what could be a decades-long retirement.">
            % in stocks at that point
          </label>
          <input
            id="gp-post"
            type="number"
            step="1"
            value={glidePath.postEquity}
            onChange={set("postEquity")}
            title="% of your portfolio in stocks once you're back to a normal mix."
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

          <path d={areaPath} fill="var(--gold-soft, rgba(199,154,75,0.16))" />
          <path d={linePath} fill="none" stroke="var(--gold, #c79a4b)" strokeWidth="2.5" />

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
                y={m.row === 1 ? plotTop - 20 : plotTop - 6}
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
        In plain terms: stay at {gp.preEquity}% in stocks until age {gp.deRiskStartAge}, then gradually
        shift down to {gp.troughEquity}% in stocks by the time you retire (age {retirementAge}) — your
        safest point. After that, gradually add stocks back up to {gp.postEquity}% by age {gp.driftEndAge}{" "}
        as you spend down the safer portion. When you do shift into bonds, doing it inside your 401(k)
        rather than a regular brokerage account avoids an extra tax bill from selling investments there.
      </p>
    </section>
  );
}
