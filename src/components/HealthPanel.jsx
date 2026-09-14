const STATUSES = [
  { value: "ok", label: "On track" },
  { value: "watch", label: "Keep an eye on it" },
  { value: "flagged", label: "Needs attention" },
];

// These four strings are the actual storage keys for saved health/checklist
// data (see seedData.js) — changing them would silently disconnect existing
// saved statuses/notes from the categories shown here. Only the *display*
// text (CATEGORY_DISPLAY) is meant to be reworded.
const CATEGORIES = ["Fee drag", "Allocation drift", "Tax efficiency", "Contribution room"];

const CATEGORY_DISPLAY = {
  "Fee drag": "Fees",
  "Allocation drift": "Investment Mix",
  "Tax efficiency": "Right Account for the Job",
  "Contribution room": "Contribution Pace",
};

const CATEGORY_HINTS = {
  "Fee drag": "How much you're paying in fund and account fees overall — lower is better.",
  "Allocation drift": "Whether your investments have wandered from your plan — includes cash sitting uninvested and returns lagging behind.",
  "Tax efficiency": "Whether money is sitting in the wrong kind of account for tax purposes (e.g. an investment that generates a lot of taxable income sitting in a regular brokerage account instead of a retirement account).",
  "Contribution room": "Whether you're on pace to put in a healthy amount this year, without going over the IRS limit.",
};

// Which Trigger Log categories feed a suggested status for each health card.
// Cash management and Performance findings don't have a dedicated health
// card, so they fold into Allocation drift — both are ultimately about how
// the portfolio is positioned, not fees, taxes, or contribution pacing.
const TRIGGER_CATEGORIES_FOR_HEALTH = {
  "Fee drag": ["Fee review"],
  "Allocation drift": ["Rebalance", "Cash management", "Performance"],
  "Tax efficiency": ["Tax opportunity"],
  "Contribution room": ["Contribution change"],
};

const STATUS_RANK = { flagged: 2, watch: 1 };

const statusLabel = (value) => STATUSES.find((s) => s.value === value)?.label ?? value;

// `directSuggestion` is Contribution Limits' own red/yellow pacing status
// (see lib/contributionLimits.js) — it's folded in here so "Contribution
// room" can't silently show On track while the Contribution Limits panel
// above is showing a red "projected to exceed limit" warning. Previously
// this card only lit up if someone had separately logged a matching Trigger
// Log entry by hand, which meant a real over-the-limit warning could sit
// unflagged here until someone noticed and logged it themselves.
function suggestStatus(category, triggers, directSuggestion) {
  const relevantCategories = TRIGGER_CATEGORIES_FOR_HEALTH[category] ?? [];
  const relevant = triggers.filter((t) => !t.resolved && relevantCategories.includes(t.category));
  const candidates = [];
  if (relevant.some((t) => t.rating === "act")) {
    candidates.push({ status: "flagged", reason: `${relevant.length} unresolved finding${relevant.length === 1 ? "" : "s"}` });
  } else if (relevant.some((t) => t.rating === "watch")) {
    candidates.push({ status: "watch", reason: `${relevant.length} unresolved finding${relevant.length === 1 ? "" : "s"}` });
  }
  if (category === "Contribution room" && directSuggestion) {
    candidates.push(directSuggestion);
  }
  return candidates.reduce(
    (best, c) => (!best || STATUS_RANK[c.status] > STATUS_RANK[best.status] ? c : best),
    null
  );
}

export default function HealthPanel({ health, onChange, triggers = [], contributionSuggestion = null }) {
  const updateCategory = (category, field, value) => {
    onChange({
      ...health,
      [category]: { ...health[category], [field]: value },
    });
  };

  return (
    <section className="panel">
      <h2
        className="panel-title"
        title="Four things worth checking on regularly. Each card's status is your own call — On Track, Watch, or Flagged — and you can accept a suggested status if one shows up below it."
      >
        Four Things Worth Checking On
      </h2>
      <div className="health-grid">
        {CATEGORIES.map((category) => {
          const entry = health[category] ?? { status: "ok", note: "", updated: "" };
          const suggestion = suggestStatus(
            category,
            triggers,
            category === "Contribution room" ? contributionSuggestion : null
          );
          const suggestionDiffers = suggestion && suggestion.status !== entry.status;
          return (
            <div key={category} className={`health-card health-${entry.status}`}>
              <div className="health-card-header">
                <span className="health-card-title" title={CATEGORY_HINTS[category]}>
                  {CATEGORY_DISPLAY[category] ?? category}
                </span>
                <select
                  className="status-select"
                  value={entry.status}
                  onChange={(e) => updateCategory(category, "status", e.target.value)}
                  title="Your own call on this — On track, Watch, or Flagged. Set automatically to match a suggestion below only if you click Apply."
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {suggestionDiffers && (
                <div
                  className="health-suggestion"
                  title="Based on unresolved items in the Trigger Log and/or your Contribution Limits pacing — doesn't change anything until you click Apply."
                >
                  <span>
                    Suggested: <strong>{statusLabel(suggestion.status)}</strong> ({suggestion.reason})
                  </span>
                  <button
                    className="btn btn-ghost btn-suggestion-apply"
                    type="button"
                    onClick={() => updateCategory(category, "status", suggestion.status)}
                    title="Set this card's status to match the suggestion."
                  >
                    Apply
                  </button>
                </div>
              )}
              <textarea
                className="health-note"
                value={entry.note}
                onChange={(e) => updateCategory(category, "note", e.target.value)}
                placeholder="Notes..."
                rows={3}
                title={entry.note || "Your own notes on why this is at its current status."}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
