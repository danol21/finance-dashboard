import { num, formatCurrencyPrecise } from "../lib/finance";
import { makeId } from "../lib/storage";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function LumpSumEditor({ entries, onChange }) {
  const currentYear = new Date().getFullYear();

  const addEntry = () => {
    onChange([...entries, { id: makeId("lump"), amount: "", date: todayISO() }]);
  };

  const updateEntry = (id, field, value) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeEntry = (id) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const yearTotal = entries.reduce((sum, e) => {
    const inCurrentYear = e.date && new Date(e.date).getFullYear() === currentYear;
    return inCurrentYear ? sum + num(e.amount) : sum;
  }, 0);

  return (
    <div className="lumpsum-editor">
      <div className="lumpsum-editor-header">
        <span>Lump-sum deposits</span>
        <span className="lumpsum-editor-total">
          {formatCurrencyPrecise(yearTotal)} logged for {currentYear}
        </span>
      </div>

      {sorted.length === 0 && <p className="lumpsum-empty">No deposits logged yet.</p>}

      {sorted.map((entry) => {
        const inCurrentYear = entry.date && new Date(entry.date).getFullYear() === currentYear;
        return (
          <div
            key={entry.id}
            className={`lumpsum-entry-row${inCurrentYear ? "" : " lumpsum-entry-other-year"}`}
          >
            <input
              type="date"
              className="cell-input"
              value={entry.date}
              onChange={(e) => updateEntry(entry.id, "date", e.target.value)}
            />
            <input
              className="cell-input cell-num"
              inputMode="decimal"
              value={entry.amount}
              onChange={(e) => updateEntry(entry.id, "amount", e.target.value)}
              placeholder="0.00"
            />
            <span className="lumpsum-entry-note">{inCurrentYear ? "" : "not " + currentYear}</span>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => removeEntry(entry.id)}
              aria-label="Remove deposit"
              title="Remove deposit"
            >
              ✕
            </button>
          </div>
        );
      })}

      <button type="button" className="btn btn-ghost lumpsum-add-btn" onClick={addEntry}>
        + Add deposit
      </button>
    </div>
  );
}
