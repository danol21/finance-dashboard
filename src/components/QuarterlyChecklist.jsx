const ITEMS = ["Fee drag", "Allocation drift", "Tax efficiency", "Contribution room"];

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
      <h2 className="panel-title">Quarterly Review Checklist</h2>
      <div className="checklist">
        {ITEMS.map((item) => {
          const entry = checklist[item] ?? { completed: false, lastCompleted: "" };
          return (
            <label key={item} className="checklist-row">
              <input
                type="checkbox"
                checked={entry.completed}
                onChange={(e) => toggle(item, e.target.checked)}
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
