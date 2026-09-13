import { useEffect, useRef, useState } from "react";
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
  const [justLogged, setJustLogged] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);

  // Tracks ids already processed this session, updated synchronously so two
  // overlapping fetches (e.g. React StrictMode's dev-only double effect, or a
  // fast double click) can't both add the same finding before state re-renders.
  const processedIdsRef = useRef(new Set(reviewedFindingIds));

  useEffect(() => {
    reviewedFindingIds.forEach((id) => processedIdsRef.current.add(id));
  }, [reviewedFindingIds]);

  const runFetch = async () => {
    setChecking(true);
    const results = await fetchFindings();
    const newOnes = results.filter((f) => f.id && !processedIdsRef.current.has(f.id));
    newOnes.forEach((f) => processedIdsRef.current.add(f.id));

    newOnes.forEach((finding) => {
      onAddTrigger({
        id: makeId("trig"),
        date: todayISO(),
        category: inferCategory(finding),
        note: [finding.summary, finding.suggestedAction]
          .filter(Boolean)
          .join("\n\nSuggested action: "),
        rating: findingRatingToTriggerRating(finding.rating),
        resolved: false,
      });
      onMarkReviewed(finding.id);
    });

    if (newOnes.length > 0) {
      setJustLogged((prev) => [...newOnes, ...prev]);
    }
    setChecking(false);
  };

  useEffect(() => {
    runFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {justLogged.length > 0 && (
        <button className="sync-banner" onClick={() => setExpanded((e) => !e)} type="button">
          {justLogged.length} new finding{justLogged.length === 1 ? "" : "s"} auto-added to your
          trigger log — {expanded ? "hide" : "view them"}
        </button>
      )}

      {expanded && justLogged.length > 0 && (
        <div className="findings-list">
          {justLogged.map((f) => (
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
              <p className="finding-logged-note">
                Added to the trigger log below. Edit or delete it there if it doesn't apply.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
