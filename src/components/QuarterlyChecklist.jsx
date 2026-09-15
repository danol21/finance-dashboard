// These match the storage keys used by Structural Health above (see
// HealthPanel.jsx) — keep them in sync, and only reword the display labels.
const ITEMS = ["Fee drag", "Allocation drift", "Tax efficiency", "Contribution room"];

const ITEM_DISPLAY = {
  "Fee drag": "Fees",
  "Allocation drift": "Investment Mix",
  "Tax efficiency": "Right Account",
  "Contribution room": "Contribution Pace",
};

const ITEM_HINTS = {
  "Fee drag": "Check whether fund and account fees are eating into your returns more than they should.",
  "Allocation drift": "Check whether your investment mix (and any uninvested cash) still matches your plan.",
  "Tax efficiency": "Check whether money is sitting in the wrong kind of account for tax purposes.",
  "Contribution room": "Check whether you're on pace to use this year's contribution limits without going over.",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function QuarterlyChecklist({ checklist, onChange }) {
  const toggle = (item, checked) => {
    onChange({
      ...checklist,
      [item]: {
        ...checklist[item],
        completed: checked,
        lastCompleted: checked ? todayISO() : checklist[item]?.lastCompleted ?? "",
      },
    });
  };

  return (
    <section className="panel">
      <h2
        className="panel-title"
        title="A simple to-do list so each of the four things above actually gets looked at every few months, instead of being left alone indefinitely."
      >
        Every-Few-Months Check-In
      </h2>
      <div className="checklist">
        {ITEMS.map((item) => {
          const entry = checklist[item] ?? { completed: false, lastCompleted: "" };
          return (
            <label key={item} className="checklist-row" title={ITEM_HINTS[item]}>
              <input
                type="checkbox"
                checked={entry.completed}
                onChange={(e) => toggle(item, e.target.checked)}
                title="Check this off once you've looked this over for now."
              />
              <span className="checklist-label">{ITEM_DISPLAY[item] ?? item}</span>
              <span className="checklist-last">
                {entry.lastCompleted ? `Last completed ${entry.lastCompleted}` : "Not yet reviewed"}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
