import { describe, expect, it } from "vitest";
import { mergeSourceActivity } from "./sourceActivity";

describe("mergeSourceActivity", () => {
  it("creates a new entry for a source seen for the first time", () => {
    const result = mergeSourceActivity(
      {},
      [{ id: "f1", source: "Podcast A", url: "https://a.example", date: "2026-01-01" }],
      "2026-01-02T00:00:00Z"
    );
    expect(result["Podcast A"]).toEqual({
      url: "https://a.example",
      totalFindings: 1,
      seenIds: ["f1"],
      lastFindingDate: "2026-01-01",
      lastSeenInSyncAt: "2026-01-02T00:00:00Z",
    });
  });

  it("updates lastSeenInSyncAt even when nothing new was found", () => {
    const existing = mergeSourceActivity(
      {},
      [{ id: "f1", source: "Podcast A", date: "2026-01-01" }],
      "2026-01-02T00:00:00Z"
    );
    const result = mergeSourceActivity(existing, [{ id: "f1", source: "Podcast A", date: "2026-01-01" }], "2026-02-01T00:00:00Z");
    expect(result["Podcast A"].totalFindings).toBe(1);
    expect(result["Podcast A"].lastSeenInSyncAt).toBe("2026-02-01T00:00:00Z");
  });

  it("does not double-count a finding id seen across multiple checks", () => {
    let activity = mergeSourceActivity({}, [{ id: "f1", source: "X", date: "2026-01-01" }], "t1");
    activity = mergeSourceActivity(activity, [{ id: "f1", source: "X", date: "2026-01-01" }, { id: "f2", source: "X", date: "2026-01-05" }], "t2");
    expect(activity["X"].totalFindings).toBe(2);
    expect(activity["X"].lastFindingDate).toBe("2026-01-05");
  });

  it("ignores findings with no source", () => {
    const result = mergeSourceActivity({}, [{ id: "f1", date: "2026-01-01" }], "t1");
    expect(result).toEqual({});
  });

  it("tracks multiple sources independently", () => {
    const result = mergeSourceActivity(
      {},
      [
        { id: "f1", source: "A", date: "2026-01-01" },
        { id: "f2", source: "B", date: "2026-01-02" },
      ],
      "t1"
    );
    expect(Object.keys(result).sort()).toEqual(["A", "B"]);
  });
});
