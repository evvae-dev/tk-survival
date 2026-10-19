import { readFileSync } from 'node:fs';

const narrative = JSON.parse(readFileSync(new URL('../data/history/narrative-5-1.json', import.meta.url), 'utf8'));
const conquestArtwork = JSON.parse(readFileSync(new URL('../data/history/conquest-artwork.json', import.meta.url), 'utf8'));

export function applyChapterNarrative(catalog) {
  const events = structuredClone(catalog);
  for (const event of events) {
    // Follow-up chapters and recruitment are authored in campaign-narrative / campaign-flows.
    if (event.chapterId !== 'chapter-5-1-yellow-turban' || event.id === 'chapter-5-1-service') continue;
    const story = narrative.events[event.id];
    if (!story || !event.flow) throw new Error(`5.1 문구 정의가 없습니다: ${event.id}`);
    const render = text => text.replaceAll('{place}', story.place ?? '마을');
    event.title = story.title;
    for (const node of event.flow.nodes) {
      if (node.type === 'start') node.data.label = story.title;
      if (node.type === 'choice') {
        const scene = story.choices[node.id] ?? narrative.commonChoices[node.id];
        if (!scene) throw new Error(`선택 상황문이 없습니다: ${event.id}/${node.id}`);
        node.data.label = scene.label;
        node.data.text = render(scene.text);
        if (event.id === 'chapter-5-1-yellow-conquest' && node.data.artwork === undefined && conquestArtwork.scenes[node.id]) node.data.artwork = structuredClone(conquestArtwork.scenes[node.id]);
        for (const option of node.data.options ?? []) {
          const wording = scene.options[option.id];
          if (!wording) throw new Error(`선택 문구가 없습니다: ${event.id}/${node.id}/${option.id}`);
          [option.title, option.description] = wording;
          const artwork = conquestArtwork.choices[option.title.replace(/^\[|\]$/g, '')];
          if (option.artwork === undefined && artwork) option.artwork = structuredClone(artwork);
          if (wording[2]) option.outcome = wording[2];
          else delete option.outcome;
        }
      }
      if (node.type === 'result') {
        const wording = story.results[node.id] ?? narrative.commonResults[node.id];
        if (!wording) throw new Error(`결과 문구가 없습니다: ${event.id}/${node.id}`);
        node.data.label = wording[0];
        node.data.text = render(wording[1]);
      }
      if (node.type === 'check') {
        const wording = story.checks?.[node.id] ?? narrative.commonChecks[node.id];
        if (!wording) throw new Error(`능력 판정 안내가 없습니다: ${event.id}/${node.id}`);
        node.data.check = structuredClone(wording);
        node.data.label = `${({battle:'전투',duel:'일기토',strategy:'전략',politics:'정치',relationship:'사람 관계',custom:'복합'})[wording.kind]} 확률 판정`;
      }
    }
  }
  const close = events.find(e => e.id === 'chapter-5-1-closing');
  if (events.some(e => e.id === 'chapter-5-1-service')) {
    const done = close?.flow?.nodes.find(n => n.id === 'record')?.data.options?.find(o => o.id === 'done');
    if (done) done.description = '함께한 사람들을 떠올리고 다음 길을 정하자.';
  }
  return events;
}
