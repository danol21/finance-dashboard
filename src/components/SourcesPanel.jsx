// The audit trail: which sources the automated findings scan actually
// covers, whether each one is still being checked, and what came of what it
// found. Everything here is derived automatically from sourceActivity
// (updated on every check — see FindingsSync) and from triggers tagged with
// a `source` field — there's nothing to maintain by hand.

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export default function SourcesPanel({ sourceActivity = {}, triggers = [] }) {
  const sources = Object.entries(sourceActivity)
    .map(([name, info]) => {
      const related = triggers
        .filter((t) => t.source === name)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      const unresolvedCount = related.filter((t) => !t.resolved).length;
      return {
        name,
        url: info.url ?? null,
        totalFindings: info.totalFindings ?? 0,
        lastFindingDate: info.lastFindingDate ?? null,
        lastCheckedAt: info.lastSeenInSyncAt ?? null,
        unresolvedCount,
        recent: related.slice(0, 3),
      };
    })
    .sort((a, b) => (b.lastCheckedAt ?? "").localeCompare(a.lastCheckedAt ?? ""));

  return (
    <section className="panel">
      <h2
        className="panel-title"
        title="Every source your automated scan pulls from, and whether it's actually still being checked — not just what it's found, but whether it's still turning up in the feed at all."
      >
        Sources &amp; Audit Trail
      </h2>
      <p className="fund-caption">
        Built automatically every time your findings feed is checked — each source's "last checked"
        date updates whether or not it produced anything new. A source that's gone quiet for a long
        time may mean it's stopped being covered by the scan, not that everything there is fine.
      </p>

      {sources.length === 0 ? (
        <p className="empty-state">
          Nothing tracked yet — this fills in the first time your automated scan runs and reports a
          named source.
        </p>
      ) : (
        <div className="sources-list">
          {sources.map((s) => (
            <div key={s.name} className="source-row">
              <div className="source-header">
                <span className="source-name">
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}
                </span>
                <span
                  className="source-stat"
                  title="How many findings this source has ever produced, and how many of those are still unresolved in Things to Act On or Watch."
                >
                  {s.totalFindings} finding{s.totalFindings === 1 ? "" : "s"} ever
                  {s.unresolvedCount > 0 ? ` · ${s.unresolvedCount} still open` : ""}
                </span>
              </div>
              <div className="source-dates">
                <span title="The most recent date this source actually produced a finding.">
                  Last found something: {formatDate(s.lastFindingDate)}
                </span>
                <span title="The most recent time your automated scan checked this source at all, whether or not anything new turned up that time.">
                  Last checked: {formatDate(s.lastCheckedAt)}
                </span>
              </div>
              {s.recent.length > 0 && (
                <ul className="source-history">
                  {s.recent.map((t) => (
                    <li key={t.id} className={t.resolved ? "source-history-resolved" : ""}>
                      <span className="source-history-date">{t.date || "—"}</span>
                      <span className="source-history-note">{(t.note || "").split("\n")[0]}</span>
                      <span className="source-history-status">{t.resolved ? "Resolved" : "Still open"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
