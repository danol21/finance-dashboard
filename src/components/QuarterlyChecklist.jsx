const ITEMS = ["Fee drag", "Allocation drift", "Tax efficiency", "Contribution room"];

const ITEM_HINTS = {
  "Fee drag": "Check whether fund/account fees are eating into returns more than they should.",
  "Allocation drift": "Check whether your investment mix (and cash levels) still match your plan.",
  "Tax efficiency": "Check whether money is sitting in a tax-inefficient spot.",
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
        title="A simple to-do list to make sure each area of Structural Health actually gets looked at every quarter, not just left on 'On track' indefinitely."
      >
        Quarterly Review Checklist
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
                title="Check off once you've reviewed this for the current quarter."
              />
              <span className="checklist-label">{item}</span>
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
