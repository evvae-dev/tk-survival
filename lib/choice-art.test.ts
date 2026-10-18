import { describe, expect, it } from 'vitest';
import { historicalEvents } from './history';
import { choiceArt } from './choice-art';
import { existsSync } from 'node:fs';
import path from 'node:path';
describe('선택지 이미지 연결', () => {
  it('5.1의 모든 선택지에 행동별 이미지를 지정한다', () => {
    const choices = historicalEvents.flatMap(event => event.flow?.nodes.flatMap(node => node.data.options ?? []) ?? []);
    expect(choices).toHaveLength(56);
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
