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

// A finding that explicitly says no action is needed should never land in an
// action-implying category (Rebalance, Fee review, Contribution change, Tax
// opportunity) just because its summary or suggestedAction text happens to
// contain that category's keyword — e.g. "already carries a 30% international
// allocation" describing existing state, not an action to take.
const NO_ACTION_PATTERN = /^(none|no action)\b/i;

function isNoActionFinding(finding) {
  return NO_ACTION_PATTERN.test((finding.suggestedAction ?? "").trim());
}

export function inferCategory(finding) {
  const source = finding.source ?? "";
  if (RESEARCH_SOURCE_PATTERN.test(source)) return "Other";
  if (isNoActionFinding(finding)) return "Other";
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
