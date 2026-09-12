import { useEffect, useState } from "react";
import {
  fetchFindings,
  findingRatingToTriggerRating,
  inferCategory,
} from "../lib/findings";
import { makeId } from "../lib/storage";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function FindingsSync({ reviewedFindingIds, onMarkReviewed, onAddTrigger }) {
  const [findings, setFindings] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);
  // Ids acted on (Add or Dismiss) this session but not yet reflected in the
  // reviewedFindingIds prop — hides the card immediately and blocks a second
  // click on the same finding before the state update re-renders.
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const runFetch = async () => {
    setChecking(true);
    const results = await fetchFindings();
    setFindings(results);
    setChecking(false);
  };

  useEffect(() => {
    runFetch();
  }, []);

  const newFindings = findings.filter(
    (f) => f.id && !reviewedFindingIds.includes(f.id) && !pendingIds.has(f.id)
  );

  const markPending = (id) => {
    setPendingIds((prev) => new Set(prev).add(id));
  };

  const addToTriggerLog = (finding) => {
    markPending(finding.id);
    onAddTrigger({
      id: makeId("trig"),
      date: todayISO(),
      category: inferCategory(finding),
      note: [finding.summary, finding.suggestedAction].filter(Boolean).join("\n\nSuggested action: "),
      rating: findingRatingToTriggerRating(finding.rating),
      resolved: false,
    });
    onMarkReviewed(finding.id);
  };

  const dismiss = (finding) => {
    markPending(finding.id);
    onMarkReviewed(finding.id);
  };

  return (
    <div className="findings-sync">
      <button
        className="btn btn-ghost sync-check-btn"
        onClick={runFetch}
        disabled={checking}
        type="button"
      >
        {checking ? "Checking…" : "Check for updates"}
      </button>

      {newFindings.length > 0 && (
        <button className="sync-banner" onClick={() => setExpanded((e) => !e)} type="button">
          {newFindings.length} new finding{newFindings.length === 1 ? "" : "s"} from your monthly
          review — Check now
        </button>
      )}

      {expanded && newFindings.length > 0 && (
        <div className="findings-list">
          {newFindings.map((f) => (
            <div key={f.id} className="finding-card">
              <div className="finding-card-header">
                <span className={`rating-badge ${f.rating === "🔴" ? "rating-act" : "rating-watch"}`}>
                  <span className="rating-dot" />
                  {f.rating}
                </span>
                {f.source && <span className="finding-source">{f.source}</span>}
                {f.date && <span className="finding-date">{f.date}</span>}
              </div>
              {f.summary && <p className="finding-summary">{f.summary}</p>}
              {f.suggestedAction && (
                <p className="finding-action">
                  <strong>Suggested action:</strong> {f.suggestedAction}
                </p>
              )}
              {f.url && (
                <a className="finding-link" href={f.url} target="_blank" rel="noreferrer">
                  View source
                </a>
              )}
              <div className="finding-actions">
                <button className="btn btn-ghost" onClick={() => addToTriggerLog(f)} type="button">
                  Add to trigger log
                </button>
                <button className="btn btn-icon-text" onClick={() => dismiss(f)} type="button">
                  Dismiss without logging
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
