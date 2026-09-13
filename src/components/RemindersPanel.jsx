import { useState } from "react";
import { makeId } from "../lib/storage";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  const ms = new Date(dateStr).getTime() - new Date(todayISO()).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function RemindersPanel({ reminders, onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const active = reminders
    .filter((r) => !r.completed)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  if (active.length === 0 && !showAdd) {
    return (
      <section className="panel reminders-panel">
        <div className="panel-header-row">
          <h2 className="panel-title">Reminders</h2>
          <button className="btn btn-ghost" onClick={() => setShowAdd(true)} type="button">
            + Add reminder
          </button>
        </div>
        <p className="empty-state">No upcoming reminders.</p>
      </section>
    );
  }

  const complete = (id) =>
    onChange(reminders.map((r) => (r.id === id ? { ...r, completed: true } : r)));

  const addReminder = () => {
    if (!newDate || !newTitle.trim()) return;
    onChange([...reminders, { id: makeId("rem"), dueDate: newDate, title: newTitle.trim(), note: "", completed: false }]);
    setNewDate("");
    setNewTitle("");
    setShowAdd(false);
  };

  return (
    <section className="panel reminders-panel">
      <div className="panel-header-row">
        <h2 className="panel-title">Reminders</h2>
        <button className="btn btn-ghost" onClick={() => setShowAdd((s) => !s)} type="button">
          + Add reminder
        </button>
      </div>

      <div className="reminders-list">
        {active.map((r) => {
          const days = daysUntil(r.dueDate);
          const urgency = days <= 0 ? "reminder-overdue" : days <= 30 ? "reminder-soon" : "reminder-later";
          const dayLabel =
            days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue` :
            days === 0 ? "Due today" :
            `in ${days} day${days === 1 ? "" : "s"}`;
          return (
            <div key={r.id} className={`reminder-row ${urgency}`}>
              <div className="reminder-main">
                <span className="reminder-title">{r.title}</span>
                {r.note && <span className="reminder-note">{r.note}</span>}
              </div>
              <span className="reminder-due">
                {r.dueDate} · {dayLabel}
              </span>
              <button className="btn btn-ghost reminder-done-btn" onClick={() => complete(r.id)} type="button">
                Done
              </button>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="reminder-add-form">
          <input
            type="date"
            className="cell-input"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <input
            type="text"
            className="cell-input"
            placeholder="What do you need to remember?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button className="btn btn-ghost" onClick={addReminder} type="button">
            Save
          </button>
        </div>
      )}
    </section>
  );
}
