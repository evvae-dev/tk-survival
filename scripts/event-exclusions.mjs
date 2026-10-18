export function applyEventExclusions(entries, exclusions) {
  const removed = new Set(Object.keys(exclusions));
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  return entries.filter(entry => !removed.has(entry.id)).map(entry => {
    if (!entry.parentId || !removed.has(entry.parentId)) return entry;
    let parentId = entry.parentId;
    while (parentId && removed.has(parentId)) parentId = byId.get(parentId)?.parentId ?? null;
    return { ...entry, parentId };
  });
}
