export const FINDINGS_URL =
  "https://raw.githubusercontent.com/danol21/finance-dashboard/main/findings.json";

const RATING_MAP = { "🔴": "act", "🟡": "watch", "🟢": "none" };

export function findingRatingToTriggerRating(rating) {
  return RATING_MAP[rating] ?? "watch";
}

const CATEGORY_KEYWORDS = [
  { category: "Tax opportunity", pattern: /tax|roth|deduction|withholding|hsa/i },
  { category: "Fee review", pattern: /fee|expense ratio|load\b/i },
  { category: "Rebalance", pattern: /rebalance|allocation|drift/i },
  { category: "Contribution change", pattern: /contribution|limit|deferral|match/i },
];

// A finding sourced from general research/analysis (a synthesis of ideas, not a
// specific fund, account, or rebalance action) should land in "Other" even if
// its summary happens to use portfolio-jargon words like "drift" or
// "allocation" in a non-actionable sense (e.g. describing a glide path).
const RESEARCH_SOURCE_PATTERN = /research|analysis|synthesis/i;

export function inferCategory(finding) {
  const source = finding.source ?? "";
  if (RESEARCH_SOURCE_PATTERN.test(source)) return "Other";
  const haystack = `${source} ${finding.summary ?? ""} ${finding.suggestedAction ?? ""}`;
  const hit = CATEGORY_KEYWORDS.find(({ pattern }) => pattern.test(haystack));
  return hit ? hit.category : "Other";
}

export async function fetchFindings() {
  try {
    const res = await fetch(FINDINGS_URL, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (err) {
    return [];
  }
}
