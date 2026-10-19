import { describe, expect, it } from 'vitest';
import { historicalEvents } from './history';
import { choiceArt } from './choice-art';
import { existsSync } from 'node:fs';
import path from 'node:path';
describe('선택지 이미지 연결', () => {
  it('기존 황건적의 난 선택지의 행동별 이미지를 유지한다', () => {
    const choices = historicalEvents.filter(event => event.year === 184 && event.id !== 'chapter-5-1-service' && event.id !== 'chapter-5-1-yellow-conquest').flatMap(event => event.flow?.nodes.filter(node => node.id !== 'yellow-route').flatMap(node => node.data.options ?? []) ?? []);
    expect(choices).toHaveLength(56);
    for (const choice of choices) {
      const art = choiceArt(choice);
      expect(art, choice.title).not.toBeNull();
      expect(art?.alt).toContain('주인공');
      expect(existsSync(path.join(process.cwd(), 'public', art!.src)), choice.title).toBe(true);
    }
  });
  it('원정 진입과 세 결전·건국의 모든 선택지에 실제 행동 이미지를 연결한다', () => {
    const choices = historicalEvents.flatMap(event => event.flow?.nodes.filter(node => event.id === 'chapter-5-1-yellow-conquest' || node.id === 'yellow-route').flatMap(node => node.data.options ?? []) ?? []);
    expect(choices).toHaveLength(9);
    for (const choice of choices) {
      const art = choiceArt(choice);
      expect(art, choice.title).not.toBeNull();
      expect(art?.alt).toContain('주인공');
      expect(existsSync(path.join(process.cwd(), 'public', art!.src)), choice.title).toBe(true);
    }
  });
  it('관리자 신규 선택지는 관련 없는 이미지를 임의로 지정하지 않는다', () => {
    expect(choiceArt({ title: '[새로운 행동]' })).toBeNull();
  });
});
