const STATUSES = [
  { value: "ok", label: "On track" },
  { value: "watch", label: "Watch" },
  { value: "flagged", label: "Flagged" },
];

const CATEGORIES = ["Fee drag", "Allocation drift", "Tax efficiency", "Contribution room"];

export default function HealthPanel({ health, onChange }) {
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
