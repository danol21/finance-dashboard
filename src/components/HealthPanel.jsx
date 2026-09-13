const STATUSES = [
  { value: "ok", label: "On track" },
  { value: "watch", label: "Watch" },
  { value: "flagged", label: "Flagged" },
];

const CATEGORIES = ["Fee drag", "Allocation drift", "Tax efficiency", "Contribution room"];

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

const statusLabel = (value) => STATUSES.find((s) => s.value === value)?.label ?? value;

function suggestStatus(category, triggers) {
  const relevantCategories = TRIGGER_CATEGORIES_FOR_HEALTH[category] ?? [];
  const relevant = triggers.filter((t) => !t.resolved && relevantCategories.includes(t.category));
  if (relevant.some((t) => t.rating === "act")) {
    return { status: "flagged", count: relevant.length };
  }
  if (relevant.some((t) => t.rating === "watch")) {
    return { status: "watch", count: relevant.length };
  }
  return null;
}

export default function HealthPanel({ health, onChange, triggers = [] }) {
  const updateCategory = (category, field, value) => {
    onChange({
      ...health,
      [category]: { ...health[category], [field]: value },
    });
  };

  return (
    <section className="panel">
      <h2 className="panel-title">Structural Health</h2>
      <div className="health-grid">
        {CATEGORIES.map((category) => {
          const entry = health[category] ?? { status: "ok", note: "", updated: "" };
          const suggestion = suggestStatus(category, triggers);
          const suggestionDiffers = suggestion && suggestion.status !== entry.status;
          return (
            <div key={category} className={`health-card health-${entry.status}`}>
              <div className="health-card-header">
                <span className="health-card-title">{category}</span>
                <select
                  className="status-select"
                  value={entry.status}
                  onChange={(e) => updateCategory(category, "status", e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {suggestionDiffers && (
                <div className="health-suggestion">
                  <span>
                    Suggested: <strong>{statusLabel(suggestion.status)}</strong> ({suggestion.count}{" "}
                    unresolved finding{suggestion.count === 1 ? "" : "s"})
                  </span>
                  <button
                    className="btn btn-ghost btn-suggestion-apply"
                    type="button"
                    onClick={() => updateCategory(category, "status", suggestion.status)}
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
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
