import narrative from '@/data/history/narrative-5-1.json';

// Older saves sometimes stored only the option's intention after the check summary.
const scenes = [...Object.values(narrative.commonChoices), ...Object.values(narrative.events).flatMap(event => Object.values(event.choices))];
const intentions = new Set(scenes.flatMap(scene => Object.values(scene.options as Record<string, string[]>).map(option => option[1])));
const bridgeChecks = Object.values(narrative.events).flatMap(event => Object.values('checks' in event ? event.checks : {})) as { success: string; failure: string; successNarrative?: string; failureNarrative?: string }[];

// Hide mechanical headings only when there is actual result prose to read.
export function narrativeText(text: string) {
  text = text.replaceAll('원사서 미대조 · 2차 자료 요약: ', '').replaceAll('수집본 기본 경과: ', '').replaceAll('연의 기본 경과: ', '');
  const lines = text.split(/\n+/).filter(Boolean);
  const outcome = lines.find(line => /^(성공|실패) · /.test(line));
  const body = lines.filter(line => !/^(성공|실패) · /.test(line)).join('\n\n').trim();
  let result = body;
  if (outcome && (!body || intentions.has(body))) {
    const summary = outcome.replace(/^(성공|실패) · /, '');
    const check = bridgeChecks.find(check => check.success === summary || check.failure === summary);
    result = (check?.success === summary ? check.successNarrative : check?.failureNarrative) || summary;
  }
  return result.replace(/ · /g, ' ').trim();
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
