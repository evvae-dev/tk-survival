// Result prose is persisted by the engine; never reconstruct it from intentions.
export function narrativeText(text:string) {
 const lines=text.split(/\n+/).filter(Boolean);
 const body=lines.filter(line=>!/^(성공|실패) · /.test(line)).join('\n\n').trim();
 return (body||lines.join(' ')).replace(/ · /g,' ');
}

// Only confirmed chapter participants are recognized. Ordinary words that also
// happen to be officer names must never become automatic person links.
export function personSegments(text: string, names: string[]) {
  const ambiguous = new Set(['사정','봉기','조정','전해','유주']);
  const candidates = [...new Set(names)].filter(name => !['장수','전의','추정','서구'].includes(name)).filter(name => !['사정','봉기','조정','전해','유주'].includes(name) || new RegExp(`(?:장수|장군|관리) ${name}|${name} (?:장군|장수|태수)`).test(text)).filter(name => name !== '장비' || /관우|유비|장비 장군/.test(text)).sort((a, b) => b.length - a.length);
  if (!candidates.length) return [{ text, person: undefined as string | undefined }];
  const pattern = new RegExp(`(${candidates.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  let offset = 0;
  return text.split(pattern).filter(Boolean).map(part => {
    const start = offset;
    const preceding = text[start - 1] ?? '';
    offset += part.length;
    const explicitPerson = !ambiguous.has(part) || /(?:장수|장군|관리) $/.test(text.slice(0,start)) || /^ (?:장군|장수|태수)/.test(text.slice(offset));
    return { text: part, person: candidates.includes(part) && explicitPerson && !/[가-힣]/.test(preceding) ? part : undefined };
  });
}
