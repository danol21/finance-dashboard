export const FINDINGS_URL =
  "https://raw.githubusercontent.com/danol21/finance-dashboard/main/findings.json";

const RATING_MAP = { "🔴": "act", "🟡": "watch" };

export function findingRatingToTriggerRating(rating) {
  return RATING_MAP[rating] ?? "watch";
}

const CATEGORY_KEYWORDS = [
  { category: "Tax opportunity", pattern: /tax|roth|deduction|withholding|hsa/i },
  { category: "Fee review", pattern: /fee|expense ratio|load\b/i },
  { category: "Rebalance", pattern: /rebalance|allocation|drift/i },
  { category: "Contribution change", pattern: /contribution|limit|deferral|match/i },
];

export function inferCategory(finding) {
  const haystack = `${finding.source ?? ""} ${finding.summary ?? ""} ${finding.suggestedAction ?? ""}`;
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
