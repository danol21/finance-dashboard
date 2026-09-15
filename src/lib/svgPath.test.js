import { describe, expect, it } from "vitest";
import { smoothPathD, smoothAreaD } from "./svgPath";

describe("smoothPathD", () => {
  it("returns an empty string for no points", () => {
    expect(smoothPathD([])).toBe("");
  });

  it("draws a straight line for two points (nothing to smooth)", () => {
    expect(smoothPathD([[0, 0], [10, 10]])).toBe("M 0,0 L 10,10");
  });

  it("starts and ends at the first and last input points for a longer series", () => {
    const points = [[0, 10], [5, 0], [10, 10], [15, 5], [20, 20]];
    const d = smoothPathD(points);
    expect(d.startsWith("M 0,10")).toBe(true);
    expect(d.endsWith("20.00,20.00")).toBe(true);
    // One cubic-bezier segment ("C ...") per gap between consecutive points.
    expect(d.match(/C /g)?.length).toBe(points.length - 1);
  });
});

describe("smoothAreaD", () => {
  it("closes the curve down to the baseline and back to the left edge", () => {
    const points = [[10, 5], [20, 0], [30, 5]];
    const d = smoothAreaD(points, 10, 30, 50);
    expect(d).toContain("L 30,50 L 10,50 Z");
  });
});
