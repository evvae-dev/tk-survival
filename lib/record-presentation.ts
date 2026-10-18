// Keep prose separate from the mechanical outcome summary.
export function narrativeText(text: string) {
  return text.split(/\n+/).filter(line => !/^(성공|실패) · /.test(line)).join('\n\n').replace(/ · /g, ' ').trim();
}

// Only confirmed chapter participants are recognized. Ordinary words that also
// happen to be officer names must never become automatic person links.
export function personSegments(text: string, names: string[]) {
  const candidates = [...new Set(names)].filter(name => !['장수', '전의', '추정', '서구', '유언'].includes(name)).filter(name => name !== '장비' || /관우|유비|장비 장군/.test(text)).sort((a, b) => b.length - a.length);
  if (!candidates.length) return [{ text, person: undefined as string | undefined }];
  const pattern = new RegExp(`(${candidates.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  let offset = 0;
  return text.split(pattern).filter(Boolean).map(part => {
    const preceding = text[offset - 1] ?? '';
    offset += part.length;
    return { text: part, person: candidates.includes(part) && !/[가-힣]/.test(preceding) ? part : undefined };
  });
}
