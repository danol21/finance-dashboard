// Pulls the single most useful things to act on right now from across the
// dashboard — overdue/soon reminders, unresolved "act now" items, an
// over-the-limit contribution warning, and any "needs attention" health
// card — into one plain-English list at the very top of the page. Everywhere
// else on this dashboard shows numbers and status; this is the one place
// that just says what to do and when, for someone who doesn't want to piece
// that together from four different panels themselves.

const HEALTH_DISPLAY = {
  "Fee drag": "Fees",
  "Allocation drift": "Investment Mix",
  "Tax efficiency": "Right Account for the Job",
  "Contribution room": "Contribution Pace",
};

function daysUntil(dateStr) {
  const ms = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function firstLine(text) {
  if (!text) return "";
  return text.split("\n")[0].trim();
}

export default function NextStepsPanel({ reminders = [], triggers = [], contributionSuggestion, health = {} }) {
  const items = [];

  reminders
    .filter((r) => !r.completed)
    .forEach((r) => {
      const days = daysUntil(r.dueDate);
      if (days <= 0) {
        items.push({ urgent: true, text: `Overdue: ${r.title}`, detail: r.note });
      } else if (days <= 14) {
        items.push({ urgent: false, text: `Due in ${days} day${days === 1 ? "" : "s"}: ${r.title}`, detail: r.note });
      }
    });

  triggers
    .filter((t) => !t.resolved && t.rating === "act")
    .forEach((t) => {
      items.push({ urgent: true, text: firstLine(t.note) || `Something to act on (${t.category})`, detail: null });
    });

  if (contributionSuggestion?.status === "flagged") {
    items.push({ urgent: true, text: contributionSuggestion.reason, detail: null });
  }

  Object.entries(health).forEach(([category, entry]) => {
    if (entry?.status === "flagged") {
      items.push({
        urgent: true,
        text: `Needs attention: ${HEALTH_DISPLAY[category] ?? category}`,
        detail: entry.note,
      });
    }
  });

  const urgentItems = items.filter((i) => i.urgent);
  const soonItems = items.filter((i) => !i.urgent);
  const ordered = [...urgentItems, ...soonItems];

  return (
    <section className="panel next-steps-panel">
      <h2
        className="panel-title"
        title="Pulled together from Reminders, Things to Act On or Watch, Contribution Pace, and the four health cards further down — so you don't have to check each one separately to know what needs doing."
      >
        What Should I Do Right Now?
      </h2>
      {ordered.length === 0 ? (
        <p className="empty-state">
          Nothing urgent right now. Everything below is informational — feel free to look around,
          but there's nothing you need to act on today.
        </p>
      ) : (
        <ul className="next-steps-list">
          {ordered.map((item, i) => (
            <li key={i} className={`next-step-item ${item.urgent ? "next-step-urgent" : "next-step-soon"}`}>
              <span className="next-step-marker">{item.urgent ? "Do this" : "Coming up"}</span>
              <div className="next-step-text">
                <span>{item.text}</span>
                {item.detail && <span className="next-step-detail">{item.detail}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
