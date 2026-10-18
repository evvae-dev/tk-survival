export function linkOfficers(entries, officers, decisions = {}, inferences = {}) {
  const byName = new Map();
  for (const officer of officers) byName.set(officer.name, [...(byName.get(officer.name) ?? []), officer]);
  const entryIds = new Set(entries.map(entry => entry.id));
  for (const [entryId, selections] of Object.entries(decisions)) {
    if (!entryIds.has(entryId)) throw new Error(`장수 연결 결정의 사건이 없습니다: ${entryId}`);
    const entry = entries.find(item => item.id === entryId);
    for (const [name, selectedId] of Object.entries(selections)) {
      if (!entry.relatedPeople.includes(name)) throw new Error(`사건에 없는 인물의 연결 결정: ${entryId} / ${name}`);
      if (selectedId !== null && !byName.get(name)?.some(officer => officer.id === selectedId)) throw new Error(`후보에 없는 장수 ID: ${entryId} / ${name} / ${selectedId}`);
    }
  }
  for (const [entryId, selections] of Object.entries(inferences)) {
    const entry = entries.find(item => item.id === entryId);
    if (!entry) throw new Error(`추정 대상 사건이 없습니다: ${entryId}`);
    for (const [name, inference] of Object.entries(selections)) {
      if (decisions[entryId] && Object.hasOwn(decisions[entryId], name)) continue;
      if (!entry.relatedPeople.includes(name) || !byName.get(name)?.some(officer => officer.id === inference.officerId)) throw new Error(`추정 후보 ID가 올바르지 않습니다: ${entryId} / ${name}`);
      if (!['lifespan', 'context'].includes(inference.method) || !inference.reason?.trim()) throw new Error(`추정 근거가 없습니다: ${entryId} / ${name}`);
      if (inference.method === 'lifespan') {
        const candidates = byName.get(name).filter(officer => Number.isInteger(officer.birthYear) && Number.isInteger(officer.deathYear) && officer.birthYear <= entry.year && entry.year <= officer.deathYear);
        if (candidates.length !== 1 || candidates[0].id !== inference.officerId) throw new Error(`생몰년으로 단일 후보를 확인할 수 없습니다: ${entryId} / ${name}`);
      }
    }
  }
  return entries.map(entry => {
    const relatedOfficerIds = [];
    const officerLinkIssues = [];
    const officerLinkInferences = [];
    for (const name of [...new Set(entry.relatedPeople)]) {
      const candidates = byName.get(name) ?? [];
      const selection = decisions[entry.id];
      if (selection && Object.hasOwn(selection, name)) {
        if (selection[name] === null) officerLinkIssues.push({ name, reason: 'excluded', candidateOfficerIds: candidates.map(item => item.id) });
        else relatedOfficerIds.push(selection[name]);
      } else if (inferences[entry.id]?.[name]) {
        const inference = inferences[entry.id][name];
        relatedOfficerIds.push(inference.officerId);
        officerLinkInferences.push({ name, ...inference });
      } else if (candidates.length === 1) relatedOfficerIds.push(candidates[0].id);
      else officerLinkIssues.push({ name, reason: candidates.length ? 'ambiguous' : 'not-found', candidateOfficerIds: candidates.map(item => item.id) });
    }
    return { ...entry, relatedOfficerIds: [...new Set(relatedOfficerIds)], officerLinkIssues, officerLinkInferences };
  });
}
