// Merges one findings-feed check's full result set into the accumulated
// per-source activity record (see seedData.sourceActivity). Called on every
// check — not just when it turns up something new — so "last checked" stays
// accurate even for a quiet source, and "total findings" only counts each
// finding id once no matter how many times it's re-fetched.
export function mergeSourceActivity(existingActivity, results, syncedAt) {
  const next = { ...existingActivity };
  results.forEach((f) => {
    const name = f.source;
    if (!name) return;
    const prior = next[name] ?? {
      url: null,
      totalFindings: 0,
      seenIds: [],
      lastFindingDate: null,
      lastSeenInSyncAt: null,
    };
    const seenIds = new Set(prior.seenIds);
    const isNewFinding = Boolean(f.id) && !seenIds.has(f.id);
    if (f.id) seenIds.add(f.id);
    const dates = [prior.lastFindingDate, f.date].filter(Boolean).sort();
    next[name] = {
      url: f.url ?? prior.url,
      totalFindings: prior.totalFindings + (isNewFinding ? 1 : 0),
      seenIds: [...seenIds],
      lastFindingDate: dates.length > 0 ? dates[dates.length - 1] : null,
      lastSeenInSyncAt: syncedAt,
    };
  });
  return next;
}
