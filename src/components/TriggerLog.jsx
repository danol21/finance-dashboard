import { makeId } from "../lib/storage";

const CATEGORIES = [
  "Tax opportunity",
  "Rebalance",
  "Fee review",
  "Contribution change",
  "Cash management",
  "Performance",
  "Other",
];

const RATINGS = [
  { value: "act", emoji: "🔴", label: "Act now", order: 0, className: "rating-act" },
  { value: "watch", emoji: "🟡", label: "Log & monitor", order: 1, className: "rating-watch" },
  { value: "none", emoji: "🟢", label: "No action", order: 2, className: "rating-none" },
];

const ratingByValue = Object.fromEntries(RATINGS.map((r) => [r.value, r]));

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TriggerLog({ triggers, onChange }) {
  const sorted = [...triggers].sort((a, b) => {
    const ratingA = ratingByValue[a.rating ?? "watch"]?.order ?? 1;
    const ratingB = ratingByValue[b.rating ?? "watch"]?.order ?? 1;
    if (ratingA !== ratingB) return ratingA - ratingB;
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return a.date < b.date ? 1 : -1;
  });

  const updateEntry = (id, field, value) => {
    onChange(triggers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const addEntry = () => {
    onChange([
      {
        id: makeId("trig"),
        date: todayISO(),
        category: CATEGORIES[0],
        note: "",
        rating: "watch",
        resolved: false,
      },
      ...triggers,
    ]);
  };

  const removeEntry = (id) => {
    onChange(triggers.filter((t) => t.id !== id));
  };

  return (
    <section className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">Trigger Log</h2>
        <button className="btn btn-ghost" onClick={addEntry} type="button">
          + Add entry
        </button>
      </div>

      <div className="trigger-list">
        {sorted.length === 0 && <p className="empty-state">No entries yet.</p>}
        {sorted.map((t) => {
          const rating = ratingByValue[t.rating ?? "watch"] ?? ratingByValue.watch;
          return (
            <div key={t.id} className={`trigger-row ${t.resolved ? "trigger-resolved" : ""}`}>
              <span className={`rating-badge ${rating.className}`} title={rating.label}>
                <span className="rating-dot" />
                {rating.emoji}
              </span>
              <input
                type="date"
                className="cell-input trigger-date"
                value={t.date}
                onChange={(e) => updateEntry(t.id, "date", e.target.value)}
              />
              <select
                className="cell-input trigger-category"
                value={t.category}
                onChange={(e) => updateEntry(t.id, "category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="cell-input trigger-rating"
                value={t.rating ?? "watch"}
                onChange={(e) => updateEntry(t.id, "rating", e.target.value)}
              >
                {RATINGS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.emoji} {r.label}
                  </option>
                ))}
              </select>
              <textarea
                className="cell-input trigger-note"
                value={t.note}
                onChange={(e) => updateEntry(t.id, "note", e.target.value)}
                placeholder="What triggered this, and what to do about it..."
                rows={2}
              />
              <label className="trigger-resolved-toggle">
                <input
                  type="checkbox"
                  checked={t.resolved}
                  onChange={(e) => updateEntry(t.id, "resolved", e.target.checked)}
                />
                Resolved
              </label>
              <button
                className="btn btn-icon"
                onClick={() => removeEntry(t.id)}
                type="button"
                aria-label="Remove entry"
                title="Remove entry"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
