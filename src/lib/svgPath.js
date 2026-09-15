// Converts a dense array of [x, y] points into a smooth SVG path using a
// Catmull-Rom-to-Bezier spline. The curve passes through every input point
// exactly (unlike a fitted/approximating spline) — it just rounds off the
// straight-line segments between them, so a chart built from real data
// points reads as a smooth curve instead of a series of sharp angles.
export function smoothPathD(points) {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return `M ${points.map(([x, y]) => `${x},${y}`).join(" L ")}`;
  }
  const n = points.length;
  const at = (i) => points[Math.max(0, Math.min(n - 1, i))];
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [p0x, p0y] = at(i - 1);
    const [p1x, p1y] = at(i);
    const [p2x, p2y] = at(i + 1);
    const [p3x, p3y] = at(i + 2);
    const cp1x = p1x + (p2x - p0x) / 6;
    const cp1y = p1y + (p2y - p0y) / 6;
    const cp2x = p2x - (p3x - p1x) / 6;
    const cp2y = p2y - (p3y - p1y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2x.toFixed(2)},${p2y.toFixed(2)}`;
  }
  return d;
}

// Same curve as smoothPathD, closed into a filled area sitting on `baseY`
// (the chart's bottom axis) — for the shaded fill under a line chart.
export function smoothAreaD(points, plotLeft, plotRight, baseY) {
  if (points.length === 0) return "";
  const line = smoothPathD(points);
  return `${line} L ${plotRight},${baseY} L ${plotLeft},${baseY} Z`;
}
